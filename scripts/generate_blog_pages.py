#!/usr/bin/env python3
"""Generate the blog index from the _posts markdown files."""

from __future__ import annotations

import re
from datetime import date
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
POSTS_DIR = ROOT / "_posts"
BLOG_DIR = ROOT / "blog"
SITE_TITLE = "American Tree Colorado Blog"
LIQUID_POST_GRID = (
    "{% for post in site.posts %}"
    "<article class=\"post-card\"><div class=\"post-card-inner\">"
    "<div class=\"post-card-face post-card-front\"><p class=\"post-card-kicker\">Tree care guide</p>"
    "<h2>{{ post.title | escape }}</h2>"
    "<p class=\"muted\">{{ post.description | default: 'Practical tree care advice for Colorado properties.' | escape }}</p>"
    "<button class=\"flip-card-button\" type=\"button\" aria-pressed=\"false\">Flip to preview</button></div>"
    "<div class=\"post-card-face post-card-back\"><p class=\"post-card-kicker\">Article preview</p>"
    "<p class=\"post-preview\">{{ post.excerpt | strip_html | normalize_whitespace | truncate: 260 | escape }}</p>"
    "<div class=\"post-card-actions\"><button class=\"flip-card-button\" type=\"button\" aria-pressed=\"true\">Back to details</button>"
    "<a class=\"read-article-link\" href=\"{{ post.url }}\">Read article <span aria-hidden=\"true\">→</span></a></div>"
    "</div></div></article>"
    "{% endfor %}"
)


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


def parse_post_field(raw_text: str, field: str) -> str:
    front_matter = re.match(r"\A---\s*\n(.*?)\n---\s*(?:\n|$)", raw_text, re.DOTALL)
    if not front_matter:
        return ""
    match = re.search(rf"(?m)^{re.escape(field)}:\s*(.*?)\s*$", front_matter.group(1))
    return match.group(1).strip().strip("\"'") if match else ""


def post_preview(raw_text: str) -> str:
    body = re.sub(r"\A---\s*\n.*?\n---\s*(?:\n|$)", "", raw_text, flags=re.DOTALL)
    for paragraph in re.split(r"\n\s*\n", body):
        paragraph = paragraph.strip()
        if not paragraph or paragraph.startswith(("#", "<")):
            continue
        paragraph = re.sub(r"!\[([^\]]*)\]\([^)]*\)", r"\1", paragraph)
        paragraph = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", paragraph)
        paragraph = re.sub(r"[*_`>#]", "", paragraph)
        return re.sub(r"\s+", " ", paragraph)
    return "Open this guide for practical tree care advice and recommendations."


def slug_from_filename(filename: str) -> str:
    stem = Path(filename).stem
    parts = stem.split("-")
    if len(parts) >= 3 and parts[0].isdigit():
        return "-".join(parts[3:]) if len(parts) > 3 else "-".join(parts[3:])
    return stem


