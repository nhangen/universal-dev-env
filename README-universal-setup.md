# Universal Development Environment Setup

This repository contains a universal development environment setup that combines the best practices from both PCRI and Caketrades projects. It provides a flexible, secure, and feature-rich development environment suitable for various project types.

## 🚀 Quick Start

### Option 1: Direct Script Installation
```bash
# Make the script executable
chmod +x universal-setup.sh

# Run the setup script
./universal-setup.sh
```

### Option 2: DevContainer Setup
```bash
# Copy the devcontainer config to your project
cp devcontainer.universal.json .devcontainer/devcontainer.json
cp Dockerfile.universal ./Dockerfile

# Open in VS Code with Dev Containers extension
code .
```

## 📦 What's Included

### System Dependencies
- **Base System**: Node.js, Python 3, Git, Bash, Curl, Wget
- **Build Tools**: Make, G++, CA Certificates
- **Browser Support**: Chromium (for web automation)

### Development Tools
- **AI CLI Tools**:
  - Claude Code CLI (`claude` command)
  - Google Gemini CLI (`gemini` command)
- **Cloud Tools**:
  - Google Cloud CLI (`gcloud` command)
  - GitHub CLI (`gh` command)
- **Web Automation**:
  - Playwright (with system browser support)

### VS Code Extensions (DevContainer)
- TypeScript/JavaScript support
- ESLint and Prettier
- Tailwind CSS IntelliSense
- React/JSX snippets
- GitHub integration
- Docker and Kubernetes tools
- Python development tools

## 🔧 Features

### Multi-OS Support
- **Alpine Linux**: Lightweight, security-focused
- **Debian/Ubuntu**: Broader compatibility

### Security Best Practices
- Non-root user execution
- Proper file permissions
- Secure package installation

### Flexible Architecture
- **Development Mode**: Full tooling and hot reload
- **Production Mode**: Optimized builds with health checks
- **Multi-stage Docker builds**: Efficient image sizes

### Project Type Detection
The setup automatically detects and configures for:
- Create React App projects
- Vite-based projects
- Next.js applications
- Express.js backends
- Python Flask/Django apps
- Generic Node.js projects

## 📋 Available Commands

After installation, you'll have access to:

```bash
# AI Development Tools
claude          # Claude AI CLI
gemini          # Google Gemini CLI

# Cloud & Version Control
gcloud          # Google Cloud CLI
gh              # GitHub CLI

# Development Utilities
dev-start       # Universal development server starter
```

## 🛠️ Configuration

### Environment Variables
```bash
# Playwright configuration (Alpine Linux)
export PLAYWRIGHT_BROWSERS_PATH=/usr/bin
export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Development environment
export NODE_ENV=development
```

### Config Directories
The setup creates the following configuration directories:
- `~/.config/claude-code` - Claude CLI configuration
- `~/.config/gh` - GitHub CLI configuration
- `~/.config/gemini` - Gemini CLI configuration

## 🔐 Authentication Setup

After installation, authenticate with your services:

```bash
# GitHub CLI
gh auth login --web

# Google Cloud CLI
gcloud auth login

# Configure Claude CLI with your API key
claude config set api-key YOUR_API_KEY
```

## 🐳 Docker Usage

### Development Container
```bash
# Build development image
docker build --target development -t my-dev-env .

# Run development container
docker run -it -p 3000:3000 -v $(pwd):/workspace my-dev-env
```

### Production Container
```bash
# Build production image
docker build --target production -t my-app .

# Run production container
docker run -p 3000:3000 my-app
```

## 🚀 Project-Specific Usage

### React Projects
```bash
# The setup will detect React and use appropriate commands
dev-start  # Automatically runs 'npm start' or 'npm run dev'
```

### Full-Stack Projects
```bash
# For projects with both frontend and backend
npm run dev  # Often configured to run both servers concurrently
```

### Python Projects
```bash
# Python dependencies are automatically available
python3 -m pip install -r requirements.txt
```

## 🔧 Customization

### Adding New Tools
Edit `universal-setup.sh` to add additional tools:

```bash
# Example: Add new CLI tool
install_my_tool() {
    echo "🔧 Installing My Tool..."
    npm install -g my-tool
    echo "✅ My Tool installed"
}
```

### Modifying Docker Configuration
Edit `Dockerfile.universal` to customize the container:

```dockerfile
# Add custom system packages
RUN apt-get update && apt-get install -y \
    your-package-here \
    && rm -rf /var/lib/apt/lists/*
```

## 📚 Best Practices

1. **Security**: Always run containers as non-root users
2. **Efficiency**: Use multi-stage builds for production
3. **Portability**: Support multiple OS distributions
4. **Maintainability**: Keep configuration files separate
5. **Automation**: Use health checks and proper error handling

## 🐛 Troubleshooting

### Common Issues

**Playwright Browser Issues (Alpine)**
```bash
# Verify Chromium installation
which chromium-browser
chromium-browser --version

# Check environment variables
echo $PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
```

**Permission Issues**
```bash
# Fix permissions
sudo chown -R $USER:$USER ~/.config
chmod -R 755 ~/.config
```

**CLI Tools Not Found**
```bash
# Reload shell configuration
source ~/.bashrc

# Verify PATH
echo $PATH
```

## 📝 Contributing

To improve this setup:

1. Test changes on both Alpine and Debian systems
2. Maintain backward compatibility
3. Add appropriate error handling
4. Update documentation

## 📄 License

This setup configuration is provided as-is for development purposes. Individual tools and packages maintain their respective licenses.