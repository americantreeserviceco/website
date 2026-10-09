#!/usr/bin/env python3
"""Generate the blog index from the _posts markdown files."""

from __future__ import annotations

import re
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
POSTS_DIR = ROOT / "_posts"
BLOG_DIR = ROOT / "blog"
SITE_TITLE = "American Tree Colorado Blog"


def parse_post_title(raw_text: str) -> str:
    front_matter = re.match(r"\A---\s*\n(.*?)\n---\s*(?:\n|$)", raw_text, re.DOTALL)
    if front_matter:
        title_match = re.search(r"(?m)^title:\s*(.*?)\s*$", front_matter.group(1))
        if title_match:
            return title_match.group(1).strip().strip("\"'")
        raw_text = raw_text[front_matter.end():]

    first_heading = raw_text.strip().splitlines()[0].strip()
    if first_heading.startswith("# "):
        return first_heading[2:].strip()
    cleaned = re.sub(r"\*\*|__", "", first_heading)
    return cleaned.strip()


def slug_from_filename(filename: str) -> str:
    stem = Path(filename).stem
    parts = stem.split("-")
    if len(parts) >= 3 and parts[0].isdigit():
        return "-".join(parts[3:]) if len(parts) > 3 else "-".join(parts[3:])
    return stem


def page_template(title: str, body: str, current_page: str = "") -> str:
    seasonal_styles = ""
    if current_page == "blog":
        seasonal_styles = """
    .seasonal-promo { display: block; margin: 2rem auto; }
    .seasonal-promo img { display: block; width: 100%; height: auto; border-radius: 18px; box-shadow: 0 20px 40px rgba(20, 31, 20, 0.18); }"""
    return f"""<!DOCTYPE html>
<html lang=\"en\">
<head>
  <meta charset=\"UTF-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
  <title>{escape(title)} | American Tree Colorado</title>
  <meta name=\"description\" content=\"American Tree Colorado blog and tree care insights.\" />
  <style>
    :root {{
      --forest: #1d4d2a;
      --forest-dark: #14351f;
      --green: #2d7d46;
      --green-soft: #edf8ee;
      --sand: #f8f7f1;
      --text: #243126;
      --muted: #5d685f;
      --white: #ffffff;
      --shadow: 0 18px 40px rgba(19, 53, 31, 0.12);
    }}
    * {{ box-sizing: border-box; }}
    body {{ margin: 0; font-family: Arial, Helvetica, sans-serif; background: var(--sand); color: var(--text); line-height: 1.6; }}
    a {{ color: var(--forest); text-decoration: none; }}
    a:hover {{ text-decoration: underline; }}
    .topbar {{ background: rgba(255,255,255,0.96); border-bottom: 1px solid rgba(29,77,42,0.12); position: sticky; top: 0; z-index: 10; }}
    .container {{ max-width: 1100px; margin: 0 auto; padding: 0 1.25rem; }}
    .nav {{ display: flex; align-items: center; justify-content: space-between; gap: 1.25rem; padding: 1rem 0; flex-wrap: wrap; }}
    .brand {{ display: flex; align-items: center; }}
    .brand img {{ display: block; height: 56px; width: auto; }}
    .nav-links {{ display: flex; gap: 1.1rem; flex-wrap: wrap; align-items: center; }}
    .nav-links a {{ font-weight: 700; color: var(--forest-dark); }}
    .header-cta {{ display: inline-block; padding: 0.75rem 1.1rem; background: var(--green); color: white; border-radius: 999px; font-weight: 700; }}
    .page {{ padding: 3rem 0 5rem; }}
    .card {{ background: var(--white); border-radius: 18px; box-shadow: var(--shadow); padding: 2rem; border: 1px solid rgba(29,77,42,0.08); }}
    .post-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem; margin-top: 2rem; }}
    .post-card {{ background: var(--green-soft); border: 1px solid rgba(29,77,42,0.08); border-radius: 16px; padding: 1.4rem; }}
    .post-card h3 {{ margin-top: 0; }}{seasonal_styles}
    .muted {{ color: var(--muted); }}
    ul {{ padding-left: 1.2rem; }}
    blockquote {{ margin: 1.5rem 0; padding-left: 1rem; border-left: 4px solid var(--green); color: var(--muted); }}
    .article-body h2, .article-body h3 {{ color: var(--forest-dark); }}
    .article-body p, .article-body li {{ color: var(--text); }}
    footer {{ background: var(--forest-dark); color: rgba(255,255,255,0.8); padding: 2rem 0; }}
    .footer-inner {{ display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }}
    .footer-links {{ display: flex; gap: 1rem; flex-wrap: wrap; }}
    @media (max-width: 640px) {{ .nav {{ justify-content: center; }} .nav-links {{ justify-content: center; }} .header-cta {{ width: 100%; text-align: center; }} }}
  </style>
  <link rel="stylesheet" href="/assets/css/halloween-theme.css">
  <script src="/assets/js/halloween-theme.js" defer></script>
</head>
<body>
  <header class=\"topbar\">
    <div class=\"container nav\">
      <a class=\"brand\" href=\"../index.html\"><img src=\"../assets/images/optimized/AmericanTree_Logo_RGB.webp\" alt=\"American Tree Colorado\"></a>
      <nav class=\"nav-links\" aria-label=\"Main navigation\">
        <a href=\"../index.html\">Home</a>
        <a href=\"../about/index.html\">About</a>
        <a href=\"../services/index.html\">Services</a>
        <a href=\"../locations/index.html\">Locations</a>
        <a href=\"./index.html\">Blog</a>
        <a href=\"../contact/index.html\">Contact</a>
      </nav>
      <a class=\"header-cta\" href=\"../contact/index.html\">Request a Quote</a>
    </div>
  </header>

  <main class=\"page\">
    <div class=\"container\">
      <div class=\"card\">
        {body}
      </div>
    </div>
  </main>

  <footer>
    <div class=\"container footer-inner\">
      <div>
        <strong>American Tree Colorado</strong><br />
        <span>Tree care and landscaping for Colorado homes and businesses.</span>
      </div>
      <div class=\"footer-links\">
        <a href=\"../index.html\">Home</a>
        <a href=\"../services/index.html\">Services</a>
        <a href=\"../contact/index.html\">Contact</a>
      </div>
    </div>
  </footer>
</body>
</html>
"""