def page_template(title: str, body: str, current_page: str = "") -> str:
    seasonal_styles = ""
    flip_card_script = ""
    if current_page == "blog":
        seasonal_styles = """
    .seasonal-promo { display: block; margin: 2rem auto; }
    .seasonal-promo img { display: block; width: 100%; height: auto; border-radius: 18px; box-shadow: 0 20px 40px rgba(20, 31, 20, 0.18); }
    .post-grid { align-items: stretch; }
    .post-card { min-height: 285px; padding: 0; background: transparent; border: 0; perspective: 1100px; }
    .post-card-inner { position: relative; min-height: 285px; height: 100%; transform-style: preserve-3d; transition: transform 650ms cubic-bezier(.2,.75,.25,1); }
    .post-card.is-flipped .post-card-inner { transform: rotateY(180deg); }
    .post-card:focus-within { outline: 3px solid rgba(45,125,70,.3); outline-offset: 5px; border-radius: 18px; }
    .post-card-face { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: flex-start; padding: 1.4rem; overflow: auto; border: 1px solid rgba(45,125,70,.22); border-radius: 18px; background: linear-gradient(145deg,#fff 5%,#f0f8ef 100%); box-shadow: 0 12px 28px rgba(20,53,31,.1); backface-visibility: hidden; -webkit-backface-visibility: hidden; }
    .post-card:hover .post-card-face, .post-card:focus-within .post-card-face { box-shadow: 0 14px 34px rgba(45,125,70,.2), 0 0 22px rgba(104,190,115,.32); }
    .post-card-back { transform: rotateY(180deg); background: linear-gradient(145deg,#14351f,#1d4d2a); color: #fff; border-color: rgba(130,210,145,.65); }
    .post-card h2 { margin: .25rem 0 .65rem; color: var(--forest-dark); font-size: 1.2rem; line-height: 1.35; }
    .post-card-kicker { margin: 0; color: var(--green); font-size: .75rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
    .post-card-back .post-card-kicker, .post-card-back .post-preview { color: rgba(255,255,255,.92); }
    .post-preview { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 5; margin: .75rem 0 1rem; }
    .flip-card-button { margin-top: auto; padding: .5rem .75rem; color: var(--forest-dark); background: #e5f3e5; border: 1px solid rgba(45,125,70,.3); border-radius: 999px; font: inherit; font-size: .85rem; font-weight: 700; cursor: pointer; }
    .post-card-back .flip-card-button { color: #fff; background: rgba(255,255,255,.12); border-color: rgba(255,255,255,.4); }
    .post-card-actions { display: flex; align-items: center; justify-content: space-between; gap: .75rem; width: 100%; margin-top: auto; }
    .post-card-actions .flip-card-button { margin-top: 0; }
    .read-article-link { color: #fff; font-weight: 800; }
    .post-card button:focus-visible, .post-card a:focus-visible { outline: 3px solid #e8c66a; outline-offset: 3px; }
    @media (prefers-reduced-motion: reduce) { .post-card-inner { transition: none; } }
    @media (max-width: 640px) { .post-card, .post-card-inner { min-height: 310px; } }"""
        flip_card_script = """
  <script>
    function setCardFace(card, flipped) {
      card.classList.toggle('is-flipped', flipped);
      card.querySelectorAll('.flip-card-button').forEach((control) => {
        control.setAttribute('aria-pressed', String(flipped));
      });
      card.querySelectorAll('.post-card-face').forEach((face) => {
        const isBack = face.classList.contains('post-card-back');
        const visible = isBack === flipped;
        face.setAttribute('aria-hidden', String(!visible));
        face.inert = !visible;
      });
    }

    document.querySelectorAll('.post-card').forEach((card) => setCardFace(card, false));
    document.addEventListener('click', function (event) {
      const button = event.target.closest('.flip-card-button');
      if (!button) return;
      const card = button.closest('.post-card');
      if (!card) return;
      const flipped = !card.classList.contains('is-flipped');
      setCardFace(card, flipped);
      card.querySelector(flipped ? '.post-card-back .flip-card-button' : '.post-card-front .flip-card-button').focus();
    });
  </script>"""
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
    .nav {{ display: flex; align-items: center; justify-content: space-between; gap: 1.25rem; padding: 1rem 1.25rem; flex-wrap: wrap; }}
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
  <link rel="stylesheet" href="/assets/css/november-theme.css">
  <script src="/assets/js/halloween-theme.js" defer></script>
  <script src="/assets/js/november-theme.js" defer></script>
  <script src="/assets/js/severe-alerts.js" defer></script>
