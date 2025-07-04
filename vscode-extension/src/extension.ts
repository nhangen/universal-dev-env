import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    console.log('Universal Dev Environment extension is now active!');

    // Register commands
    const initProject = vscode.commands.registerCommand('universal-dev-env.initProject', async (uri?: vscode.Uri) => {
        await initializeProject(uri);
    });

    const setupEnvironment = vscode.commands.registerCommand('universal-dev-env.setupEnvironment', async () => {
        await setupDevelopmentEnvironment();
    });

    const createDockerfile = vscode.commands.registerCommand('universal-dev-env.createDockerfile', async () => {
        await createUniversalDockerfile();
    });

    const createDevcontainer = vscode.commands.registerCommand('universal-dev-env.createDevcontainer', async () => {
        await createDevcontainerConfig();
    });

    const installCLITools = vscode.commands.registerCommand('universal-dev-env.installCLITools', async () => {
        await installAICLITools();
    });

    context.subscriptions.push(initProject, setupEnvironment, createDockerfile, createDevcontainer, installCLITools);

    // Show welcome message on first activation
    const hasShownWelcome = context.globalState.get('hasShownWelcome', false);
    if (!hasShownWelcome) {
        showWelcomeMessage();
        context.globalState.update('hasShownWelcome', true);
    }
}

async function initializeProject(uri?: vscode.Uri) {
    const workspaceFolder = uri ? uri.fsPath : vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder found. Please open a folder first.');
        return;
    }

    const config = vscode.workspace.getConfiguration('universal-dev-env');
    
    // Get user preferences
    const projectType = await vscode.window.showQuickPick([
        { label: '⚛️ React Frontend', value: 'react' },
        { label: '🟢 Node.js Backend', value: 'node' },
        { label: '🐍 Python Application', value: 'python' },
        { label: '🔄 Full-Stack (React + Node)', value: 'full-stack' },
        { label: '⚙️ Custom/Other', value: 'custom' }
    ], {
        placeHolder: 'Select project type',
        ignoreFocusOut: true
    });

    if (!projectType) return;

    const features = await vscode.window.showQuickPick([
        { label: '🤖 AI CLI Tools (Claude, Gemini)', picked: config.get('includeAITools', true) },
        { label: '☁️ Google Cloud CLI', picked: config.get('includeCloudTools', true) },
        { label: '📦 GitHub CLI', picked: config.get('includeCloudTools', true) },
        { label: '🎭 Playwright (Web Automation)', picked: false },
        { label: '🐳 Docker Multi-stage Build', picked: true },
        { label: '🔧 VS Code Extensions Pack', picked: true }
    ], {
        placeHolder: 'Select features to include',
        canPickMany: true,
        ignoreFocusOut: true
    });

    if (!features) return;

    const baseImage = await vscode.window.showQuickPick([
        { label: '🐧 Alpine Linux (Lightweight)', value: 'alpine' },
        { label: '🖥️ Debian/Ubuntu (Compatible)', value: 'debian' }
    ], {
        placeHolder: 'Select base Docker image',
        ignoreFocusOut: true
    });

    if (!baseImage) return;

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Setting up Universal Dev Environment',
        cancellable: false
    }, async (progress) => {
        progress.report({ increment: 0, message: 'Creating configuration files...' });

        try {
            // Create setup script
            await createSetupScript(workspaceFolder);
            progress.report({ increment: 25, message: 'Created setup script' });

            // Create Dockerfile
            await createDockerfile(workspaceFolder, baseImage.value, projectType.value);
            progress.report({ increment: 50, message: 'Created Dockerfile' });

            // Create DevContainer config
            if (config.get('autoSetupDevcontainer', true)) {
                await createDevcontainer(workspaceFolder, projectType.value, features);
                progress.report({ increment: 75, message: 'Created DevContainer config' });
            }

            // Create README
            await createReadme(workspaceFolder, projectType.value);
            progress.report({ increment: 100, message: 'Setup complete!' });

            vscode.window.showInformationMessage(
                'Universal Dev Environment setup complete! 🚀',
                'Open DevContainer',
                'Run Setup Script'
            ).then(selection => {
                if (selection === 'Open DevContainer') {
                    vscode.commands.executeCommand('remote-containers.reopenInContainer');
                } else if (selection === 'Run Setup Script') {
                    runSetupScript(workspaceFolder);
                }
            });

        } catch (error) {
            vscode.window.showErrorMessage(`Setup failed: ${error}`);
        }
    });
}

