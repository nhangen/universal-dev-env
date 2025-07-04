# Universal Development Environment

> 🚀 One-click setup for modern development environments with AI tools, cloud CLIs, and optimized containers

[![npm version](https://badge.fury.io/js/%40axelroark%2Funiversal-dev-env.svg)](https://badge.fury.io/js/%40axelroark%2Funiversal-dev-env)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🌟 Features

- **🤖 AI-Powered Development**: Pre-configured Claude and Gemini CLI tools
- **☁️ Cloud-Ready**: Google Cloud CLI, GitHub CLI, and deployment configs
- **🐳 Container Optimized**: Multi-stage Docker builds with security best practices
- **🔧 VS Code Integration**: Rich extension pack and DevContainer support
- **🌍 Universal Compatibility**: Works on Alpine, Debian, macOS, and Windows (WSL)
- **⚡ Lightning Fast**: Optimized build processes and caching strategies

## 🚀 Quick Start

### One-Line Install
```bash
curl -fsSL https://raw.githubusercontent.com/axelroark/universal-dev-env/main/install.sh | bash
```

### Package Manager Install
```bash
# Via npm
npm install -g @axelroark/universal-dev-env

# Via Homebrew (macOS)
brew tap axelroark/universal-dev-env
brew install universal-dev-env
```

### VS Code Extension
Search for "Universal Dev Environment" in VS Code Extensions marketplace.

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
uds setup                   # Install development tools
uds update                  # Update to latest version
universal-dev-setup         # Main setup script (direct)
```

## 🛠️ What's Included

### Development Tools
- **Claude CLI** (`claude`) - AI-powered coding assistant
- **Gemini CLI** (`gemini`) - Google's AI development tool
- **GitHub CLI** (`gh`) - GitHub integration and automation
- **Google Cloud CLI** (`gcloud`) - Cloud deployment and management

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
git clone https://github.com/axelroark/universal-dev-env.git
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

## 🐛 Known Issues

- Playwright may require additional setup on some Alpine variants
- GitHub CLI authentication needs manual setup in containers
- Some VS Code extensions may not work in web-based environments

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by the DevContainer specification
- Built with the amazing VS Code Extension API
- Powered by Docker and modern container practices
- Community feedback and contributions

## 📞 Support

- 🐛 [Bug Reports](https://github.com/axelroark/universal-dev-env/issues)
- 💡 [Feature Requests](https://github.com/axelroark/universal-dev-env/discussions)
- 📧 [Email Support](mailto:support@axelroark.com)
- 💬 [Discord Community](https://discord.gg/axelroark)

---

<div align="center">
  <b>Made with ❤️ by <a href="https://github.com/axelroark">Axelroark</a></b>
  <br>
  <sub>Empowering developers with universal, AI-enhanced environments</sub>
</div>