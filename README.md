# Universal Development Environment

> 🚀 One-click setup for modern development environments with AI tools, cloud CLIs, and optimized containers

[![npm version](https://badge.fury.io/js/%40nhangen%2Funiversal-dev-env.svg)](https://badge.fury.io/js/%40nhangen%2Funiversal-dev-env)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🔗 Live Distribution Channels

- **📦 NPM Package**: https://www.npmjs.com/package/@nhangen/universal-dev-env
- **🔧 VS Code Extension**: Coming soon to marketplace
- **🐙 GitHub Repository**: https://github.com/nhangen/universal-dev-env
- **⚡ One-Line Installer**: `curl -fsSL https://raw.githubusercontent.com/nhangen/universal-dev-env/main/install.sh | bash` (Unix/Linux/macOS)

## 🌟 Features

- **🤖 AI-Powered Development**: Pre-configured Claude and Gemini CLI tools
- **☁️ Cloud-Ready**: Google Cloud CLI, GitHub CLI, and deployment configs
- **🐳 Container Optimized**: Multi-stage Docker builds with security best practices
- **🔧 VS Code Integration**: Rich extension pack and DevContainer support
- **🌍 Universal Compatibility**: Works on Alpine, Debian, macOS, Windows, and WSL
- **⚡ Lightning Fast**: Optimized build processes and intelligent caching
- **💾 Smart Caching**: Automatic caching of downloads and installations for faster setup

## 🚀 Quick Start

### One-Line Install

**Unix/Linux/macOS:**
```bash
curl -fsSL https://raw.githubusercontent.com/nhangen/universal-dev-env/main/install.sh | bash
```

**Windows (PowerShell as Administrator):**
```powershell
iwr -useb https://raw.githubusercontent.com/nhangen/universal-dev-env/main/install-windows.bat | iex
```

**Windows (Alternative - Download & Run):**
```bash
# Download and run the batch installer
curl -O https://raw.githubusercontent.com/nhangen/universal-dev-env/main/install-windows.bat
# Right-click install-windows.bat and "Run as Administrator"
```

### Package Manager Install

**Cross-Platform (npm):**
```bash
npm install -g @nhangen/universal-dev-env
```

**macOS (Homebrew):**
```bash
brew tap nhangen/universal-dev-env
brew install universal-dev-env
```

**Windows (Chocolatey):**
```powershell
# Coming soon - use npm method above for now
choco install universal-dev-env
```

### VS Code Extension
```bash
# Coming soon to VS Code Marketplace
# For now, use the npm package method above
```

## ⚡ Quick Troubleshooting

**Setup failed?** → [Jump to Troubleshooting Guide](#-troubleshooting--management)

**Common fixes:**
- **macOS "Unsupported OS"**: `curl -fsSL https://raw.githubusercontent.com/nhangen/universal-dev-env/main/universal-setup.sh -o universal-setup.sh && chmod +x universal-setup.sh && ./universal-setup.sh`
- **Permission denied**: `chmod +x universal-setup.sh`  
- **Clear cache**: `uds cache --clear`
- **Start fresh**: `rm -rf project-name && uds init --no-cache`

## 📋 Usage

### Initialize New Project
```bash
mkdir my-awesome-project
cd my-awesome-project
uds init
```

### Setup Existing Project
```bash
cd existing-project
uds setup
```

### Available Commands
```bash
uds init                    # Initialize project with dev environment
uds init --no-cache         # Initialize without caching (fresh downloads)
uds setup                   # Install development tools
uds update                  # Update to latest version
uds cache --info            # Show cache information
uds cache --clear           # Clear cached files
universal-dev-setup         # Main setup script (direct)
```

## 🛠️ What Gets Installed

### Core Development Tools
- **Node.js & npm** - JavaScript runtime and package manager
- **Git** - Version control system
- **Docker** - Container platform (optional on Windows)
- **VS Code** - Code editor (Windows only, manual on other platforms)

### AI & Cloud CLI Tools
- **Claude CLI** (`claude`) - AI-powered coding assistant
- **Gemini CLI** (`gemini`) - Google's AI development tool  
- **GitHub CLI** (`gh`) - GitHub integration and automation
- **Google Cloud CLI** (`gcloud`) - Cloud deployment and management

### Package Managers (Auto-installed if missing)
- **macOS**: Homebrew (`brew`)
- **Windows**: Chocolatey (`choco`)
- **Linux**: Uses system package manager (`apt`, `yum`, `apk`)

### Container Features
- Multi-stage Docker builds for optimal image sizes
- Security-hardened containers with non-root users
- Alpine and Debian base image options
- Playwright browser automation support
- Health checks and proper signal handling

### VS Code Extensions
- TypeScript/JavaScript development
- React and Node.js tooling
- Docker and Kubernetes support
- AI coding assistants (GitHub Copilot)
- Cloud development tools
- Linting, formatting, and debugging

## 🏗️ Project Types Supported

### React Frontend
```bash
uds init --type react
```
- Create React App or Vite setup
- TailwindCSS integration
- Hot reload development
- Optimized production builds

### Node.js Backend
```bash
uds init --type node
```
- Express.js server setup
- Development with nodemon
- Production PM2 configuration
- Database integration helpers

### Full-Stack Applications
```bash
uds init --type full-stack
```
- React frontend + Node.js backend
- Concurrent development servers
- Shared TypeScript types
- Docker Compose orchestration

### Python Applications
```bash
uds init --type python
```
- Flask/Django project structure
- Virtual environment management
- Development and production configs
- Package management with pip

## 🪟 Windows-Specific Setup

Universal Dev Environment now has full Windows support via PowerShell:

### Prerequisites
- **Windows 10/11** with PowerShell 5.1+ (included by default)
- **Administrator privileges** (required for installation)
- **Internet connection** for downloading tools

### What Gets Installed on Windows
- **Chocolatey** - Package manager for Windows
- **Node.js & npm** - JavaScript runtime and package manager  
- **Git** - Version control system
- **Visual Studio Code** - Code editor
- **GitHub Desktop** - Git GUI (optional)
- **Docker Desktop** - Container platform (optional, can skip with `-SkipDocker`)
- **Windows Terminal** - Modern terminal application
- **GitHub CLI** - Command line interface for GitHub
- **Claude CLI** - AI-powered development assistant
- **Gemini CLI** - Google's AI development tool

### Windows Installation Options

**Option 1: One-line PowerShell (Recommended)**
```powershell
# Run PowerShell as Administrator, then:
iwr -useb https://raw.githubusercontent.com/nhangen/universal-dev-env/main/install-windows.bat | iex
```

**Option 2: Manual Download**
```powershell
# Download the installer
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/nhangen/universal-dev-env/main/install-windows.bat" -OutFile "install-windows.bat"
# Right-click and "Run as Administrator"
```

**Option 3: Direct PowerShell Script**
```powershell
# Download and run PowerShell script directly
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/nhangen/universal-dev-env/main/universal-setup.ps1" -OutFile "universal-setup.ps1"
powershell -ExecutionPolicy Bypass -File "universal-setup.ps1"
```

### Windows Command Options
```powershell
# Skip Docker Desktop installation
.\universal-setup.ps1 -SkipDocker

# Skip Chocolatey installation (if you already have it)
.\universal-setup.ps1 -SkipChocolatey

# Show help
.\universal-setup.ps1 -Help
```

## 🐳 Docker Usage

### Development Container
```bash
# Build and run development environment
docker build --target development -t my-dev-env .
docker run -it -p 3000:3000 -v $(pwd):/workspace my-dev-env
```

### Production Container
```bash
# Build optimized production image
docker build --target production -t my-app .
docker run -p 3000:3000 my-app
```

### DevContainer (VS Code)
1. Open project in VS Code
2. Install "Dev Containers" extension
3. Click "Reopen in Container"
4. Start coding! 🎉

## 💾 Caching

Universal Dev Environment includes intelligent caching to speed up repeated installations:

### Cache Features
- **📦 Download Caching**: Template files and binaries cached for 30 days
- **🔄 Automatic Fallback**: Falls back to cache if downloads fail
- **🆕 Version-Aware**: Automatically updates cache when new versions are released
- **🗂️ Organized Storage**: Cache stored in `~/.universal-dev-env/cache`
- **🧹 Auto-Cleanup**: Removes old version caches automatically
- **📊 Cache Management**: Built-in tools to monitor and clear cache

### Cache Commands
```bash
# Show cache information
uds cache --info

# Clear all cached files
uds cache --clear

# Initialize without using cache
uds init --no-cache

# Install without using cache
uds install --no-cache
```

### Cache Location
```bash
# Default cache directory
~/.universal-dev-env/cache/

# Cache expires after 30 days OR on version update
# Automatic cleanup of old versions and failed downloads
# Version-aware cache keys ensure fresh content on updates
```

## 🔧 Configuration

### Environment Variables
```bash
# Playwright configuration
export PLAYWRIGHT_BROWSERS_PATH=/usr/bin
export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium

# Development mode
export NODE_ENV=development
```

### Custom Configuration
Create `.universal-dev-env.json` in your project root:

```json
{
  "projectType": "react",
  "baseImage": "debian",
  "features": {
    "aiTools": true,
    "cloudTools": true,
    "playwright": false,
    "multiStage": true
  },
  "ports": [3000, 3001, 8000],
  "customExtensions": [
    "custom.extension-id"
  ]
}
```

## 🏢 Enterprise Features

### Security
- Non-root container execution
- Minimal attack surface with Alpine Linux
- Security scanning integration
- Secret management best practices

### Scalability
- Multi-stage builds for smaller images
- Kubernetes deployment templates
- Load balancer configurations
- Auto-scaling policies

### CI/CD Integration
- GitHub Actions workflows
- GitLab CI templates
- Docker registry automation
- Environment promotion pipelines

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
```bash
git clone https://github.com/nhangen/universal-dev-env.git
cd universal-dev-env
npm install
npm run dev
```

### Running Tests
```bash
npm test
```

### Building Extension
```bash
cd vscode-extension
npm run compile
npm run package
```

## 📚 Documentation

- [Installation Guide](docs/installation.md)
- [Configuration Reference](docs/configuration.md)
- [Docker Guide](docs/docker.md)
- [VS Code Extension](docs/vscode-extension.md)
- [Troubleshooting](docs/troubleshooting.md)
- [FAQ](docs/faq.md)

## 🗺️ Roadmap

- [ ] Support for more frameworks (Vue, Svelte, Angular)
- [ ] Kubernetes templates and Helm charts
- [ ] Integration with more AI tools
- [ ] Plugin system for custom tools
- [ ] Web UI for configuration
- [ ] Team collaboration features

## 🔄 Troubleshooting & Management

### Common Scenarios

**🍎 macOS: "Unsupported OS" Error**
If you get "Unsupported OS" when running `./universal-setup.sh`:
```bash
# The shell script needs to be updated - download latest version
curl -fsSL https://raw.githubusercontent.com/nhangen/universal-dev-env/main/universal-setup.sh -o universal-setup.sh
chmod +x universal-setup.sh
./universal-setup.sh
```

**🔄 Package Installed but Shell Script Failed**
If `npm install -g @nhangen/universal-dev-env` worked but `./universal-setup.sh` failed:
```bash
# Option 1: Update to latest script
curl -fsSL https://raw.githubusercontent.com/nhangen/universal-dev-env/main/universal-setup.sh -o universal-setup.sh
chmod +x universal-setup.sh
./universal-setup.sh

# Option 2: Use Node.js CLI instead (skip shell script)
uds install  # This will install the development tools via Node.js
```

### Restart/Retry Setup

If setup fails or you want to start fresh:

**Option 1: Clear cache and retry**
```bash
# Clear all cached files and retry
uds cache --clear
uds init --no-cache
```

**Option 2: Manual restart**
```bash
# Remove project directory and start over
rm -rf your-project-name
mkdir your-project-name
cd your-project-name
uds init
```

**Option 3: Re-run shell script**
```bash
# If the shell script failed, try again
chmod +x universal-setup.sh
./universal-setup.sh
```

### Uninstall Guide

**Remove NPM Package:**
```bash
npm uninstall -g @nhangen/universal-dev-env
```

**Remove Generated Files:**
```bash
# Remove cache directory
rm -rf ~/.universal-dev-env

# Remove development scripts (optional)
rm -f ~/bin/dev-start

# Remove configuration directories (optional - will lose settings)
rm -rf ~/.config/claude-code
rm -rf ~/.config/gh
rm -rf ~/.config/gemini
```

**Remove Installed Tools (Optional):**

*macOS:*
```bash
# Remove via Homebrew (only if you want to completely remove these tools)
brew uninstall gh google-cloud-sdk
brew uninstall --cask docker
```

*Windows:*
```powershell
# Remove via Chocolatey (optional)
choco uninstall github-cli google-cloud-sdk docker-desktop
```

*Linux:*
```bash
# Remove via package manager (optional)
sudo apt-get remove gh google-cloud-sdk  # Debian/Ubuntu
# or
sudo apk del github-cli  # Alpine
```

**Clean Reset:**
```bash
# Complete clean slate (removes all traces)
npm uninstall -g @nhangen/universal-dev-env
rm -rf ~/.universal-dev-env
rm -rf ~/.config/claude-code ~/.config/gh ~/.config/gemini
rm -f ~/bin/dev-start

# Then reinstall fresh
npm install -g @nhangen/universal-dev-env
uds init --no-cache
```

## 🐛 Known Issues

- Playwright may require additional setup on some Alpine variants
- GitHub CLI authentication needs manual setup in containers
- Some VS Code extensions may not work in web-based environments
- **macOS**: First-time Homebrew installation may require manual PATH setup
- **Windows**: Some antivirus software may flag PowerShell script downloads

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by the DevContainer specification
- Built with the amazing VS Code Extension API
- Powered by Docker and modern container practices
- Community feedback and contributions

## 📞 Support

- 🐛 [Bug Reports](https://github.com/nhangen/universal-dev-env/issues)
- 💡 [Feature Requests](https://github.com/nhangen/universal-dev-env/discussions)
- 📧 [Email Support](mailto:support@nhangen.com)
- 💬 [Discord Community](https://discord.gg/nhangen)

---

<div align="center">
  <b>Made with ❤️ by <a href="https://github.com/nhangen">nhangen</a></b>
  <br>
  <sub>Empowering developers with universal, AI-enhanced environments</sub>
</div>