async function setupDevelopmentEnvironment() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder found.');
        return;
    }

    const terminal = vscode.window.createTerminal('Universal Dev Setup');
    const setupScript = path.join(workspaceFolder, 'universal-setup.sh');
    
    if (fs.existsSync(setupScript)) {
        terminal.sendText(`chmod +x "${setupScript}" && "${setupScript}"`);
        terminal.show();
    } else {
        vscode.window.showErrorMessage('Setup script not found. Please initialize the project first.');
    }
}

async function createUniversalDockerfile() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder found.');
        return;
    }

    const dockerfilePath = path.join(workspaceFolder, 'Dockerfile');
    const dockerfileContent = getDockerfileTemplate('debian', 'react');
    
    fs.writeFileSync(dockerfilePath, dockerfileContent);
    
    const doc = await vscode.workspace.openTextDocument(dockerfilePath);
    await vscode.window.showTextDocument(doc);
    
    vscode.window.showInformationMessage('Universal Dockerfile created! 🐳');
}

async function createDevcontainerConfig() {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder found.');
        return;
    }

    const devcontainerDir = path.join(workspaceFolder, '.devcontainer');
    if (!fs.existsSync(devcontainerDir)) {
        fs.mkdirSync(devcontainerDir);
    }

    const devcontainerPath = path.join(devcontainerDir, 'devcontainer.json');
    const devcontainerContent = getDevcontainerTemplate('react', []);
    
    fs.writeFileSync(devcontainerPath, JSON.stringify(devcontainerContent, null, 2));
    
    const doc = await vscode.workspace.openTextDocument(devcontainerPath);
    await vscode.window.showTextDocument(doc);
    
    vscode.window.showInformationMessage('DevContainer configuration created! 📦');
}

async function installAICLITools() {
    const terminal = vscode.window.createTerminal('AI CLI Setup');
    
    terminal.sendText('echo "🤖 Installing AI CLI Tools..."');
    terminal.sendText('npm install -g @anthropic-ai/claude-code @google/gemini-cli');
    terminal.sendText('echo "✅ AI CLI tools installed!"');
    terminal.sendText('echo "💡 You can now use: claude, gemini"');
    
    terminal.show();
    
    vscode.window.showInformationMessage('Installing AI CLI tools... Check terminal for progress.');
}

function showWelcomeMessage() {
    vscode.window.showInformationMessage(
        'Welcome to Universal Dev Environment! 🚀',
        'Get Started',
        'Learn More'
    ).then(selection => {
        if (selection === 'Get Started') {
            vscode.commands.executeCommand('universal-dev-env.initProject');
        } else if (selection === 'Learn More') {
            vscode.env.openExternal(vscode.Uri.parse('https://github.com/axelroark/universal-dev-env'));
        }
    });
}

async function createSetupScript(workspaceFolder: string) {
    const setupScript = getSetupScriptTemplate();
    const scriptPath = path.join(workspaceFolder, 'universal-setup.sh');
    fs.writeFileSync(scriptPath, setupScript);
    fs.chmodSync(scriptPath, 0o755);
}

async function createDockerfile(workspaceFolder: string, baseImage: string, projectType: string) {
    const dockerfileContent = getDockerfileTemplate(baseImage, projectType);
    const dockerfilePath = path.join(workspaceFolder, 'Dockerfile');
    fs.writeFileSync(dockerfilePath, dockerfileContent);
}

async function createDevcontainer(workspaceFolder: string, projectType: string, features: any[]) {
    const devcontainerDir = path.join(workspaceFolder, '.devcontainer');
    if (!fs.existsSync(devcontainerDir)) {
        fs.mkdirSync(devcontainerDir);
    }

    const devcontainerContent = getDevcontainerTemplate(projectType, features);
    const devcontainerPath = path.join(devcontainerDir, 'devcontainer.json');
    fs.writeFileSync(devcontainerPath, JSON.stringify(devcontainerContent, null, 2));
}

async function createReadme(workspaceFolder: string, projectType: string) {
    const readmeContent = getReadmeTemplate(projectType);
    const readmePath = path.join(workspaceFolder, 'README.md');
    fs.writeFileSync(readmePath, readmeContent);
}

function runSetupScript(workspaceFolder: string) {
    const terminal = vscode.window.createTerminal('Universal Dev Setup');
    const setupScript = path.join(workspaceFolder, 'universal-setup.sh');
    terminal.sendText(`cd "${workspaceFolder}" && chmod +x universal-setup.sh && ./universal-setup.sh`);
    terminal.show();
}

