import re
import requests
from bs4 import BeautifulSoup
import mysql.connector
from mysql.connector import Error

# ------------------------------------------------------------------
# MariaDB Database Configuration
# Update these credentials to match your database environment
# ------------------------------------------------------------------
DB_CONFIG = {
    "host": "localhost",
    "user": "uselesse",
    "password": "ericvbrooks",  # Replace with actual user password
    "database": "arborist",
    "port": 3306
}

# Target URLs to scrape (Replace or expand with actual target pages)
TARGET_URLS = [
    "https://www.5280tree.com",
    "https://www.savatree.com",
    "https://www.k2treeservice.com",
    "https://www.arborscapeservices.com"
]

HTTP_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}

# ------------------------------------------------------------------
# 1. Keyword Parser Function
# ------------------------------------------------------------------
def parse_arborist_flags(raw_text):
    """
    Parses raw text descriptions and evaluates regex patterns to set
    boolean service flags (1 or 0) for database insertion.
    """
    if not raw_text:
        return {
            "offer_tree_removal": 0,
            "offer_stump_grinding": 0,
            "offer_emergency_response": 0,
            "offer_winter_fertilization": 0,
            "offer_tree_health": 0,
            "offer_trimming_prunning": 0,
        }

    text = raw_text.lower()

    patterns = {
        "offer_tree_removal": r"\b(tree removal|hazardous removal|tree felling|take down|removing trees)\b",
        "offer_stump_grinding": r"\b(stump grinding|stump removal|stump root|stump digging)\b",
        "offer_emergency_response": r"\b(24/7|24-hour|emergency|storm damage|storm response|disaster cleanup)\b",
        "offer_winter_fertilization": r"\b(winter fertilization|deep root feeding|dormant feeding|soil injection|winter feeding)\b",
        "offer_tree_health": r"\b(plant health|tree health|isa certified|arborist evaluation|disease management|insect control|pest treatment|diagnosis)\b",
        "offer_trimming_prunning": r"\b(trimming|pruning|tree pruning|crown reduction|deadwooding|branch trimming|shrub care)\b",
    }

    flags = {}
    for flag_name, pattern in patterns.items():
        flags[flag_name] = 1 if re.search(pattern, text) else 0

    return flags


# ------------------------------------------------------------------
# 2. Extract Phone Number and Company Name
# ------------------------------------------------------------------
def extract_contact_info(soup, url):
    """Extracts company name and phone number using defensive checks."""
    # Attempt to extract title/company name
    title_el = soup.find("title")
    company_name = title_el.get_text(strip=True) if title_el else url.split("//")[-1].split("/")[0]
    
    # Clean company name
    company_name = company_name.split("|")[0].split("-")[0].strip()

    # Extract phone number using regex
    text_content = soup.get_text()
    phone_match = re.search(r"\(?\b[0-9]{3}\)?[-. ]?[0-9]{3}[-. ]?[0-9]{4}\b", text_content)
    phone = phone_match.group(0) if phone_match else None

    return company_name, phone


# ------------------------------------------------------------------
# 3. Web Scraper Task
# ------------------------------------------------------------------
def scrape_arborist_site(url):
    """Fetches web page, parses content, and extracts service data."""
    print(f"Scraping: {url}...")
    try:
        response = requests.get(url, headers=HTTP_HEADERS, timeout=10)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"[-] Error fetching {url}: {e}")
        return None

    soup = BeautifulSoup(response.content, "html.parser")

    # Remove script and style elements for clean text extraction
    for element in soup(["script", "style", "noscript", "header", "footer", "nav"]):
        element.decompose()

    raw_description = soup.get_text(separator=" ", strip=True)
    company_name, phone = extract_contact_info(soup, url)
    flags = parse_arborist_flags(raw_description)

    return {
        "company_name": company_name,
        "phone": phone,
        "url": url,
        "raw_description": raw_description[:2000],  # Truncate to reasonable length
        **flags
    }


# ------------------------------------------------------------------
# 4. Direct MariaDB Ingestion
# ------------------------------------------------------------------
def save_to_mariadb(records):
    """Inserts or updates scraped records in MariaDB using ON DUPLICATE KEY UPDATE."""
    if not records:
        print("No valid records to save.")
        return

    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()

        query = """
            INSERT INTO `arborist` (
                `company_name`, `phone`, `url`,
                `offer_tree_removal`, `offer_stump_grinding`, `offer_emergency_response`,
                `offer_winter_fertilization`, `offer_tree_health`, `offer_trimming_prunning`,
                `raw_description`
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                `phone` = VALUES(`phone`),
                `url` = VALUES(`url`),
                `offer_tree_removal` = VALUES(`offer_tree_removal`),
                `offer_stump_grinding` = VALUES(`offer_stump_grinding`),
                `offer_emergency_response` = VALUES(`offer_emergency_response`),
                `offer_winter_fertilization` = VALUES(`offer_winter_fertilization`),
                `offer_tree_health` = VALUES(`offer_tree_health`),
                `offer_trimming_prunning` = VALUES(`offer_trimming_prunning`),
                `raw_description` = VALUES(`raw_description`);
        """

        data_tuples = [
            (
                r["company_name"],
                r["phone"],
                r["url"],
                r["offer_tree_removal"],
                r["offer_stump_grinding"],
                r["offer_emergency_response"],
                r["offer_winter_fertilization"],
                r["offer_tree_health"],
                r["offer_trimming_prunning"],
                r["raw_description"],
            )
            for r in records
        ]

        cursor.executemany(query, data_tuples)
        conn.commit()
        print(f"[+] Successfully upserted {cursor.rowcount} record(s) into MariaDB.")

    except Error as e:
        print(f"[-] Database Error: {e}")
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()


# ------------------------------------------------------------------
# Execution Entry Point
# ------------------------------------------------------------------
if __name__ == "__main__":
    scraped_data = []

    for site in TARGET_URLS:
        result = scrape_arborist_site(site)
        if result:
            scraped_data.append(result)

    # Ingest scraped payloads into MariaDB
    save_to_mariadb(scraped_data)