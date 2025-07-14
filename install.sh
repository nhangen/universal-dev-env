#!/bin/bash
# Universal Dev Environment - One-line installer
# curl -fsSL https://raw.githubusercontent.com/nhangen/universal-dev-env/main/install.sh | bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://github.com/nhangen/universal-dev-env"
INSTALL_DIR="$HOME/.universal-dev-env"
BIN_DIR="$HOME/.local/bin"

echo -e "${BLUE}🚀 Universal Dev Environment Installer${NC}"
echo -e "${BLUE}=======================================${NC}"

# Check if running on macOS, Linux, or WSL
OS="unknown"
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    if grep -q Microsoft /proc/version 2>/dev/null; then
        OS="wsl"
    else
        OS="linux"
    fi
fi

echo -e "${YELLOW}📦 Detected OS: $OS${NC}"

# Function to install via package manager
install_via_package_manager() {
    echo -e "${YELLOW}🔍 Checking for package managers...${NC}"
    
    if command -v brew &> /dev/null; then
        echo -e "${GREEN}🍺 Homebrew detected, installing via brew...${NC}"
        brew tap nhangen/universal-dev-env
        brew install universal-dev-env
        echo -e "${GREEN}✅ Installed via Homebrew!${NC}"
        return 0
    fi
    
    if command -v npm &> /dev/null; then
        echo -e "${GREEN}📦 npm detected, installing globally...${NC}"
        npm install -g @nhangen/universal-dev-env
        echo -e "${GREEN}✅ Installed via npm!${NC}"
        return 0
    fi
    
    return 1
}

# Function to install manually
install_manually() {
    echo -e "${YELLOW}⚙️  Installing manually...${NC}"
    
    # Create directories
    mkdir -p "$INSTALL_DIR"
    mkdir -p "$BIN_DIR"
    
    # Download files
    echo -e "${YELLOW}📥 Downloading files...${NC}"
    
    if command -v curl &> /dev/null; then
        curl -fsSL "$REPO_URL/raw/main/universal-setup.sh" -o "$INSTALL_DIR/universal-setup.sh"
        curl -fsSL "$REPO_URL/raw/main/Dockerfile.universal" -o "$INSTALL_DIR/Dockerfile.universal"
        curl -fsSL "$REPO_URL/raw/main/devcontainer.universal.json" -o "$INSTALL_DIR/devcontainer.universal.json"
    elif command -v wget &> /dev/null; then
        wget -q "$REPO_URL/raw/main/universal-setup.sh" -O "$INSTALL_DIR/universal-setup.sh"
        wget -q "$REPO_URL/raw/main/Dockerfile.universal" -O "$INSTALL_DIR/Dockerfile.universal"
        wget -q "$REPO_URL/raw/main/devcontainer.universal.json" -O "$INSTALL_DIR/devcontainer.universal.json"
    else
        echo -e "${RED}❌ Neither curl nor wget found. Please install one of them.${NC}"
        exit 1
    fi
    
    # Make scripts executable
    chmod +x "$INSTALL_DIR/universal-setup.sh"
    
    # Create wrapper script
    cat > "$BIN_DIR/universal-dev-setup" << 'EOF'
#!/bin/bash
exec "$HOME/.universal-dev-env/universal-setup.sh" "$@"
EOF
    
    cat > "$BIN_DIR/uds" << 'EOF'
#!/bin/bash
INSTALL_DIR="$HOME/.universal-dev-env"

case "$1" in
    "init")
        echo "🚀 Initializing Universal Dev Environment..."
        mkdir -p .devcontainer
        cp "$INSTALL_DIR/Dockerfile.universal" ./Dockerfile
        cp "$INSTALL_DIR/devcontainer.universal.json" ./.devcontainer/devcontainer.json
        cp "$INSTALL_DIR/universal-setup.sh" ./
        echo "✅ Project initialized! Open in VS Code with Dev Containers extension."
        ;;
    "setup"|"install")
        exec "$INSTALL_DIR/universal-setup.sh"
        ;;
    "update"|"upgrade")
        echo "🔄 Updating Universal Dev Environment..."
        curl -fsSL https://raw.githubusercontent.com/nhangen/universal-dev-env/main/install.sh | bash
        ;;
    "--version"|"-v")
        echo "Universal Dev Environment v1.0.0"
        ;;
    "--help"|"-h"|"")
        echo "Universal Dev Environment CLI"
        echo ""
        echo "Usage: uds <command>"
        echo ""
        echo "Commands:"
        echo "  init     Initialize project with dev environment"
        echo "  setup    Install development tools"
        echo "  update   Update to latest version"
        echo ""
        echo "Examples:"
        echo "  uds init           # Initialize current directory"
        echo "  uds setup          # Install development tools"
        echo "  uds update         # Update to latest version"
        ;;
    *)
        echo "Unknown command: $1"
        echo "Run 'uds --help' for usage information"
        exit 1
        ;;
esac
EOF
    
    chmod +x "$BIN_DIR/universal-dev-setup"
    chmod +x "$BIN_DIR/uds"
    
    echo -e "${GREEN}✅ Manual installation complete!${NC}"
}

# Function to update PATH
update_path() {
    # Add to PATH in shell configuration files
    SHELL_RC=""
    if [[ "$SHELL" == *"zsh"* ]]; then
        SHELL_RC="$HOME/.zshrc"
    elif [[ "$SHELL" == *"bash"* ]]; then
        SHELL_RC="$HOME/.bashrc"
    fi
    
    if [[ -n "$SHELL_RC" ]] && [[ -f "$SHELL_RC" ]]; then
        if ! grep -q "$BIN_DIR" "$SHELL_RC"; then
            echo "" >> "$SHELL_RC"
            echo "# Universal Dev Environment" >> "$SHELL_RC"
            echo "export PATH=\"$BIN_DIR:\$PATH\"" >> "$SHELL_RC"
            echo -e "${YELLOW}📝 Added $BIN_DIR to PATH in $SHELL_RC${NC}"
        fi
    fi
    
    # Update current session PATH
    export PATH="$BIN_DIR:$PATH"
}

# Main installation logic
main() {
    echo -e "${YELLOW}🔧 Starting installation...${NC}"
    
    # Try package manager first
    if install_via_package_manager; then
        echo -e "${GREEN}🎉 Installation complete via package manager!${NC}"
    else
        echo -e "${YELLOW}📦 Package manager not available, installing manually...${NC}"
        install_manually
        update_path
        echo -e "${GREEN}🎉 Manual installation complete!${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}📋 Available Commands:${NC}"
    echo -e "  ${GREEN}universal-dev-setup${NC}  - Main setup script"
    echo -e "  ${GREEN}uds${NC}                  - Quick CLI tool"
    echo ""
    echo -e "${BLUE}🚀 Quick Start:${NC}"
    echo -e "  ${YELLOW}1.${NC} mkdir my-project && cd my-project"
    echo -e "  ${YELLOW}2.${NC} uds init"
    echo -e "  ${YELLOW}3.${NC} Open in VS Code with Dev Containers extension"
    echo ""
    echo -e "${BLUE}📚 Documentation:${NC} $REPO_URL"
    echo ""
    echo -e "${GREEN}✨ Restart your terminal or run 'source ~/.bashrc' to use the commands!${NC}"
}

# Run main function
main "$@"