def markdown_to_html(markdown: str) -> str:
    cleaned = re.sub(r"\A---\s*\n.*?\n---\s*(?:\n|$)", "", markdown, flags=re.DOTALL)
    lines = cleaned.splitlines()
    html_lines: list[str] = []
    paragraph: list[str] = []
    list_items: list[str] = []

    def flush_paragraph() -> None:
        nonlocal paragraph
        if paragraph:
            text = " ".join(part.strip() for part in paragraph if part.strip())
            if text:
                html_lines.append(f"<p>{render_inline(text)}</p>")
            paragraph = []

    def flush_list() -> None:
        nonlocal list_items
        if list_items:
            html_lines.append("<ul>" + "".join(f"<li>{render_inline(item)}</li>" for item in list_items) + "</ul>")
            list_items = []

    def render_inline(text: str) -> str:
        value = escape(text)
        value = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", value)
        value = re.sub(r"\*(.+?)\*", r"<em>\1</em>", value)
        return value

    for line in lines:
        stripped = line.strip()
        if not stripped:
            flush_paragraph()
            flush_list()
            continue

        heading = re.match(r"^(#{1,6})\s+(.+)$", stripped)
        if heading:
            flush_paragraph()
            flush_list()
            heading_level = min(max(len(heading.group(1)), 2), 6)
            html_lines.append(f"<h{heading_level}>{render_inline(heading.group(2))}</h{heading_level}>")
        elif stripped.startswith("**") and stripped.endswith("**"):
            flush_paragraph()
            flush_list()
            html_lines.append(f"<h2>{render_inline(stripped[2:-2])}</h2>")
        elif stripped.startswith("* ") or stripped.startswith("- "):
            flush_paragraph()
            list_items.append(stripped[2:].strip())
        elif stripped.startswith(">"):
            flush_paragraph()
            flush_list()
            html_lines.append(f"<blockquote>{render_inline(stripped[1:].strip())}</blockquote>")
        else:
            flush_list()
            paragraph.append(stripped)

    flush_paragraph()
    flush_list()
    return "\n".join(html_lines)


def build_blog_pages() -> None:
    posts = []
    for path in sorted(POSTS_DIR.glob("*.md")):
        raw = path.read_text(encoding="utf-8")
        title = parse_post_title(raw)
        slug = slug_from_filename(path.name)
        url = f"{slug}.html"
        posts.append({"title": title, "url": url, "slug": slug, "path": path})

    BLOG_DIR.mkdir(parents=True, exist_ok=True)

    for post in posts:
        article_html = markdown_to_html(post["path"].read_text(encoding="utf-8"))
        article_page = page_template(post["title"], f"<h1>{escape(post['title'])}</h1><div class=\"article-body\">{article_html}</div>")
        (BLOG_DIR / post["url"]).write_text(article_page, encoding="utf-8")

    index_items = []
    for post in posts:
        index_items.append(
            f"<article class=\"post-card\"><h3><a href=\"{post['url']}\">{escape(post['title'])}</a></h3><p class=\"muted\">Read the latest tree care advice and seasonal tips.</p><a href=\"{post['url']}\">Read article →</a></article>"
        )
    index_items.append(
        '<article class="post-card"><h3><a href="super_el_nino_colorado.html">What a Super El Niño Means for Colorado</a></h3><p class="muted">What Colorado climate research says about precipitation, snowpack, and winter weather odds.</p><a href="super_el_nino_colorado.html">Read article →</a></article>'
    )

    index_html = page_template(
        SITE_TITLE,
        f"""
        <h1>{SITE_TITLE}</h1>
        <p class=\"muted\">Helpful tree care articles, seasonal maintenance tips, and practical advice for Colorado properties.</p>
        <a class=\"seasonal-promo\" href=\"../contact/index.html\" aria-label=\"Request a quote for seasonal tree health services\"><img src=\"../assets/images/seasonal/american-tree-health-update.png\" alt=\"Colorado tree health update sale notice\"></a>
        <div class=\"post-grid\">{''.join(index_items)}</div>
        """,
        current_page="blog",
    )
    (BLOG_DIR / "index.html").write_text(index_html, encoding="utf-8")
    (ROOT / "journal-index.html").write_text(
        f"---\npermalink: /blog/\n---\n{index_html}",
        encoding="utf-8",
    )


if __name__ == "__main__":
    build_blog_pages()
    print(f"Generated blog pages for {len(list(POSTS_DIR.glob('*.md')))} posts in {BLOG_DIR}.")
