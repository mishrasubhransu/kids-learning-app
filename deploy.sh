#!/bin/bash

# Kids Learning App - Deploy to Vercel via GitHub
# Usage: ./deploy.sh "Your commit message"
# Or just: ./deploy.sh (uses default message "Update")

set -e

# Default commit message
MESSAGE="${1:-Update}"

echo "🚀 Deploying Kids Learning App to Vercel..."
echo ""

# Check if there are changes to commit
if git diff --quiet && git diff --staged --quiet; then
    echo "No changes to commit. Checking if there are untracked files..."
    UNTRACKED=$(git ls-files --others --exclude-standard)
    if [ -z "$UNTRACKED" ]; then
        echo "✅ Everything is up to date. Nothing to deploy."
        exit 0
    fi
fi

# Add all changes
echo "📦 Staging changes..."
git add .

# Show what will be committed
echo ""
echo "📋 Changes to be committed:"
git status --short
echo ""

# Commit
echo "💾 Committing with message: \"$MESSAGE\""
git commit -m "$MESSAGE"

# Push to origin
echo ""
echo "⬆️  Pushing to GitHub..."
git push origin master

echo ""
echo "✅ Done! Vercel will automatically deploy from GitHub."
echo "   Check your Vercel dashboard for deployment status."
