#!/bin/bash
# Enable GitHub Pages for this repo (source: gh-pages branch).
# Run once with your token:  GITHUB_TOKEN=your_token_here ./enable-pages.sh
# Get a token: https://github.com/settings/tokens (scope: repo or public_repo)

set -e
REPO="Landdreamz/crm-system"
if [ -z "$GITHUB_TOKEN" ]; then
  echo "Set GITHUB_TOKEN first. Example:"
  echo "  export GITHUB_TOKEN=ghp_xxxx"
  echo "Get a token: https://github.com/settings/tokens (scope: repo)"
  exit 1
fi

echo "Enabling GitHub Pages for $REPO (branch: gh-pages)..."
curl -s -X PUT \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/$REPO/pages" \
  -d '{"source":{"branch":"gh-pages","path":"/"}}'

echo ""
echo "Done. In 1–2 minutes your site should be at: https://landdreamz.github.io/crm-system/"