</head>
<body>
  <header class=\"topbar\">
    <div class=\"container nav\">
      <a class=\"brand\" href=\"../index.html\"><img src=\"../assets/images/optimized/AmericanTree_Logo_RGB-gbp.webp\" alt=\"American Tree Colorado\"></a>
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
{flip_card_script}
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
        if path.name[:10] > date.today().isoformat():
            continue  # scheduled post: Jekyll publishes it on its date
        raw = path.read_text(encoding="utf-8")
        title = parse_post_title(raw)
        slug = slug_from_filename(path.name)
        url = parse_post_field(raw, "permalink").strip("/")
        if not url:
            url = f"blog/{slug}.html"
        else:
            url = url.removeprefix("blog/")
            url = url.removesuffix("/")
            if not url.endswith(".html"):
                url += "/index.html"
        posts.append(
            {
                "title": title,
                "url": url.removeprefix("blog/"),
                "slug": slug,
                "path": path,
                "description": parse_post_field(raw, "description")
                or "Practical tree care advice for Colorado properties.",
                "preview": post_preview(raw),
            }
        )

    BLOG_DIR.mkdir(parents=True, exist_ok=True)

    for post in posts:
        article_html = markdown_to_html(post["path"].read_text(encoding="utf-8"))
        article_page = page_template(post["title"], f"<h1>{escape(post['title'])}</h1><div class=\"article-body\">{article_html}</div>")
        (BLOG_DIR / post["url"]).write_text(article_page, encoding="utf-8")

    index_items = []
    for post in posts:
        index_items.append(
            f"<article class=\"post-card\"><div class=\"post-card-inner\">"
            f"<div class=\"post-card-face post-card-front\"><p class=\"post-card-kicker\">Tree care guide</p>"
            f"<h2>{escape(post['title'])}</h2><p class=\"muted\">{escape(post['description'])}</p>"
            f"<button class=\"flip-card-button\" type=\"button\" aria-pressed=\"false\">Flip to preview</button></div>"
            f"<div class=\"post-card-face post-card-back\"><p class=\"post-card-kicker\">Article preview</p>"
            f"<p class=\"post-preview\">{escape(post['preview'][:260])}</p>"
            f"<div class=\"post-card-actions\"><button class=\"flip-card-button\" type=\"button\" aria-pressed=\"true\">Back to details</button>"
            f"<a class=\"read-article-link\" href=\"{escape(post['url'])}\">Read article <span aria-hidden=\"true\">→</span></a>"
            f"</div></div></div></article>"
        )
    index_items.append(
        '<article class="post-card"><div class="post-card-inner">'
        '<div class="post-card-face post-card-front"><p class="post-card-kicker">Tree care guide</p>'
        '<h2>What a Super El Niño Means for Colorado</h2>'
        '<p class="muted">What Colorado climate research says about precipitation, snowpack, and winter weather odds.</p>'
        '<button class="flip-card-button" type="button" aria-pressed="false">Flip to preview</button></div>'
        '<div class="post-card-face post-card-back"><p class="post-card-kicker">Article preview</p>'
        '<p class="post-preview">Learn what Colorado Climate Center research says about El Niño, precipitation, snowpack, and Colorado’s possible winter weather.</p>'
        '<div class="post-card-actions"><button class="flip-card-button" type="button" aria-pressed="true">Back to details</button>'
        '<a class="read-article-link" href="super_el_nino_colorado.html">Read article <span aria-hidden="true">→</span></a>'
        '</div></div></div></article>'
    )

    def index_page(grid: str) -> str:
        return page_template(
            SITE_TITLE,
            f"""
        <h1>{SITE_TITLE}</h1>
        <p class=\"muted\">Helpful tree care articles, seasonal maintenance tips, and practical advice for Colorado properties.</p>
        <a class=\"seasonal-promo\" href=\"../contact/index.html\" aria-label=\"Request a quote for seasonal tree health services\"><img src=\"../assets/images/seasonal/american-tree-health-update.png\" alt=\"Colorado tree health update sale notice\"></a>
        <div class=\"post-grid\">{grid}</div>
        """,
            current_page="blog",
        )

    (BLOG_DIR / "index.html").write_text(index_page(''.join(index_items)), encoding="utf-8")
    # The live /blog/ index is rendered by Jekyll from site.posts, which leaves out future-dated
    # posts, so scheduled posts appear on the index the day they publish.
    (ROOT / "journal-index.html").write_text(
        f"---\npermalink: /blog/\n---\n{index_page(LIQUID_POST_GRID)}",
        encoding="utf-8",
    )


if __name__ == "__main__":
    build_blog_pages()
    print(f"Generated blog pages for {len(list(POSTS_DIR.glob('*.md')))} posts in {BLOG_DIR}.")
