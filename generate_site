#!/usr/bin/env python3
"""generate_sites.py - builds the AmericanTreeColorado.com static pages in Markdown.

Usage:
    python3 generate_sites.py [output_dir]

Default output_dir is ~/AmericanTree/sites

Output layout (every internal link points at one of these):
    services/index.md                      services hub
    services/<service>/<location>/index.md   6 services x 5 locations = 30 pages
    locations/index.md                     locations hub
    locations/<location>/index.md          5 location pages

Not generated here (you supply these): styles.css and assets/*.png|jpg
"""
import sys
from pathlib import Path

# ---------------------------------------------------------------- settings
ROOT_DIR = Path(__file__).resolve().parent.parent
OUT_DIR = Path(sys.argv[1] if len(sys.argv) > 1 else "~/AmericanTree/sites").expanduser()

PHONE_DISPLAY = "303-456-6898"
PHONE_HREF = "tel:+13034566898"
EMAIL = "info@AmericanTreeColorado.com"
FACEBOOK_URL = "https://facebook.com"
GOOGLE_BUSINESS_URL = "https://google.com"  # TODO: replace with your real Google Business Profile link

# slug -> display name (order = order on the page)
SERVICES = {
    "tree-removal": ("Tree Removal", "Efficiently remove trees from your property."),
    "tree-trimming": ("Tree Trimming & Pruning", "Keep your trees healthy and safe."),
    "el-nino-emergency-storm-service": ("El Nino Emergency Storm Service", "Protect your property from severe weather."),
    "stump-grinding": ("Stump Grinding & Removal", "Remove stumps safely and efficiently."),
    "emergency-tree-service": ("Emergency Tree Service", "Respond quickly to urgent tree issues."),
    "plant-health-care": ("Plant Health Care & Pest Management", "Keep your plants healthy and pest-free."),
}

LOCATIONS = {
    "golden": "Golden",
    "denver": "Denver",
    "boulder": "Boulder",
    "arvada": "Arvada",
    "lakewood": "Lakewood",
}

# Real customer testimonials only.
TESTIMONIALS = {}


# ---------------------------------------------------------------- helpers
def service_url(root, svc, loc):
    return f"{root}services/{svc}/{loc}/index.md"


def location_url(root, loc):
    return f"{root}locations/{loc}/index.md"


