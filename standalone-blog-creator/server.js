const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());

// Create a directory named "_posts" locally if it doesn't already exist
const POSTS_DIR = path.join(__dirname, '_posts');
if (!fs.existsSync(POSTS_DIR)) {
  fs.mkdirSync(POSTS_DIR);
}

// 1. BACKEND ROUTE: Automatically writes the blog file to disk
app.post('/api/save-post', (req, res) => {
  const { title, slug, summary, tags, status, content } = req.body;

  if (!title || !slug || !content) {
    return res.status(400).json({ success: false, message: 'Missing title, slug, or content.' });
  }

  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const filename = `${date}-${slug.toLowerCase().replace(/[^a-z0-9-_]/g, '')}.md`;
  const filePath = path.join(POSTS_DIR, filename);

  // Construct Markdown with standard YAML front-matter metadata
  const fileString = `---
title: "${title.replace(/"/g, '\\"')}"
date: ${date}
summary: "${(summary || '').replace(/"/g, '\\"')}"
tags: [${(tags || []).map(t => `"\${t.trim()}"`).join(', ')}]
status: "${status || 'draft'}"
---

${content}
`;

  fs.writeFile(filePath, fileString, 'utf8', (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Failed to write markdown file.' });
    }
    res.status(200).json({ success: true, message: `Successfully saved to _posts/${filename}` });
  });
});

// 2. FRONTEND INTERFACE: Serves the single-page text editor application
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Local Standalone Blog Creator</title>
      <style>
        * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { margin: 0; padding: 20px; background: #f4f6f8; display: flex; flex-direction: column; height: 100vh; }
        header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        h1 { margin: 0; font-size: 1.5rem; color: #1a202c; }
        button { background: #3182ce; color: white; border: none; padding: 10px 20px; font-weight: bold; border-radius: 6px; cursor: pointer; }
        button:hover { background: #2b6cb0; }
        .meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 15px; background: white; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .field { display: flex; flex-direction: column; gap: 5px; }
        label { font-size: 0.85rem; font-weight: 600; color: #4a5568; }
        input, select, textarea { padding: 8px; border: 1px solid #cbd5e0; border-radius: 4px; font-size: 0.95rem; width: 100%; }
        .editor-container { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; flex-grow: 1; min-height: 0; }
        textarea.editor { resize: none; height: 100%; font-family: "Courier New", Courier, monospace; font-size: 1rem; background: #fafafa; }
        .preview { background: white; border: 1px solid #cbd5e0; border-radius: 4px; padding: 15px; overflow-y: auto; white-space: pre-wrap; }
      </style>
    </head>
    <body>
      <header>
        <h1>Standalone Blog Studio</h1>
        <button onclick="saveBlogPost()">💾 Save Directly to Disk</button>
      </header>

      <div class="meta-grid">
        <div class="field"><label>Title</label><input type="text" id="title" placeholder="My Awesome Post" oninput="autoSlug()"></div>
        <div class="field"><label>URL Slug</label><input type="text" id="slug" placeholder="my-awesome-post"></div>
        <div class="field"><label>Summary</label><input type="text" id="summary" placeholder="Brief description..."></div>
        <div class="field"><label>Tags (Comma separated)</label><input type="text" id="tags" placeholder="tech, tutorial, javascript"></div>
        <div class="field">
          <label>Status</label>
          <select id="status"><option value="draft">Draft</option><option value="published">Published</option></select>
        </div>
      </div>

      <div class="editor-container">
        <div class="field" style="height: 100%;">
          <label>Markdown Editor</label>
          <textarea id="content" class="editor" oninput="updatePreview()" placeholder="# Start writing your post here..."></textarea>
        </div>
        <div class="field" style="height: 100%;">
          <label>Live View</label>
          <div id="preview" class="preview"></div>
        </div>
      </div>

      <script>
        function autoSlug() {
          const title = document.getElementById('title').value;
          document.getElementById('slug').value = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        }
        function updatePreview() {
          document.getElementById('preview').innerText = document.getElementById('content').value;
        }
        async function saveBlogPost() {
          const payload = {
            title: document.getElementById('title').value,
            slug: document.getElementById('slug').value,
            summary: document.getElementById('summary').value,
            tags: document.getElementById('tags').value.split(',').filter(Boolean),
            status: document.getElementById('status').value,
            content: document.getElementById('content').value
          };
          try {
            const res = await fetch('/api/save-post', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            const data = await res.json();
            alert(data.message);
          } catch(err) {
            alert('Error connecting to local file system server.');
          }
        }
      </script>
    </body>
    </html>
  `);
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`\x1b[32m%s\x1b[0m`, `🚀 Stand-alone Blog Creator running!`);
  console.log(`👉 Open http://localhost:${PORT} in your favorite browser to begin writing.`);
});