// Template functions
function getSetupScriptTemplate(): string {
    return `#!/bin/bash
set -e

echo "🚀 Universal Development Environment Setup"
echo "==========================================="

# Detect OS type
if command -v apk &> /dev/null; then
    OS_TYPE="alpine"
    echo "📦 Detected: Alpine Linux"
elif command -v apt-get &> /dev/null; then
    OS_TYPE="debian"
    echo "📦 Detected: Debian/Ubuntu"
else
    echo "❌ Unsupported OS"
    exit 1
fi

# Install system dependencies
echo "🔧 Installing system dependencies..."
if [[ "$OS_TYPE" == "alpine" ]]; then
    apk add --no-cache curl wget git bash sudo nodejs npm
else
    apt-get update && apt-get install -y curl wget git bash sudo nodejs npm
fi

# Install AI CLI tools
echo "🤖 Installing AI CLI tools..."
npm install -g @anthropic-ai/claude-code @google/gemini-cli

# Install GitHub CLI
echo "📦 Installing GitHub CLI..."
if [[ "$OS_TYPE" == "debian" ]]; then
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
    sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
    sudo apt-get update && sudo apt-get install -y gh
fi

echo "✅ Setup complete!"
echo "🎉 Available commands: claude, gemini, gh"
`;
}

function getDockerfileTemplate(baseImage: string, projectType: string): string {
    const base = baseImage === 'alpine' ? 'node:18-alpine' : 'node:18-bullseye-slim';
    
    return `# Universal Development Environment Dockerfile
FROM ${base}

# Install system dependencies
${baseImage === 'alpine' ? 
    'RUN apk add --no-cache curl wget git bash sudo python3 make g++' :
    'RUN apt-get update && apt-get install -y curl wget git bash sudo python3 make g++ && rm -rf /var/lib/apt/lists/*'
}

# Install Google Cloud CLI
RUN curl https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-458.0.0-linux-x86_64.tar.gz > /tmp/google-cloud-cli.tar.gz && \\
    tar -xzf /tmp/google-cloud-cli.tar.gz -C /opt && \\
    /opt/google-cloud-sdk/install.sh --quiet && \\
    rm /tmp/google-cloud-cli.tar.gz
ENV PATH="/opt/google-cloud-sdk/bin:\${PATH}"

# Create user
RUN groupadd -g 1001 nodejs && \\
    useradd -m -u 1001 -g nodejs -s /bin/bash developer && \\
    echo "developer ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

WORKDIR /workspace

# Install global packages
RUN npm install -g @anthropic-ai/claude-code @google/gemini-cli

USER developer

EXPOSE 3000 3001 5000 5173 8000

CMD ["bash"]
`;
}

function getDevcontainerTemplate(projectType: string, features: any[]): any {
    return {
        name: "Universal Dev Environment",
        build: {
            dockerfile: "../Dockerfile"
        },
        customizations: {
            vscode: {
                extensions: [
                    "ms-vscode.vscode-typescript-next",
                    "ms-vscode.vscode-eslint",
                    "esbenp.prettier-vscode",
                    "GitHub.copilot",
                    "GitHub.copilot-chat",
                    "GitHub.vscode-pull-request-github"
                ],
                settings: {
                    "terminal.integrated.defaultProfile.linux": "bash",
                    "editor.formatOnSave": true
                }
            }
        },
        forwardPorts: [3000, 3001, 5000, 5173, 8000],
        remoteUser: "developer",
        workspaceFolder: "/workspace",
        postCreateCommand: "./universal-setup.sh"
    };
}

function getReadmeTemplate(projectType: string): string {
    return `# Universal Dev Environment Project

${projectType.charAt(0).toUpperCase() + projectType.slice(1)} project with universal development environment.

## 🚀 Quick Start

### Using DevContainer (Recommended)
1. Open this project in VS Code
2. Install the "Dev Containers" extension
3. Click "Reopen in Container" when prompted

### Manual Setup
\`\`\`bash
./universal-setup.sh
\`\`\`

## 🛠️ Available Tools

- **Claude CLI**: \`claude\` - AI development assistant
- **Gemini CLI**: \`gemini\` - Google AI CLI
- **GitHub CLI**: \`gh\` - GitHub integration
- **Google Cloud CLI**: \`gcloud\` - Cloud tools

## 📚 Documentation

Generated with Universal Dev Environment VS Code Extension
`;
}

export function deactivate() {}
`;