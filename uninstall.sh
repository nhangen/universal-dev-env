#!/bin/bash
# Universal Dev Environment - Uninstall Script
# Removes all traces of Universal Dev Environment

set -e

echo "🗑️  Universal Dev Environment - Uninstall Script"
echo "================================================="
echo ""

# Detect OS type for package manager commands
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS_TYPE="macos"
    PACKAGE_MANAGER="brew"
elif command -v apt-get &> /dev/null; then
    OS_TYPE="debian"
    PACKAGE_MANAGER="apt"
elif command -v yum &> /dev/null; then
    OS_TYPE="redhat"
    PACKAGE_MANAGER="yum"
elif command -v apk &> /dev/null; then
    OS_TYPE="alpine"
    PACKAGE_MANAGER="apk"
else
    OS_TYPE="unknown"
    PACKAGE_MANAGER="unknown"
fi

echo "📦 Detected: $OS_TYPE"
echo ""

# Function to ask for confirmation
confirm() {
    read -p "$1 (y/N): " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]]
}

# Remove NPM package
echo "1️⃣  Removing NPM package..."
if command -v npm &> /dev/null; then
    if npm list -g @nhangen/universal-dev-env &> /dev/null; then
        npm uninstall -g @nhangen/universal-dev-env
        echo "✅ NPM package removed"
    else
        echo "ℹ️  NPM package not installed"
    fi
else
    echo "ℹ️  npm not found"
fi

# Remove cache and config directories
echo ""
echo "2️⃣  Removing cache and configuration files..."
DIRS_TO_REMOVE=(
    "$HOME/.universal-dev-env"
    "$HOME/.config/claude-code"
    "$HOME/.config/gh"
    "$HOME/.config/gemini"
)

for dir in "${DIRS_TO_REMOVE[@]}"; do
    if [[ -d "$dir" ]]; then
        echo "Removing: $dir"
        rm -rf "$dir"
    fi
done

# Remove development scripts
echo ""
echo "3️⃣  Removing development scripts..."
SCRIPTS_TO_REMOVE=(
    "$HOME/bin/dev-start"
    "$HOME/bin/claude"
)

for script in "${SCRIPTS_TO_REMOVE[@]}"; do
    if [[ -f "$script" ]]; then
        echo "Removing: $script"
        rm -f "$script"
    fi
done

# Optional: Remove installed tools
echo ""
echo "4️⃣  Optional: Remove installed development tools"
echo "⚠️  This will remove tools that you might use for other projects"
echo ""

if confirm "Remove GitHub CLI (gh)?"; then
    case $PACKAGE_MANAGER in
        "brew")
            brew uninstall gh 2>/dev/null || echo "GitHub CLI not installed via Homebrew"
            ;;
        "apt")
            sudo apt-get remove -y gh 2>/dev/null || echo "GitHub CLI not installed via apt"
            ;;
        "yum")
            sudo yum remove -y gh 2>/dev/null || echo "GitHub CLI not installed via yum"
            ;;
        "apk")
            sudo apk del github-cli 2>/dev/null || echo "GitHub CLI not installed via apk"
            ;;
        *)
            echo "⚠️  Please remove GitHub CLI manually"
            ;;
    esac
fi

if confirm "Remove Google Cloud CLI (gcloud)?"; then
    case $PACKAGE_MANAGER in
        "brew")
            brew uninstall --cask google-cloud-sdk 2>/dev/null || echo "Google Cloud SDK not installed via Homebrew"
            ;;
        "apt"|"yum"|"apk")
            if [[ -d "$HOME/google-cloud-sdk" ]]; then
                rm -rf "$HOME/google-cloud-sdk"
                echo "✅ Google Cloud SDK removed"
            else
                echo "ℹ️  Google Cloud SDK not found in home directory"
            fi
            ;;
        *)
            echo "⚠️  Please remove Google Cloud CLI manually"
            ;;
    esac
fi

if confirm "Remove AI CLI tools (Claude, Gemini)?"; then
    npm uninstall -g @anthropic-ai/claude-code 2>/dev/null || echo "Claude CLI not installed globally"
    npm uninstall -g @google/gemini-cli 2>/dev/null || echo "Gemini CLI not installed globally"
fi

if [[ "$OS_TYPE" == "macos" ]] && confirm "Remove Docker Desktop?"; then
    brew uninstall --cask docker 2>/dev/null || echo "Docker Desktop not installed via Homebrew"
fi

if [[ "$OS_TYPE" == "darwin" ]] && confirm "Remove Homebrew? (⚠️  This affects other packages too)"; then
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/uninstall.sh)"
fi

# Clean up project files (current directory)
echo ""
echo "5️⃣  Cleaning up project files in current directory..."
PROJECT_FILES=(
    "./universal-setup.sh"
    "./Dockerfile.universal"
    "./devcontainer.universal.json"
    "./.devcontainer"
)

for file in "${PROJECT_FILES[@]}"; do
    if [[ -e "$file" ]]; then
        if confirm "Remove $file?"; then
            rm -rf "$file"
            echo "✅ Removed $file"
        fi
    fi
done

echo ""
echo "🎉 Universal Dev Environment uninstall complete!"
echo ""
echo "📋 Summary of what was removed:"
echo "  • NPM package (@nhangen/universal-dev-env)"
echo "  • Cache directory (~/.universal-dev-env)"
echo "  • Configuration directories"
echo "  • Development scripts"
echo "  • Optional: Development tools (if selected)"
echo ""
echo "💡 To reinstall: npm install -g @nhangen/universal-dev-env"