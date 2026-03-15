#!/bin/bash
# AgentForge Pro - One-click deploy script
# Usage: ./deploy-all.sh <github-username> <github-pat> <cloudflare-token> <cloudflare-account-id>
set -e

GH_USER="$1"
GH_PAT="$2"
CF_TOKEN="$3"
CF_ACCOUNT="$4"

if [ -z "$GH_USER" ] || [ -z "$GH_PAT" ]; then
  echo "Usage: ./deploy-all.sh <github-username> <github-pat> [cloudflare-token] [cloudflare-account-id]"
  exit 1
fi

echo "=== STEP 1: Create GitHub repo ==="
curl -s -H "Authorization: token $GH_PAT" \
  -d '{"name":"agentforge-pro","description":"Production-Ready AI Coding Agents, Skills & Configurations for Claude Code and Cursor","homepage":"","public":true}' \
  https://api.github.com/user/repos | grep -o '"html_url":"[^"]*"' | head -1

echo ""
echo "=== STEP 2: Push free tier to GitHub ==="
cd ~/projects/agentforge-pro/free
git remote remove origin 2>/dev/null || true
git remote add origin "https://$GH_PAT@github.com/$GH_USER/agentforge-pro.git"
git branch -M main
git push -u origin main --force

echo ""
echo "=== STEP 3: Deploy landing page to Cloudflare Pages ==="
if [ -n "$CF_TOKEN" ] && [ -n "$CF_ACCOUNT" ]; then
  npx wrangler pages deploy ~/projects/agentforge-pro/landing-page \
    --project-name agentforge-pro \
    --branch main \
    --commit-dirty \
    2>&1
  echo "Landing page deployed!"
else
  echo "Skipping Cloudflare deploy (no token provided)"
fi

echo ""
echo "=== DONE ==="
echo "GitHub: https://github.com/$GH_USER/agentforge-pro"
echo "Next: Upload zip files to Payhip manually"
