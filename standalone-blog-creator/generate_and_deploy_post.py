import os
import re
import subprocess
from datetime import datetime
import ollama

### ==========================================

### CONFIGURATION

### ==========================================

### 1. Change this to the exact absolute path of your local GitHub Pages repository

JEKYLL_REPO_PATH = "/home/uselesse/Documents/americantreeserviceco.github.io"

### 2. Change this to your default Git deployment branch (usually 'main' or 'master')

GIT_BRANCH = "main"

### ==========================================

def run_git_command(commands, working_dir):
"""Safely runs terminal Git commands in the repository directory."""
try:
result = subprocess.run(commands, cwd=working_dir, check=True, text=True, capture_output=True)
print(result.stdout.strip())
except subprocess.CalledProcessError as e:
print(f"❌ Git Command Error: {e.stderr.strip()}")
raise e

def create_and_push_blog_post(topic_prompt):

### Safety Check for default template path

if JEKYLL_REPO_PATH == "/path/to/your/username.github.io":
print("⚠️ Action Required: Please edit this script and set 'JEKYLL_REPO_PATH' to your actual local folder.")
return

print(f"🤖 Step 1: Generating blog post via Ollama ('adept-blogger') for: '{topic_prompt}'...")

try:
response = ollama.generate(
model='adept-blogger',
prompt=f"Write a comprehensive blog post about: {topic_prompt}"
)
except Exception as e:
print(f"❌ Failed to reach Ollama. Is the server running? Error: {e}")
return

post_content = response['response'].strip()

### Structure naming data for Jekyll expectations

today_date = datetime.now().strftime("%Y-%m-%d")

### Create an automated URL-safe slug from the prompt

slug = topic_prompt.lower()
slug = re.sub(r'[^a-z0-9\s-]', '', slug)  # Remove non-alphanumeric chars
slug = re.sub(r'[\s-]+', '-', slug).strip('-')  # Convert multiple spaces/hyphens to a single dash
slug = slug[:50]  # Hard character limit for URL friendliness 

filename = f"{today_date}-{slug}.md"
posts_dir = os.path.join(JEKYLL_REPO_PATH, "_posts") 

### Ensure local directory exists

if not os.path.exists(posts_dir):
os.makedirs(posts_dir) 

full_path = os.path.join(posts_dir, filename) 

### Save the file into your local Jekyll project workspace

with open(full_path, "w", encoding="utf-8") as f:
f.write(post_content)
print(f"📝 Step 2: Post successfully generated and written to local file: {filename}") 

### Run the Git upload pipeline

print("🚀 Step 3: Pushing new content live to GitHub Pages...")
try: 

### Add only the new post to avoid accidentally committing unrelated edits

run_git_command(["git", "add", full_path], JEKYLL_REPO_PATH) 

### Commit with an automated timestamp message

commit_message = f"Auto-publish post via local Ollama: {topic_prompt[:40]}"
run_git_command(["git", "commit", "-m", commit_message], JEKYLL_REPO_PATH) 

# Push to remote GitHub repository
run_git_command(["git", "push", "origin", GIT_BRANCH], JEKYLL_REPO_PATH)

print("\n🎉 SUCCESS! Your local AI generated text is now queued on GitHub.")
print("🌍 Give GitHub Actions about 30–60 seconds to re-render, and your post will be live on your website!")

except Exception as e:
print("\n❌ Automation stopped during the Git deployment step. The draft remains safe in your local _posts folder.")

if **name** == "**main**": 

### 🎯 Change this string whenever you want to generate a new post!

blog_topic = "Why static site generators like Jekyll remain king in 2026" 

create_and_push_blog_post(blog_topic)
