#!/bin/bash
# Run this script to connect your repo to GitHub and push.
# You will be prompted to log in to GitHub (browser or token).

set -e
cd "$(dirname "$0")"

# 1. Install GitHub CLI if needed (macOS with Homebrew)
if ! command -v gh &>/dev/null; then
  echo "Installing GitHub CLI..."
  if command -v brew &>/dev/null; then
    brew install gh
  else
    echo "Install gh first: https://cli.github.com/"
    exit 1
  fi
fi

# 2. Log in to GitHub (opens browser or prompts for token)
echo "Logging in to GitHub..."
gh auth login --web --git-protocol https

# 3. Create the repo on GitHub and push (replace USERNAME with your GitHub username if you want a different repo name)
REPO_NAME="crm-system"
echo "Creating repo $REPO_NAME on GitHub and pushing..."
gh repo create "$REPO_NAME" --private --source=. --remote=origin --push

echo "Done! Your project is at: https://github.com/$(gh api user -q .login)/$REPO_NAME"
