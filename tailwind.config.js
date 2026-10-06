/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './_drafts/**/*.md',
    './_includes/**/*.html',
    './_layouts/**/*.html',
    './_posts/**/*.md',
    './*.{html,md}',
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/typography'), // Enables the prose class for markdown
  ],
} 
