#!/bin/bash
# Package AgentForge Pro premium content into downloadable zips
set -e

BASE="$HOME/projects/agentforge-pro"
DIST="$BASE/dist"
mkdir -p "$DIST"

echo "Packaging AgentForge Pro..."

# Pro tier ($49): agents + skills + templates + hooks
echo "→ Creating Pro package..."
cd "$BASE/premium"
zip -r "$DIST/agentforge-pro-pack.zip" \
  agents/*.md \
  skills/*.md \
  templates/*.md \
  hooks/*.mjs hooks/*.md \
  -x "*.DS_Store"

# Ultimate tier ($79): Pro + workflows + all free content
echo "→ Creating Ultimate package..."
cd "$BASE"
zip -r "$DIST/agentforge-ultimate-pack.zip" \
  premium/agents/*.md \
  premium/skills/*.md \
  premium/templates/*.md \
  premium/hooks/*.mjs premium/hooks/*.md \
  premium/workflows/*.md \
  free/agents/*.md \
  free/skills/*.md \
  free/templates/*.md \
  -x "*.DS_Store"

echo ""
echo "Done!"
ls -lh "$DIST/"
echo ""
echo "Pro pack: $(unzip -l "$DIST/agentforge-pro-pack.zip" | tail -1)"
echo "Ultimate pack: $(unzip -l "$DIST/agentforge-ultimate-pack.zip" | tail -1)"
