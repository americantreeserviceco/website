import json
import os
import re
import subprocess
import sys
from datetime import datetime

try:
    import ollama
except ImportError:
    ollama = None

### ==========================================

### CONFIGURATION

### ==========================================

### 1. Defaults to this website repository; override when publishing elsewhere
JEKYLL_REPO_PATH = os.environ.get(
    "JEKYLL_REPO_PATH",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..")),
)

### 2. Set GIT_BRANCH when your deployment branch is not 'main'
GIT_BRANCH = os.environ.get("GIT_BRANCH", "main")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "blog-expert")

### ==========================================


def run_git_command(commands, working_dir):
    """Safely runs terminal Git commands in the repository directory."""
    try:
        result = subprocess.run(
            commands,
            cwd=working_dir,
            check=True,
            text=True,
            capture_output=True,
        )
        print(result.stdout.strip())
    except subprocess.CalledProcessError as exc:
        error_output = exc.stderr.strip() or exc.stdout.strip() or str(exc)
        print(f"❌ Git Command Error: {error_output}")
        raise


def make_description(markdown):
    """Create bounded metadata text from the first prose paragraph."""
    for paragraph in re.split(r"\n\s*\n", markdown):
        paragraph = paragraph.strip()
        if not paragraph or re.match(r"^#{1,6}\s+", paragraph):
            continue
        text = paragraph
        text = re.sub(r"^\s*(?:[-*+]|\d+\.)\s+", "", text)
        text = re.sub(r"!\[([^\]]*)\]\([^)]*\)", r"\1", text)
        text = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", text)
        text = re.sub(r"[`*_>#]", "", text)
        text = re.sub(r"\s+", " ", text).strip()
        if text:
            if len(text) > 160:
                shortened = text[:157].rsplit(" ", 1)[0].rstrip(" ,;:")
                return f"{shortened}..."
            return text
    return ""


def validate_post(post_path):
    """Run source and rendered-site checks before allowing the post to publish."""
    validator = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "..",
        "scripts",
        "validate_blog_posts.py",
    )
    subprocess.run(
        [
            sys.executable,
            validator,
            "--root",
            JEKYLL_REPO_PATH,
            "--candidate",
            post_path,
        ],
        cwd=JEKYLL_REPO_PATH,
        check=True,
    )


def create_and_push_blog_post(topic_prompt):
    """Generate a blog post via Ollama and push it to the local Jekyll repo."""
    if not topic_prompt.strip():
        print("❌ Please provide a topic before generating a blog post.")
        return

    if not os.path.isdir(JEKYLL_REPO_PATH):
        print(
            f"❌ Jekyll repository directory does not exist: {JEKYLL_REPO_PATH}"
        )
        return

    if ollama is None:
        print(
            "⚠️ Dependency missing: install the 'ollama' package with "
            "`python -m pip install ollama` before running this script."
        )
        return

    print(
        f"🤖 Step 1: Generating blog post via Ollama ('{OLLAMA_MODEL}') for: '{topic_prompt}'..."
    )

    try:
        response = ollama.generate(
            model=OLLAMA_MODEL,
            prompt=(
                f"Write a useful, accurate blog post about: {topic_prompt}\n"
                "Return only the article body in Markdown. Do not include YAML front matter, "
                "title options, a meta description, table of contents, SEO notes, or social posts. "
                "Start with an introductory paragraph; use level-two headings for sections. "
                "Avoid unsupported guarantees and unsafe do-it-yourself tree-work instructions."
            ),
        )
    except Exception as exc:
        print(f"❌ Failed to reach Ollama. Is the server running? Error: {exc}")
        return

    response_text = (
        response.get("response", "")
        if isinstance(response, dict)
        else getattr(response, "response", "")
    )
    post_content = response_text.strip() if isinstance(response_text, str) else ""
    if not post_content:
        print("❌ Ollama returned an empty result. Nothing was saved.")
        return

    # Add front matter so Jekyll will render the markdown file correctly
    today_date = datetime.now().strftime("%Y-%m-%d")
    title = topic_prompt.strip()

    # Create an automated URL-safe slug from the prompt
    slug = topic_prompt.lower()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)  # Remove non-alphanumeric chars
    slug = re.sub(r"[\s-]+", "-", slug).strip("-")  # Convert multiple spaces/hyphens to a single dash
    slug = slug[:50].strip("-")  # Hard character limit for URL friendliness
    if not slug:
        print("❌ The topic must contain letters or numbers to create a post URL.")
        return

    filename = f"{today_date}-{slug}.md"
    posts_dir = os.path.join(JEKYLL_REPO_PATH, "_posts")

    # Ensure local directory exists
    os.makedirs(posts_dir, exist_ok=True)

    full_path = os.path.join(posts_dir, filename)
    if os.path.exists(full_path):
        print(f"❌ Refusing to overwrite an existing post: {full_path}")
        return

    description = make_description(post_content)
    if not description:
        print("❌ Could not create a description from the generated article. Nothing was saved.")
        return

    jekyll_post = f"""---
title: {json.dumps(title, ensure_ascii=False)}
date: {today_date}
description: {json.dumps(description, ensure_ascii=False)}
---

{post_content}
"""

    # Save the file into your local Jekyll project workspace
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(jekyll_post)
    print(f"📝 Step 2: Post successfully generated and written to local file: {filename}")

    try:
        print("🔎 Validating all blog posts and building the rendered site before publishing...")
        validate_post(full_path)
    except (OSError, subprocess.CalledProcessError) as exc:
        print(
            f"\n❌ Blog validation failed; the post was not staged or published: {exc}. "
            f"Review the draft at {full_path}."
        )
        return

    # Run the Git upload pipeline
    print("🚀 Step 3: Pushing new content live to GitHub Pages...")
    try:
        # Add only the new post to avoid accidentally committing unrelated edits
        relative_path = os.path.relpath(full_path, JEKYLL_REPO_PATH)
        run_git_command(["git", "add", "--", relative_path], JEKYLL_REPO_PATH)

        # Commit with an automated timestamp message
        commit_message = f"Auto-publish post via local Ollama: {topic_prompt[:40]}"
        run_git_command(
            ["git", "commit", "--only", "-m", commit_message, "--", relative_path],
            JEKYLL_REPO_PATH,
        )

        # Push to remote GitHub repository
        run_git_command(["git", "push", "origin", GIT_BRANCH], JEKYLL_REPO_PATH)

        print("\n🎉 SUCCESS! Your local AI generated text is now queued on GitHub.")
        print(
            "🌍 Give GitHub Actions about 30–60 seconds to re-render, and your post will be live on your website!"
        )
    except (OSError, subprocess.CalledProcessError) as exc:
        print(
            f"\n❌ Automation stopped during the Git deployment step: {exc}. "
            f"The post remains in {posts_dir}."
        )


if __name__ == "__main__":
    # 🎯 Change this string whenever you want to generate a new post!
    blog_topic = sys.argv[1] if len(sys.argv) > 1 else (
        "Why static site generators like Jekyll remain king in 2026"
    )
    create_and_push_blog_post(blog_topic)
