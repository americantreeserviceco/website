# American Tree Service Co. Website

Welcome to the American Tree Service Co. website repository! This project is designed to provide an intuitive platform for customers to learn about and request our tree care services.

## Table of Contents

- [Features](#features)
- [Technologies Used](#technologies-used)
- [Installation](#installation)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Features

- Service Descriptions: Detailed pages for each tree service offered.
- Appointment Scheduling: Customers can request quotes and schedule appointments online.
- Customer Reviews: Section for satisfied customers to share their experiences.
- Responsive Design: Compatible with mobile devices and tablets.
- Blog: Articles related to tree care tips, advice, and industry news.

## Technologies Used

This project is built using:

- HTML5
- CSS3
- JavaScript
- Jekyll for building and publishing blog posts
- [Add other frameworks or libraries if applicable, such as React, Vue, Bootstrap, etc.]

## Jekyll Build

If a `Gemfile` is present in the repository, run `bundle install` before `jekyll build` to install the project’s bundled dependencies.

```bash
gem install jekyll bundler
bundle install
bundle exec jekyll build
bundle exec jekyll serve
```

The generated site is written to `_site/`. New blog posts belong in `_posts/` and should include Jekyll YAML front matter. Pushing to the `dev` branch triggers the GitHub Pages Jekyll deployment workflow.

## Legacy URL Redirects

Add old-to-new path pairs to `redirects.json`, then run:

```bash
npm run generate:redirects
```

The generator writes `_redirects` for hosts that support redirect rules (such as Cloudflare Pages or Netlify), plus Jekyll pages under `redirect-pages/`. Those pages provide browser-level redirects on GitHub Pages, which does not support HTTP 301 rules through `_redirects`. The generator rejects source paths that already match a site page, so an existing page is not silently replaced. Review and deploy the generated files with the site.

## Installation

To get a local copy up and running, follow these steps:

1. Clone the repo:
   ```bash
   git clone  https://github.com/americantreeserviceco/american-tree-service-site.git 

