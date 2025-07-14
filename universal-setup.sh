#!/bin/bash
set -e

# Universal Development Environment Setup Script
# Combines best practices from PCRI and Caketrades projects
# Supports macOS, Alpine, and Debian-based systems

echo "🚀 Universal Development Environment Setup"
echo "==========================================="

# Detect OS type
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS_TYPE="macos"
    echo "📦 Detected: macOS"
elif command -v apk &> /dev/null; then
    OS_TYPE="alpine"
    echo "📦 Detected: Alpine Linux"
elif command -v apt-get &> /dev/null; then
    OS_TYPE="debian"
    echo "📦 Detected: Debian/Ubuntu"
else
    echo "❌ Unsupported OS. This script supports macOS, Alpine, and Debian/Ubuntu."
    exit 1
fi

# Function to install system packages
install_system_packages() {
    echo "🔧 Installing system dependencies..."
    
    if [[ "$OS_TYPE" == "macos" ]]; then
        # Check if Homebrew is installed
        if ! command -v brew &> /dev/null; then
            echo "🍺 Installing Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            
            # Add Homebrew to PATH for current session
            if [[ -f "/opt/homebrew/bin/brew" ]]; then
                # Apple Silicon Macs
                eval "$(/opt/homebrew/bin/brew shellenv)"
            else
                # Intel Macs
                eval "$(/usr/local/bin/brew shellenv)"
            fi
        fi
        
        echo "🔧 Installing macOS development tools..."
        brew install \
            curl \
            wget \
            git \
            python3 \
            node \
            || echo "⚠️  Some packages may already be installed"
            
        # Install conda for Python environment management
        if ! command -v conda &> /dev/null; then
            echo "🐍 Installing Miniconda for Python environment management..."
            curl -fsSL https://repo.anaconda.com/miniconda/Miniconda3-latest-MacOSX-arm64.sh -o miniconda.sh
            bash miniconda.sh -b -p $HOME/miniconda3
            rm miniconda.sh
            
            # Add conda to PATH
            export PATH="$HOME/miniconda3/bin:$PATH"
            echo 'export PATH="$HOME/miniconda3/bin:$PATH"' >> ~/.zshrc
            
            # Initialize conda
            $HOME/miniconda3/bin/conda init zsh
            echo "✅ Miniconda installed and configured"
        else
            echo "✅ Conda already installed"
        fi
            
    elif [[ "$OS_TYPE" == "alpine" ]]; then
        apk add --no-cache \
            curl \
            wget \
            git \
            bash \
            sudo \
            python3 \
            make \
            g++ \
            ca-certificates \
            nodejs \
            npm \
            chromium \
            nss \
            freetype \
            freetype-dev \
            harfbuzz \
            ttf-freefont
    else
        apt-get update && apt-get install -y \
            curl \
            wget \
            git \
            bash \
            sudo \
            python3 \
            make \
            g++ \
            ca-certificates \
            nodejs \
            npm \
            && rm -rf /var/lib/apt/lists/*
    fi
    
    echo "✅ System dependencies installed"
}

# Function to install Google Cloud CLI
install_gcloud() {
    echo "☁️ Installing Google Cloud CLI..."
    
    if ! command -v gcloud &> /dev/null; then
        curl https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-458.0.0-linux-x86_64.tar.gz > /tmp/google-cloud-cli.tar.gz
        tar -xzf /tmp/google-cloud-cli.tar.gz -C /opt
        /opt/google-cloud-sdk/install.sh --quiet
        rm /tmp/google-cloud-cli.tar.gz
        export PATH="/opt/google-cloud-sdk/bin:${PATH}"
        echo 'export PATH="/opt/google-cloud-sdk/bin:${PATH}"' >> ~/.bashrc
        echo "✅ Google Cloud CLI installed"
    else
        echo "✅ Google Cloud CLI already installed"
    fi
}

# Function to install GitHub CLI
install_github_cli() {
    echo "📦 Installing GitHub CLI..."
    
    if ! command -v gh &> /dev/null; then
        if [[ "$OS_TYPE" == "macos" ]]; then
            echo "🍺 Installing GitHub CLI via Homebrew..."
            brew install gh
            echo "✅ GitHub CLI installed via Homebrew"
        elif [[ "$OS_TYPE" == "alpine" ]]; then
            # Try apk first, fallback to manual installation
            if apk add --no-cache github-cli 2>/dev/null; then
                echo "✅ GitHub CLI installed via apk"
            else
                echo "⚙️  Installing GitHub CLI manually..."
                ARCH=$(uname -m)
                if [[ "$ARCH" == "x86_64" ]]; then
                    ARCH="amd64"
                elif [[ "$ARCH" == "aarch64" ]]; then
                    ARCH="arm64"
                fi
                
                curl -fsSL "https://github.com/cli/cli/releases/latest/download/gh_*_linux_${ARCH}.tar.gz" | tar -xz
                sudo mv "gh_*_linux_${ARCH}/bin/gh" /usr/local/bin/
                rm -rf "gh_*_linux_${ARCH}"
                echo "✅ GitHub CLI installed manually"
            fi
        else
            # Debian/Ubuntu installation
            curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
            sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
            sudo apt-get update
            sudo apt-get install -y gh
            echo "✅ GitHub CLI installed via apt"
        fi
    else
        echo "✅ GitHub CLI already installed"
    fi
}

# Function to install Google Cloud CLI
install_gcloud() {
    echo "☁️  Installing Google Cloud CLI..."
    
    if ! command -v gcloud &> /dev/null; then
        if [[ "$OS_TYPE" == "macos" ]]; then
            echo "🍺 Installing Google Cloud CLI via Homebrew..."
            brew install --cask google-cloud-sdk
            echo "✅ Google Cloud CLI installed via Homebrew"
        elif [[ "$OS_TYPE" == "debian" ]]; then
            echo "📦 Installing Google Cloud CLI for Debian/Ubuntu..."
            curl -sSL https://sdk.cloud.google.com | bash
            echo "✅ Google Cloud CLI installed"
        elif [[ "$OS_TYPE" == "alpine" ]]; then
            echo "📦 Installing Google Cloud CLI for Alpine..."
            curl -sSL https://sdk.cloud.google.com | bash
            echo "✅ Google Cloud CLI installed"
        fi
    else
        echo "✅ Google Cloud CLI already installed"
    fi
}

# Function to install Node.js dependencies
install_node_deps() {
    echo "📦 Installing Node.js dependencies..."
    
    if [[ -f "package.json" ]]; then
        npm install
        echo "✅ Node.js dependencies installed"
    else
        echo "⚠️  No package.json found, skipping npm install"
    fi
}

# Function to install AI CLI tools
install_ai_cli_tools() {
    echo "🤖 Installing AI CLI tools..."
    
    # Install Claude CLI
    if ! command -v claude &> /dev/null; then
        echo "🤖 Installing Claude Code CLI..."
        
        if [[ -f "package.json" ]]; then
            npm install @anthropic-ai/claude-code
            CLAUDE_PATH="./node_modules/@anthropic-ai/claude-code/cli.js"
        else
            npm install -g @anthropic-ai/claude-code
            CLAUDE_PATH="$(npm root -g)/@anthropic-ai/claude-code/cli.js"
        fi
        
        # Create Claude CLI wrapper
        mkdir -p ~/bin
        cat > ~/bin/claude << EOF
#!/bin/bash
exec node "$CLAUDE_PATH" "\$@"
EOF
        chmod +x ~/bin/claude
        
        # Add to PATH
        export PATH="$HOME/bin:$PATH"
        echo 'export PATH="$HOME/bin:$PATH"' >> ~/.bashrc
        
        echo "✅ Claude CLI installed and configured"
    else
        echo "✅ Claude CLI already installed"
    fi
    
    # Install Gemini CLI
    if ! command -v gemini &> /dev/null; then
        echo "🤖 Installing Gemini CLI..."
        npm install -g @google/gemini-cli
        echo "✅ Gemini CLI installed"
    else
        echo "✅ Gemini CLI already installed"
    fi
}

# Function to setup Playwright (for web scraping projects)
setup_playwright() {
    echo "🎭 Setting up Playwright..."
    
    if [[ -f "package.json" ]] && grep -q "playwright" package.json; then
        echo "🎭 Playwright detected in package.json"
        
        if [[ "$OS_TYPE" == "alpine" ]]; then
            # Use system Chromium for Alpine
            export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
            export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser
            export PLAYWRIGHT_BROWSERS_PATH=/usr/bin
            
            echo "✅ Using pre-installed system Chromium browser"
            echo "🌐 Chromium location: $(which chromium-browser)"
            echo "📦 Chromium version: $(chromium-browser --version)"
            
            # Install Playwright without browser downloads
            PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install playwright
        else
            # Install Playwright normally for Debian/Ubuntu
            npm install playwright
            npx playwright install
        fi
        
        echo "✅ Playwright configured"
    else
        echo "⚠️  Playwright not detected in package.json, skipping setup"
    fi
}

# Function to setup user and permissions
setup_user_permissions() {
    echo "👤 Setting up user permissions..."
    
    # Create directories if they don't exist
    mkdir -p ~/bin
    mkdir -p ~/.config/claude-code
    mkdir -p ~/.config/gh
    mkdir -p ~/.config/gemini
    
    # Set proper permissions
    chmod 755 ~/bin
    chmod 755 ~/.config
    chmod 755 ~/.config/claude-code
    chmod 755 ~/.config/gh
    chmod 755 ~/.config/gemini
    
    echo "✅ User permissions configured"
}

# Function to create development scripts
create_dev_scripts() {
    echo "📝 Creating development scripts..."
    
    # Create a universal development start script
    cat > ~/bin/dev-start << 'EOF'
#!/bin/bash
# Universal development server starter

echo "🚀 Starting development environment..."

# Check for different project types and start appropriate servers
if [[ -f "package.json" ]]; then
    if grep -q "vite" package.json; then
        echo "🔧 Vite project detected"
        npm run dev
    elif grep -q "react-scripts" package.json; then
        echo "🔧 Create React App detected"
        npm start
    elif grep -q "next" package.json; then
        echo "🔧 Next.js project detected"
        npm run dev
    else
        echo "🔧 Generic Node.js project"
        npm start
    fi
else
    echo "⚠️  No package.json found"
fi
EOF
    
    chmod +x ~/bin/dev-start
    echo "✅ Development scripts created"
}

# Function to setup Python environment
setup_python_environment() {
    echo "🐍 Setting up Python development environment..."
    
    # Check if we have a Python project (look for common Python files)
    if [[ -f "requirements.txt" || -f "pyproject.toml" || -f "setup.py" || -f "Pipfile" ]]; then
        PROJECT_HAS_PYTHON=true
    else
        # Check if current directory suggests Python project
        if [[ $(basename "$PWD") == *"python"* ]] || [[ -f "main.py" ]] || [[ -f "app.py" ]]; then
            PROJECT_HAS_PYTHON=true
        else
            PROJECT_HAS_PYTHON=false
        fi
    fi
    
    if [[ "$PROJECT_HAS_PYTHON" == "true" ]] || command -v conda &> /dev/null; then
        echo "🔍 Python project detected or conda available"
        
        # Get project name for environment
        PROJECT_NAME=$(basename "$PWD")
        ENV_NAME="$PROJECT_NAME"
        
        if command -v conda &> /dev/null; then
            echo "📦 Creating conda environment: $ENV_NAME"
            
            # Create conda environment if it doesn't exist
            if ! conda env list | grep -q "^$ENV_NAME "; then
                conda create -n "$ENV_NAME" python=3.11 -y
                echo "✅ Conda environment '$ENV_NAME' created"
            else
                echo "✅ Conda environment '$ENV_NAME' already exists"
            fi
            
            # Create activation script
            cat > activate_env.sh << EOF
#!/bin/bash
# Activate the conda environment for this project
echo "🐍 Activating conda environment: $ENV_NAME"
conda activate $ENV_NAME
echo "✅ Environment activated. Use 'conda deactivate' to exit."
EOF
            
            chmod +x activate_env.sh
            
            # Install common Python packages if requirements exist
            if [[ -f "requirements.txt" ]]; then
                echo "📋 Installing packages from requirements.txt..."
                
                # Check if this is an ML project (contains ML libraries)
                if grep -q "numpy\|pandas\|scikit-learn\|tensorflow\|torch" requirements.txt; then
                    echo "🤖 ML libraries detected - installing with conda for better performance..."
                    # Install ML base packages via conda (faster, better optimized)
                    conda install -n "$ENV_NAME" -c conda-forge numpy pandas scikit-learn matplotlib seaborn jupyter -y
                    # Install remaining packages via pip
                    conda run -n "$ENV_NAME" pip install -r requirements.txt
                else
                    # Regular packages via pip
                    conda run -n "$ENV_NAME" pip install -r requirements.txt
                fi
                
                echo "✅ Requirements installed"
            fi
            
            echo "✅ Python conda environment setup complete"
            echo "   • Run: ./activate_env.sh (or conda activate $ENV_NAME)"
            echo "   • Deactivate with: conda deactivate"
            
        else
            echo "📦 Creating Python virtual environment: $ENV_NAME"
            
            # Create virtual environment if it doesn't exist
            if [[ ! -d "venv" ]]; then
                python3 -m venv venv
                echo "✅ Virtual environment created"
            else
                echo "✅ Virtual environment already exists"
            fi
            
            # Create activation script
            cat > activate_env.sh << EOF
#!/bin/bash
# Activate the virtual environment for this project
echo "🐍 Activating virtual environment"
source venv/bin/activate
echo "✅ Environment activated. Use 'deactivate' to exit."
EOF
            
            chmod +x activate_env.sh
            
            # Install common Python packages if requirements exist
            if [[ -f "requirements.txt" ]]; then
                echo "📋 Installing packages from requirements.txt..."
                source venv/bin/activate
                pip install -r requirements.txt
                deactivate
                echo "✅ Requirements installed"
            fi
            
            echo "✅ Python virtual environment setup complete"
            echo "   • Run: ./activate_env.sh (or source venv/bin/activate)"
            echo "   • Deactivate with: deactivate"
        fi
    else
        echo "ℹ️  No Python project detected, skipping Python environment setup"
    fi
}

# Function to display post-installation instructions
show_post_install_instructions() {
    echo ""
    echo "🎉 Installation Complete!"
    echo "========================"
    echo ""
    echo "📋 Available Commands:"
    echo "  • claude          - Claude AI CLI"
    echo "  • gemini          - Google Gemini CLI"
    echo "  • gh              - GitHub CLI"
    echo "  • gcloud          - Google Cloud CLI"
    echo "  • dev-start       - Start development server"
    echo ""
    echo "🔧 Next Steps:"
    echo "  1. Restart your terminal or run: source ~/.bashrc"
    echo "  2. Authenticate with services:"
    echo "     • gh auth login --web"
    echo "     • gcloud auth login"
    echo "  3. Configure Claude CLI with your API key"
    echo "  4. Run 'dev-start' to start your development server"
    echo ""
    echo "📁 Config directories created:"
    echo "  • ~/.config/claude-code"
    echo "  • ~/.config/gh"
    echo "  • ~/.config/gemini"
    echo ""
}

# Main installation flow
main() {
    echo "🚀 Starting installation process..."
    
    # Check if running as root (not recommended for some operations)
    if [[ $EUID -eq 0 ]]; then
        echo "⚠️  Running as root. Some operations may require non-root user."
    fi
    
    # Run installation steps
    install_system_packages
    install_gcloud
    install_github_cli
    install_node_deps
    install_ai_cli_tools
    setup_playwright
    setup_user_permissions
    create_dev_scripts
    setup_python_environment
    
    show_post_install_instructions
    
    echo "✅ Universal development environment setup complete!"
}

# Run main function
main "$@"