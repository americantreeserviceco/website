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

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
JEKYLL_REPO_PATH = PROJECT_ROOT
GIT_BRANCH = os.environ.get("GIT_BRANCH", "dev")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "blog-writer:latest")

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
        if result.stdout.strip():
            print(result.stdout.strip())
    except subprocess.CalledProcessError as exc:
        error_output = exc.stderr.strip() or exc.stdout.strip() or str(exc)
        print(f"❌ Git Command Error: {error_output}")
        raise


def create_and_push_blog_post(topic_prompt):
    """Generate a post with Ollama and publish it to the local Jekyll repo."""
    if not os.path.isdir(JEKYLL_REPO_PATH):
        print(
            "⚠️ Action Required: Set JEKYLL_REPO_PATH to your actual local GitHub Pages folder."
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
            prompt=f"Write a comprehensive blog post about: {topic_prompt}",
        )
    except Exception as exc:
        print(f"❌ Failed to reach Ollama. Is the server running? Error: {exc}")
        return

    post_content = response.get("response", "").strip()
    if not post_content:
        print("❌ Ollama returned an empty result. Nothing was saved.")
        return

    today_date = datetime.now().strftime("%Y-%m-%d")

    slug = topic_prompt.lower()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"[\s-]+", "-", slug).strip("-")
    slug = slug[:50]

    filename = f"{today_date}-{slug}.md"
    posts_dir = os.path.join(JEKYLL_REPO_PATH, "_posts")

    if not os.path.exists(posts_dir):
        os.makedirs(posts_dir)

    full_path = os.path.join(posts_dir, filename)

    with open(full_path, "w", encoding="utf-8") as handle:
        handle.write(post_content)
    print(f"📝 Step 2: Post successfully generated and written to local file: {filename}")

    print("🚀 Step 3: Pushing new content live to GitHub Pages...")
    try:
        run_git_command(["git", "add", "-f", full_path], JEKYLL_REPO_PATH)

        commit_message = f"Auto-publish post via local Ollama: {topic_prompt[:40]}"
        run_git_command(["git", "commit", "-m", commit_message], JEKYLL_REPO_PATH)

        run_git_command(["git", "push", "origin", GIT_BRANCH], JEKYLL_REPO_PATH)

        print("\n🎉 SUCCESS! Your local AI generated text is now queued on GitHub.")
        print(
            "🌍 Give GitHub Actions about 30–60 seconds to re-render, and your post will be live "
            "on your website!"
        )
    except Exception:
        print(
            "\n❌ Automation stopped during the Git deployment step. The draft remains safe in your "
            "local _posts folder."
        )


if __name__ == "__main__":
    blog_topic = sys.argv[1] if len(sys.argv) > 1 else (
        "Why static site generators like Jekyll remain king in 2026"
    )
    create_and_push_blog_post(blog_topic)