def write(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def copy_static_assets(output_dir):
    """Copy the shared CSS/JS assets into the generated site output if they exist."""
    output_dir.mkdir(parents=True, exist_ok=True)
    sources = [ROOT_DIR / "assets" / "styles.css", ROOT_DIR / "assets" / "site.js"]

    for src in sources:
        if not src.exists():
            continue
        if src.name == "styles.css":
            target = output_dir / "styles.css"
        else:
            target = output_dir / "assets" / "site.js"

        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(src.read_bytes())


# ---------------------------------------------------------------- components
def navbar(root):
    return f"""---
navbar:
  logo: "{root}assets/logo.png"
  links:
    - name: "Services"
      url: "{root}services/index.md"
    - name: "Locations"
      url: "{root}locations/index.md"
  cta:
    text: "Call Us Now"
    url: "{PHONE_HREF}"
---"""


def hero(h1, tagline):
    return f"""# {h1}
*{tagline}*

[Get Your Free Quote](#quote) | [Call Us Now]({PHONE_HREF})"""


def trust_bar(root):
    return f"""
### Our Credentials
* **ISA Certified Arborist** (![]({root}assets/isa-cert.png))
* **46 Years Experience**
* **Colorado Applicator License** (![]({root}assets/license.png))
"""


def service_grid(root, loc):
    cards = ["### Our Core Services"]
    for svc, (name, blurb) in SERVICES.items():
        cards.append(f"""#### {name}
![]({root}assets/{svc}-icon.png)
{blurb}
[Learn more about {name} in {LOCATIONS[loc]}]({service_url(root, svc, loc)})""")
    return "\n\n".join(cards)


def service_cross_links(root, svc):
    """Same service in every location."""
    name = SERVICES[svc][0]
    links = ["### Areas Offering This Service"]
    for loc, city in LOCATIONS.items():
        links.append(f"* [{name} in {city}]({service_url(root, svc, loc)})")
    return "\n".join(links)


def location_service_links(root, loc):
    """Every service in one location."""
    links = ["### Services Available in This Location"]
    for svc, (name, _) in SERVICES.items():
        links.append(f"* [{name}]({service_url(root, svc, loc)})")
    return "\n".join(links)


def testimonial(root, loc):
    t = TESTIMONIALS.get(loc)
    if not t:
        return ""
    
    photo_md = ""
    if t.get("photo"):
        photo_md = f"\n\n![]({root}assets/{t['photo']})"
        
    return f"""> {t['quote']}
>
> \- {t['name']}, {LOCATIONS[loc]}, CO{photo_md}"""


def cta_banner():
    return """## Get Your Free Quote Today!
Save 10% on your first service with a free estimate.

[Get Your Free Quote](#quote)"""


def quote_form(default_service=None):
    svc_context = f" (Preferred Service: {SERVICES[default_service][0]})" if default_service else ""
    return f"""## Get Your Free Estimate
<a id="quote"></a>
Please submit your inquiry details below{svc_context}:
* **Name:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
* **Phone:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
* **Message:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_"""


def footer(root, loc=None):
    if loc:
        service_items = "\n".join(
            f"* [{name}]({service_url(root, svc, loc)})"
            for svc, (name, _) in SERVICES.items()
        )
    else:
        service_items = f"* [All Services]({root}services/index.md)"
        
    location_items = "\n".join(
        f"* [{city}]({location_url(root, l)})"
        for l, city in LOCATIONS.items()
    )
    
    return f"""---
### Quick Links

#### Services
{service_items}

#### Locations
{location_items}

#### Contact Info
* Phone: [{PHONE_DISPLAY}]({PHONE_HREF})
* Email: [{EMAIL}](mailto:{EMAIL})
* [Facebook]({FACEBOOK_URL})
* [Google Business Profile]({GOOGLE_BUSINESS_URL})
---"""


def document(title, description, root, main_markdown, footer_loc=None):
    return f"""---
title: "{title}"
description: "{description}"
stylesheet: "{root}styles.css"
---

{navbar(root)}

{main_markdown}

{footer(root, footer_loc)}
"""


def join(*parts):
    return "\n\n".join(p for p in parts if p)


# ---------------------------------------------------------------- pages
def service_page(svc, loc):
    root = "../../../"  # services/<svc>/<loc>/index.md
    name, city = SERVICES[svc][0], LOCATIONS[loc]
    main = join(
        hero(f"{name} in {city}, Colorado", "Local Expertise for Your Tree Needs"),
        trust_bar(root),
        service_grid(root, loc),
        service_cross_links(root, svc),
        testimonial(root, loc),
        cta_banner(),
        quote_form(default_service=svc),
    )
    title = f"{name} in {city}, CO | AmericanTreeColorado"
    desc = (f"{name} in {city}, Colorado. ISA Certified Arborist team with 46 years "
            f"of experience. Free estimates and 10% off your first service.")
    write(OUT_DIR / "services" / svc / loc / "index.md", document(title, desc, root, main, loc))


def location_page(loc):
    root = "../../"  # locations/<loc>/index.md
    city = LOCATIONS[loc]
    main = join(
        hero(f"Tree Service in {city}, Colorado", "Local Expertise for Your Tree Needs"),
        trust_bar(root),
        service_grid(root, loc),
        location_service_links(root, loc),
        testimonial(root, loc),
        cta_banner(),
        quote_form(),
    )
    title = f"Tree Service in {city}, CO | AmericanTreeColorado"
    desc = (f"Tree removal, trimming, stump grinding, emergency and storm service in {city}, "
            f"Colorado. 46 years of experience. Free estimates.")
    write(OUT_DIR / "locations" / loc / "index.md", document(title, desc, root, main, loc))


def services_hub():
    root = "../"
    sections = []
    for svc, (name, blurb) in SERVICES.items():
        links = []
        for loc, city in LOCATIONS.items():
            links.append(f"    * [{name} in {city}]({service_url(root, svc, loc)})")
        links_str = "\n".join(links)
        sections.append(f"## {name}\n{blurb}\n\n{links_str}")
        
    main = "# Our Tree Services\n\n" + "\n\n".join(sections)
    write(OUT_DIR / "services" / "index.md", document(
        "Tree Services | AmericanTreeColorado",
        "Tree removal, trimming, stump grinding, emergency, storm and plant health care services along the Colorado Front Range.",
        root, main))


def locations_hub():
    root = "../"
    items = []
    for loc, city in LOCATIONS.items():
        items.append(f"* [Tree Service in {city}, CO]({location_url(root, loc)})")
    items_str = "\n".join(items)
    
    main = f"# Areas We Serve\n\n{items_str}"
    write(OUT_DIR / "locations" / "index.md", document(
        "Service Areas | AmericanTreeColorado",
        "AmericanTreeColorado serves Golden, Denver, Boulder, Arvada, and Lakewood.",
        root, main))


def main():
    copy_static_assets(OUT_DIR)
    for svc in SERVICES:
        for loc in LOCATIONS:
            service_page(svc, loc)
    for loc in LOCATIONS:
        location_page(loc)
    services_hub()
    locations_hub()
    total = len(SERVICES) * len(LOCATIONS) + len(LOCATIONS) + 2
    print(f"Wrote {total} Markdown pages to {OUT_DIR}")


if __name__ == "__main__":
    main()
