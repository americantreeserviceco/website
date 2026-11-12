#!/usr/bin/env python3
"""Validate Jekyll blog posts and the rendered site before a post is published."""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
import tempfile
from html.parser import HTMLParser
from pathlib import Path

DEFAULT_ROOT = Path(__file__).resolve().parent.parent
DRAFT_ARTIFACTS = re.compile(
    r"title options|meta description|table of contents|blog content|"
    r"seo\s*&\s*distribution|target social|primary\s*&\s*secondary keywords|"
    r"lorem ipsum|\bTODO\b|\bFIXME\b|click for the full guide",
    re.IGNORECASE,
)


class ArticleHTMLParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.headings: list[str] = []
        self.descriptions: list[str] = []
        self._in_h1 = False
        self._heading_parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() == "h1":
            self._in_h1 = True
            self._heading_parts = []
        elif tag.lower() == "meta":
            attributes = dict(attrs)
            if attributes.get("name", "").lower() == "description":
                self.descriptions.append(attributes.get("content") or "")

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "h1" and self._in_h1:
            self.headings.append("".join(self._heading_parts))
            self._in_h1 = False

    def handle_data(self, data: str) -> None:
        if self._in_h1:
            self._heading_parts.append(data)


def parse_front_matter(markdown: str) -> tuple[dict[str, str], str]:
    match = re.match(r"\A---\s*\n(.*?)\n---\s*(?:\n|$)", markdown, re.DOTALL)
    if not match:
        return {}, markdown

    fields = {}
    for key in ("title", "date", "description", "permalink"):
        field = re.search(rf"(?m)^{key}:\s*(.*?)\s*$", match.group(1))
        if field:
            fields[key] = field.group(1).strip().strip("\"'")
    return fields, markdown[match.end():]


def validate_post(markdown: str, post_path: Path) -> list[str]:
    errors = []
    fields, body = parse_front_matter(markdown)
    for key in ("title", "date", "description"):
        if not fields.get(key):
            errors.append(f"{post_path}: missing front matter field '{key}'")

    description = fields.get("description", "")
    if description and len(description) > 160:
        errors.append(f"{post_path}: description is {len(description)} characters; maximum is 160")

    if DRAFT_ARTIFACTS.search(body):
        errors.append(f"{post_path}: possible drafting notes or placeholder text in article body")
    if re.search(r"\]\(\s*\)", body):
        errors.append(f"{post_path}: empty Markdown link")

    return errors


def validate_repository(root: Path, candidate: Path | None = None) -> list[str]:
    posts_dir = root / "_posts"
    paths = sorted(posts_dir.glob("*.md"))
    if candidate is not None and candidate.resolve() not in {path.resolve() for path in paths}:
        paths.append(candidate)

    errors = []
    routes: dict[str, Path] = {}
    for path in paths:
        if not path.is_file():
            errors.append(f"{path}: post file does not exist")
            continue
        markdown = path.read_text(encoding="utf-8")
        errors.extend(validate_post(markdown, path))
        fields, _ = parse_front_matter(markdown)
        route = fields.get("permalink")
        if route:
            if route in routes:
                errors.append(f"{path}: duplicate permalink '{route}' also used by {routes[route]}")
            routes[route] = path

    return errors


def validate_rendered_site(root: Path, destination: Path, candidate: Path | None = None) -> list[str]:
    command = [
        "bundle", "exec", "jekyll", "build", "--future",
        "--destination", str(destination),
    ]
    result = subprocess.run(command, cwd=root, text=True, capture_output=True)
    if result.stdout:
        print(result.stdout, end="")
    if result.stderr:
        print(result.stderr, end="", file=sys.stderr)
    if result.returncode:
        return [f"Jekyll build failed with exit code {result.returncode}"]

    paths = sorted((root / "_posts").glob("*.md"))
    if candidate is not None and candidate.resolve() not in {path.resolve() for path in paths}:
        paths.append(candidate)

    errors = []
    rendered = list((destination / "blog").rglob("*.html"))
    rendered_contents = {path: path.read_text(encoding="utf-8") for path in rendered}
    parsed_pages = {}
    for path, html in rendered_contents.items():
        parser = ArticleHTMLParser()
        parser.feed(html)
        parsed_pages[path] = parser

    for post_path in paths:
        fields, _ = parse_front_matter(post_path.read_text(encoding="utf-8"))
        title = fields.get("title", "")
        matches = [
            parser for parser in parsed_pages.values()
            if title in parser.headings
        ]
        if not matches:
            errors.append(f"{post_path}: Jekyll did not render an article heading for '{title}'")
            continue
        if len(matches) > 1:
            errors.append(f"{post_path}: title '{title}' appears in multiple rendered pages")
            continue
        page = matches[0]
        if len(page.headings) != 1:
            errors.append(f"{post_path}: rendered article must contain exactly one h1")
        if not any(description.strip() for description in page.descriptions):
            errors.append(f"{post_path}: rendered article is missing a meta description")

    for post_path in paths:
        markdown = post_path.read_text(encoding="utf-8")
        for target in re.findall(r"\]\((/[^)#]+)", markdown):
            target_path = destination / target.lstrip("/")
            if target.endswith("/"):
                target_path /= "index.html"
            if not target_path.is_file():
                errors.append(f"{post_path}: internal link does not resolve in rendered site: {target}")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=DEFAULT_ROOT, help="Jekyll project root")
    parser.add_argument("--candidate", type=Path, help="Additional generated post to validate")
    args = parser.parse_args()
    root = args.root.resolve()
    candidate = args.candidate.resolve() if args.candidate else None

    errors = validate_repository(root, candidate)
    if not errors:
        with tempfile.TemporaryDirectory(prefix="blog-validation-") as temp_dir:
            errors.extend(validate_rendered_site(root, Path(temp_dir), candidate))

    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1

    posts_dir = root / "_posts"
    post_count = len(list(posts_dir.glob("*.md"))) + (
        1 if candidate and candidate.parent != posts_dir.resolve() else 0
    )
    print(f"Validated {post_count} blog posts and their rendered pages.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
