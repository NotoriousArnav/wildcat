---
layout: default
title: Local Testing
nav_exclude: true
---

# Testing Jekyll Site Locally

To test the documentation site locally before deploying to GitHub Pages:

## Prerequisites

1. **Ruby** (2.7 or higher)
2. **Bundler**

## Installation

```bash
# Install Ruby (if not already installed)
# On Ubuntu/Debian:
sudo apt install ruby-full build-essential zlib1g-dev

# On macOS:
brew install ruby

# Install Bundler
gem install bundler

# Install Jekyll dependencies
cd /path/to/wildcat
bundle install
```

## Running Locally

```bash
# Start Jekyll server
bundle exec jekyll serve

# Or with live reload
bundle exec jekyll serve --livereload

# Access site at:
# http://localhost:4000
```

## Building for Production

```bash
# Build static site
bundle exec jekyll build

# Output will be in _site/ directory
```

## Troubleshooting

### Gem::GemNotFoundException
```bash
bundle install
```

### Permission denied
```bash
gem install bundler --user-install
```

### Port already in use
```bash
bundle exec jekyll serve --port 4001
```

---

**Note:** GitHub Pages automatically builds and deploys Jekyll sites from the `gh-pages` branch. Local testing is optional but recommended for verifying changes before pushing.
