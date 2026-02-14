#!/bin/bash

# Market Validation System - Project Setup
# Creates project-specific directories for validation results
# Version: 3.0

set -e

echo "========================================="
echo "Market Validation - Project Setup"
echo "========================================="
echo ""
echo "This creates project-specific directories for storing validation results."
echo ""
echo "Prerequisites:"
echo "  - Global installation: setup-market-validation-global.sh must be run first"
echo ""

# Check if global installation exists
if [[ ! -d ~/.specwright/workflows/validation ]]; then
    echo "Error: Global Market Validation System not found"
    echo ""
    echo "Please run global installation first:"
    echo "  curl -sSL https://raw.githubusercontent.com/michsindlinger/specwright/main/setup-market-validation-global.sh | bash"
    echo ""
    exit 1
fi

# Create project directories
echo "Creating project directories..."
mkdir -p specwright/market-validation

echo ""
echo "Project structure created!"
echo ""
echo "Created directories:"
echo "  specwright/market-validation/     - Validation campaign results stored here"
echo ""
echo "Ready to use:"
echo "  /validate-market \"Your product idea\""
echo ""

# Optional: Update project config.yml if it exists
if [[ -f specwright/config.yml ]]; then
    echo "Updating project config.yml..."

    if ! grep -q "market_validation:" specwright/config.yml; then
        cat >> specwright/config.yml << 'EOF'

# Market Validation Configuration (uses global installation)
market_validation:
  enabled: true
  lookup_order:
    - project
    - global
EOF
        echo "Added market_validation section to specwright/config.yml"
    else
        echo "market_validation section already exists in config.yml"
    fi
fi

echo ""
echo "Project setup complete!"
echo ""
echo "Start validating:"
echo "  /validate-market"
echo ""
