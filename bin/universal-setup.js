#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora');
const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');
const os = require('os');

// Cross-platform utilities
function isWindows() {
  return os.platform() === 'win32';
}

function isMacOS() {
  return os.platform() === 'darwin';
}

function isLinux() {
  return os.platform() === 'linux';
}

function getShellCommand(command) {
  if (isWindows()) {
    // Use PowerShell on Windows
    return `powershell -Command "${command}"`;
  }
  return command;
}

function getPackageManager() {
  if (isWindows()) {
    return 'choco';
  } else if (isMacOS()) {
    return 'brew';
  } else {
    // Detect Linux package manager
    try {
      execSync('which apt-get', { stdio: 'ignore' });
      return 'apt';
    } catch {
      try {
        execSync('which yum', { stdio: 'ignore' });
        return 'yum';
      } catch {
        try {
          execSync('which apk', { stdio: 'ignore' });
          return 'apk';
        } catch {
          return 'unknown';
        }
      }
    }
  }
}

const packageJson = require('../package.json');

// Cache configuration
const CACHE_DIR = path.join(os.homedir(), '.universal-dev-env', 'cache');
const CACHE_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

program
  .name('universal-dev-setup')
  .description('Universal development environment setup tool')
  .version(packageJson.version);

program
  .command('init')
  .description('Initialize a new project with universal development environment')
  .option('-t, --type <type>', 'Project type (react, node, python, full-stack)')
  .option('-n, --name <name>', 'Project name')
  .option('--here', 'Initialize in current directory instead of creating subdirectory')
  .option('--ml', 'Include ML libraries for Python projects')
  .option('--backend <backend>', 'Backend for React projects (none, express, nextjs, firebase, serverless)')
  .option('--ai-context', 'Generate AI context file for Claude/Gemini/Copilot shared memory')
  .option('--skip-prompts', 'Skip interactive prompts')
  .option('--cache', 'Enable caching for faster setup (default: true)')
  .option('--no-cache', 'Disable caching and download fresh copies')
  .action(async (options) => {
    console.log(chalk.blue.bold('🚀 Universal Development Environment Setup'));
    console.log(chalk.gray('='.repeat(50)));

    let config = {};

    if (!options.skipPrompts) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'projectName',
          message: 'Project name:',
          default: options.name || path.basename(process.cwd()),
          validate: (input) => input.length > 0
        },
        {
          type: 'list',
          name: 'projectType',
          message: 'Select project type:',
          choices: [
            { name: '⚛️  React Frontend', value: 'react' },
            { name: '🟢 Node.js Backend', value: 'node' },
            { name: '🐍 Python Application', value: 'python' },
            { name: '🔄 Full-Stack (React + Node)', value: 'full-stack' },
            { name: '⚙️  Custom/Other', value: 'custom' }
          ],
          default: options.type || 'react'
        },
        {
          type: 'checkbox',
          name: 'features',
          message: 'Select additional features:',
          choices: [
            { name: '🤖 AI CLI Tools (Claude, Gemini)', value: 'ai-cli', checked: true },
            { name: '☁️  Google Cloud CLI', value: 'gcloud', checked: true },
            { name: '📦 GitHub CLI', value: 'github-cli', checked: true },
            { name: '🎭 Playwright (Web Automation)', value: 'playwright' },
            { name: '🐳 Docker Multi-stage Build', value: 'docker-multi-stage' },
            { name: '🔧 VS Code Extensions Pack', value: 'vscode-extensions', checked: true }
          ]
        },
        {
          type: 'list',
          name: 'baseImage',
          message: 'Select base Docker image:',
          choices: [
            { name: '🐧 Alpine Linux (Lightweight)', value: 'alpine' },
            { name: '🖥️  Debian/Ubuntu (Compatible)', value: 'debian' }
          ],
          default: 'debian'
        },
        {
          type: 'confirm',
          name: 'aiContext',
          message: '🧠 Generate AI context file for shared Claude/Gemini/Copilot memory?',
          default: true
        }
      ]);

      // If Python project is selected, ask about ML libraries
      if (answers.projectType === 'python') {
        const mlPrompt = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'includeMl',
            message: '🤖 Install Machine Learning libraries? (NumPy, Pandas, Scikit-learn, etc.)',
            default: false
          }
        ]);
        answers.includeMl = mlPrompt.includeMl;
      }

      // If React project is selected, ask about backend
      if (answers.projectType === 'react') {
        const backendPrompt = await inquirer.prompt([
          {
            type: 'list',
            name: 'backend',
            message: '🔧 Select backend for your React app:',
            choices: [
              { name: '📦 Frontend Only (No backend)', value: 'none' },
              { name: '🚀 Express.js API', value: 'express' },
              { name: '⚡ Next.js (Full-stack)', value: 'nextjs' },
              { name: '🔥 Firebase Functions', value: 'firebase' },
              { name: '☁️  Serverless (Vercel/Netlify)', value: 'serverless' }
            ],
            default: 'none'
          }
        ]);
        answers.backend = backendPrompt.backend;
      }

      config = { ...options, ...answers };
    } else {
      config = {
        projectName: options.name || path.basename(process.cwd()),
        projectType: options.type || 'react',
        features: ['ai-cli', 'gcloud', 'github-cli', 'vscode-extensions'],
        baseImage: 'debian',
        cache: options.cache,
        here: options.here,
        includeMl: options.ml || false,  // Use --ml flag or default to false
        backend: options.backend || 'none',  // Use --backend flag or default to none
        aiContext: options.aiContext || false  // Use --ai-context flag or default to false
      };
    }

    await setupProject(config);
  });

program
  .command('install')
  .description('Install development tools in current environment')
  .option('--dry-run', 'Show what would be installed without executing')
  .option('--cache', 'Enable caching for faster installation (default: true)')
  .option('--no-cache', 'Disable caching and download fresh copies')
  .action(async (options) => {
    const spinner = ora('Installing development environment...').start();
    
    try {
      const scriptPath = path.join(__dirname, '..', 'universal-setup.sh');
      
      if (options.dryRun) {
        spinner.info('Dry run mode - would execute: ' + scriptPath);
        return;
      }

      execSync(`chmod +x "${scriptPath}"`, { stdio: 'inherit' });
      execSync(`"${scriptPath}"`, { stdio: 'inherit' });
      
      spinner.succeed('Development environment installed successfully!');
    } catch (error) {
      spinner.fail('Installation failed: ' + error.message);
      process.exit(1);
    }
  });

program
  .command('setup')
  .description('Setup development environment in existing project')
  .option('--dry-run', 'Show what would be installed without executing')
  .option('--cache', 'Enable caching for faster setup (default: true)')
  .option('--no-cache', 'Disable caching and download fresh copies')
  .action(async (options) => {
    const spinner = ora('Setting up development environment...').start();
    
    try {
      // First, download the latest universal-setup.sh script
      const scriptUrl = 'https://raw.githubusercontent.com/nhangen/universal-dev-env/main/universal-setup.sh';
      const useCache = options.cache !== false;
      
      spinner.text = 'Downloading latest setup script...';
      const scriptContent = await downloadWithCache(scriptUrl, 'universal-setup.sh', useCache);
      
      // Write the script to current directory
      const scriptPath = path.join(process.cwd(), 'universal-setup.sh');
      fs.writeFileSync(scriptPath, scriptContent);
      fs.chmodSync(scriptPath, 0o755);
      
      if (options.dryRun) {
        spinner.info('Dry run mode - would execute: ' + scriptPath);
        return;
      }

      spinner.text = 'Running setup script...';
      console.log(chalk.blue('\n🚀 Executing setup script...\n'));
      
      try {
        execSync(`bash "${scriptPath}"`, { stdio: 'inherit' });
        spinner.succeed('Development environment setup complete!');
        console.log(chalk.green('✅ All tools installed and configured'));
      } catch (scriptError) {
        spinner.fail('Setup script execution failed');
        console.log(chalk.red('❌ Script failed with error:', scriptError.message));
        console.log(chalk.yellow('💡 Try running manually: ./universal-setup.sh'));
        throw scriptError;
      }
    } catch (error) {
      spinner.fail('Setup failed: ' + error.message);
      console.log(chalk.yellow('💡 Try running manually:'));
      console.log(chalk.gray('   curl -fsSL https://raw.githubusercontent.com/nhangen/universal-dev-env/main/universal-setup.sh -o universal-setup.sh'));
      console.log(chalk.gray('   chmod +x universal-setup.sh'));
      console.log(chalk.gray('   ./universal-setup.sh'));
    }
  });

program
  .command('template <name>')
  .description('Create a new project from template')
  .option('-d, --directory <dir>', 'Target directory', '.')
  .action(async (templateName, options) => {
    const templates = ['react', 'node', 'python', 'full-stack'];
    
    if (!templates.includes(templateName)) {
      console.error(chalk.red(`❌ Template "${templateName}" not found.`));
      console.log(chalk.yellow('Available templates:', templates.join(', ')));
      process.exit(1);
    }

    const spinner = ora(`Creating ${templateName} project template...`).start();
    
    try {
      await createTemplate(templateName, options.directory);
      spinner.succeed(`${templateName} template created successfully!`);
    } catch (error) {
      spinner.fail('Template creation failed: ' + error.message);
      process.exit(1);
    }
  });

program
  .command('update')
  .alias('upgrade')
  .description('Update universal-dev-env to latest version')
  .action(async () => {
    const spinner = ora('Updating universal-dev-env...').start();
    
    try {
      execSync('npm install -g @nhangen/universal-dev-env@latest', { stdio: 'inherit' });
      spinner.succeed('Updated to latest version!');
    } catch (error) {
      spinner.fail('Update failed: ' + error.message);
    }
  });

// Configuration strategy selector
function selectConfigurationStrategy(config) {
  const strategy = {
    containerStrategy: 'devcontainer', // devcontainer, docker, docker-compose
    configFormat: 'json', // json, yaml
    deploymentStrategy: 'static', // static, containerized, serverless, hybrid
    environmentConfigs: ['development'], // development, staging, production
    additionalConfigs: []
  };

  // Determine container strategy based on project complexity
  if (config.projectType === 'react' && config.backend === 'express') {
    strategy.containerStrategy = 'docker-compose'; // Multi-service
    strategy.deploymentStrategy = 'containerized';
    strategy.environmentConfigs = ['development', 'staging', 'production'];
    strategy.installLocation = 'container'; // Install tools in container
  } else if (config.projectType === 'full-stack') {
    strategy.containerStrategy = 'docker-compose';
    strategy.deploymentStrategy = 'containerized';
    strategy.environmentConfigs = ['development', 'staging', 'production'];
    strategy.installLocation = 'container';
  } else if (config.projectType === 'react' && ['firebase', 'serverless'].includes(config.backend)) {
    strategy.containerStrategy = 'devcontainer'; // Development only
    strategy.deploymentStrategy = 'serverless';
    strategy.configFormat = 'yaml'; // Serverless often uses YAML
    strategy.installLocation = 'host'; // CLI tools needed on host for deployment
  } else if (config.projectType === 'react' && config.backend === 'nextjs') {
    strategy.containerStrategy = 'docker'; // Single service
    strategy.deploymentStrategy = 'hybrid'; // Can be static or containerized
    strategy.installLocation = 'container';
  } else if (config.projectType === 'python') {
    strategy.containerStrategy = 'docker';
    strategy.deploymentStrategy = 'containerized';
    strategy.configFormat = 'yaml'; // Python ecosystem often uses YAML
    strategy.installLocation = 'container';
  } else {
    strategy.containerStrategy = 'devcontainer';
    strategy.deploymentStrategy = 'static';
    strategy.installLocation = 'host'; // Simple projects use host tools
  }

  // Determine which tools should be included based on strategy
  strategy.includeTools = {
    essentials: true, // Always include: Node.js, Python, Git, Docker
    aiClis: strategy.installLocation === 'host', // Claude, Gemini - only on host
    cloudClis: strategy.deploymentStrategy === 'serverless' || strategy.installLocation === 'host', // gcloud, gh
    heavyTools: strategy.installLocation === 'host' // Playwright, browsers
  };

  // Add additional configs based on features
  if (config.features && config.features.includes('playwright')) {
    strategy.additionalConfigs.push('playwright');
  }
  
  if (config.includeMl) {
    strategy.additionalConfigs.push('jupyter', 'conda');
  }

  return strategy;
}

// Create container configurations based on selected strategy
async function createContainerConfigurations(config) {
  const strategy = config.strategy;
  
  switch (strategy.containerStrategy) {
    case 'devcontainer':
      await createDevcontainerConfig(config);
      break;
      
    case 'docker':
      await createDockerConfig(config);
      await createDevcontainerConfig(config); // Still create devcontainer for development
      break;
      
    case 'docker-compose':
      await createDockerComposeConfig(config);
      await createDevcontainerConfig(config); // DevContainer can use docker-compose
      break;
  }
  
  // Create environment-specific configurations
  await createEnvironmentConfigs(config);
}

async function createDevcontainerConfig(config) {
  if (!fs.existsSync('.devcontainer')) {
    fs.mkdirSync('.devcontainer');
  }
  
  const devcontainerConfig = generateDevcontainerConfig(config);
  const filename = config.strategy.configFormat === 'yaml' ? 'devcontainer.yml' : 'devcontainer.json';
  
  if (config.strategy.configFormat === 'yaml') {
    // Convert to YAML format (for demonstration, keeping JSON for now)
    fs.writeFileSync(`.devcontainer/${filename}`, JSON.stringify(devcontainerConfig, null, 2));
  } else {
    fs.writeFileSync(`.devcontainer/${filename}`, JSON.stringify(devcontainerConfig, null, 2));
  }
}

async function createDockerConfig(config) {
  const dockerfileContent = generateDockerfile(config);
  fs.writeFileSync('Dockerfile', dockerfileContent);
  
  // Create .dockerignore
  const dockerignoreContent = generateDockerignore(config);
  fs.writeFileSync('.dockerignore', dockerignoreContent);
}

async function createDockerComposeConfig(config) {
  const dockerComposeContent = generateDockerCompose(config);
  const filename = config.strategy.configFormat === 'yaml' ? 'docker-compose.yml' : 'docker-compose.json';
  
  if (config.strategy.configFormat === 'yaml') {
    fs.writeFileSync(filename, dockerComposeContent);
  } else {
    // Convert YAML to JSON format if needed
    fs.writeFileSync(filename, dockerComposeContent);
  }
  
  // Also create individual Dockerfiles for services
  await createDockerConfig(config);
}

async function createEnvironmentConfigs(config) {
  const strategy = config.strategy;
  
  for (const env of strategy.environmentConfigs) {
    const envConfig = generateEnvironmentConfig(config, env);
    const filename = `.env.${env}`;
    fs.writeFileSync(filename, envConfig);
  }
  
  // Create environment-specific deployment configs
  if (strategy.deploymentStrategy === 'containerized') {
    await createKubernetesConfigs(config);
  }
}

function generateDockerfile(config) {
  const backend = config.backend || 'none';
  const strategy = config.strategy || {};
  const includeTools = strategy.includeTools || {};
  
  if (config.projectType === 'react' && backend === 'nextjs') {
    return `# Next.js Production Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
`;
  } else if (config.projectType === 'python') {
    // Python containers are typically lightweight for production
    const mlPackages = config.includeMl && includeTools.heavyTools ? `
# ML libraries (only if needed and heavy tools allowed)
RUN pip install --no-cache-dir numpy pandas scikit-learn matplotlib seaborn jupyter` : '';
    
    return `# Python Application Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install only essential system dependencies
RUN apt-get update && apt-get install -y \\
    build-essential \\
    curl \\
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt${mlPackages}

# Copy application code
COPY . .

# Create non-root user
RUN useradd --create-home --shell /bin/bash app
RUN chown -R app:app /app
USER app

EXPOSE 8000

CMD ["python", "main.py"]
`;
  } else {
    // Generic Node.js Dockerfile - lightweight for containers
    return `# Node.js Application Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S app -u 1001
RUN chown -R app:nodejs /app
USER app

EXPOSE 3000

CMD ["npm", "start"]
`;
  }
}

function generateDockerignore(config) {
  return `node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
.DS_Store
.vscode
.devcontainer
Dockerfile
.dockerignore
${config.projectType === 'python' ? '__pycache__\n*.pyc\nvenv/\n.pytest_cache/' : ''}
`;
}

function generateDockerCompose(config) {
  const backend = config.backend || 'none';
  
  if (config.projectType === 'react' && backend === 'express') {
    return `version: '3.8'

services:
  client:
    build:
      context: ./client
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - REACT_APP_API_URL=http://localhost:3001
    volumes:
      - ./client:/app
      - /app/node_modules
    depends_on:
      - server

  server:
    build:
      context: ./server
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://user:password@db:5432/myapp
    volumes:
      - ./server:/app
      - /app/node_modules
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=myapp
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
`;
  } else if (config.projectType === 'full-stack') {
    return `version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
    volumes:
      - ./frontend:/app
      - /app/node_modules

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
    volumes:
      - ./backend:/app
      - /app/node_modules

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
`;
  } else {
    return `version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
    volumes:
      - .:/app
      - /app/node_modules
`;
  }
}

function generateEnvironmentConfig(config, environment) {
  const baseConfig = `# ${environment.toUpperCase()} Environment Configuration
NODE_ENV=${environment}
`;

  const backend = config.backend || 'none';
  
  if (config.projectType === 'react' && backend === 'express') {
    return baseConfig + `
# API Configuration
API_URL=${environment === 'production' ? 'https://your-api.com' : 'http://localhost:3001'}
REACT_APP_API_URL=${environment === 'production' ? 'https://your-api.com' : 'http://localhost:3001'}

# Database Configuration
DATABASE_URL=${environment === 'production' ? 'postgresql://user:password@prod-db:5432/myapp' : 'postgresql://user:password@localhost:5432/myapp'}

# Security
JWT_SECRET=${environment === 'production' ? 'your-production-secret' : 'your-development-secret'}
`;
  } else if (config.projectType === 'python') {
    return baseConfig + `
# Python Configuration
DEBUG=${environment === 'development' ? 'True' : 'False'}
SECRET_KEY=${environment === 'production' ? 'your-production-secret-key' : 'your-development-secret-key'}

# Database
DATABASE_URL=${environment === 'production' ? 'postgresql://user:password@prod-db:5432/myapp' : 'sqlite:///./dev.db'}
`;
  } else {
    return baseConfig + `
# Application Configuration
PORT=${environment === 'production' ? '80' : '3000'}
`;
  }
}

async function createKubernetesConfigs(config) {
  if (!fs.existsSync('k8s')) {
    fs.mkdirSync('k8s');
  }
  
  // Create basic Kubernetes deployment
  const k8sDeployment = generateKubernetesDeployment(config);
  fs.writeFileSync('k8s/deployment.yaml', k8sDeployment);
  
  // Create service
  const k8sService = generateKubernetesService(config);
  fs.writeFileSync('k8s/service.yaml', k8sService);
}

function generateKubernetesDeployment(config) {
  return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${config.projectName.toLowerCase().replace(/\s+/g, '-')}
  labels:
    app: ${config.projectName.toLowerCase().replace(/\s+/g, '-')}
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ${config.projectName.toLowerCase().replace(/\s+/g, '-')}
  template:
    metadata:
      labels:
        app: ${config.projectName.toLowerCase().replace(/\s+/g, '-')}
    spec:
      containers:
      - name: app
        image: ${config.projectName.toLowerCase().replace(/\s+/g, '-')}:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
`;
}

function generateKubernetesService(config) {
  return `apiVersion: v1
kind: Service
metadata:
  name: ${config.projectName.toLowerCase().replace(/\s+/g, '-')}-service
spec:
  selector:
    app: ${config.projectName.toLowerCase().replace(/\s+/g, '-')}
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: LoadBalancer
`;
}

async function installAICLITools(config) {
  const packageManager = getPackageManager();
  
  try {
    // Install Claude CLI
    console.log(chalk.blue('Installing Claude CLI...'));
    if (isMacOS()) {
      try {
        execSync('brew install claude-ai/tap/claude', { stdio: 'inherit' });
        console.log(chalk.green('✓ Claude CLI installed'));
      } catch (error) {
        console.log(chalk.yellow('⚠ Claude CLI installation failed - install manually: https://claude.ai/cli'));
      }
    } else if (isLinux()) {
      try {
        // Install via npm for Linux
        execSync('npm install -g @anthropic-ai/claude-cli', { stdio: 'inherit' });
        console.log(chalk.green('✓ Claude CLI installed'));
      } catch (error) {
        console.log(chalk.yellow('⚠ Claude CLI installation failed - install manually: https://claude.ai/cli'));
      }
    } else if (isWindows()) {
      console.log(chalk.yellow('⚠ Install Claude CLI manually on Windows: https://claude.ai/cli'));
    }

    // Install Gemini CLI  
    console.log(chalk.blue('Installing Gemini CLI...'));
    if (isMacOS()) {
      try {
        execSync('brew install google-cloud-sdk', { stdio: 'inherit' });
        execSync('gcloud components install gemini', { stdio: 'inherit' });
        console.log(chalk.green('✓ Gemini CLI installed'));
      } catch (error) {
        console.log(chalk.yellow('⚠ Gemini CLI installation failed - install manually: https://cloud.google.com/sdk/docs/install'));
      }
    } else if (isLinux()) {
      console.log(chalk.yellow('⚠ Install Google Cloud SDK + Gemini manually: https://cloud.google.com/sdk/docs/install'));
    } else if (isWindows()) {
      console.log(chalk.yellow('⚠ Install Google Cloud SDK + Gemini manually: https://cloud.google.com/sdk/docs/install'));
    }

    // Prompt for authentication
    console.log(chalk.cyan('\n🔐 Authentication Setup:'));
    console.log(chalk.gray('After setup completes, run:'));
    console.log(chalk.white('  claude auth login'));
    console.log(chalk.white('  gcloud auth login'));
    console.log(chalk.gray('These commands will open your browser for authentication.'));
    
  } catch (error) {
    console.log(chalk.red('CLI installation encountered errors:', error.message));
  }
}

async function setupProject(config) {
  const spinner = ora('Setting up project...').start();
  const useCache = config.cache !== false; // Default to true unless explicitly disabled
  
  // Select configuration strategy
  const strategy = selectConfigurationStrategy(config);
  config.strategy = strategy;
  
  if (useCache) {
    spinner.text = `Setting up project (cache enabled, ${strategy.containerStrategy} strategy)...`;
  }
  
  try {
    // Create basic project structure or use current directory
    if (config.here) {
      // Use current directory
      config.projectName = path.basename(process.cwd());
      spinner.text = `Setting up project in current directory (${config.projectName})...`;
    } else {
      // Create subdirectory
      if (!fs.existsSync(config.projectName)) {
        fs.mkdirSync(config.projectName, { recursive: true });
      }
      process.chdir(config.projectName);
    }
    
    // Download latest universal setup files
    const universalFiles = [
      { name: 'universal-setup.sh', url: 'https://raw.githubusercontent.com/nhangen/universal-dev-env/main/universal-setup.sh' },
      { name: 'Dockerfile.universal', url: 'https://raw.githubusercontent.com/nhangen/universal-dev-env/main/Dockerfile.universal' },
      { name: 'devcontainer.universal.json', url: 'https://raw.githubusercontent.com/nhangen/universal-dev-env/main/devcontainer.universal.json' }
    ];
    
    for (const file of universalFiles) {
      try {
        spinner.text = `Downloading ${file.name}...`;
        const content = await downloadWithCache(file.url, file.name, useCache);
        const destPath = path.join(process.cwd(), file.name);
        fs.writeFileSync(destPath, content);
        
        if (file.name.endsWith('.sh')) {
          fs.chmodSync(destPath, 0o755);
        }
      } catch (error) {
        // Fallback to local copy if available
        const srcPath = path.join(__dirname, '..', file.name);
        const destPath = path.join(process.cwd(), file.name);
        
        if (fs.existsSync(srcPath)) {
          fs.copyFileSync(srcPath, destPath);
          if (file.name.endsWith('.sh')) {
            fs.chmodSync(destPath, 0o755);
          }
        }
      }
    }
    
    // Create container configurations based on strategy
    await createContainerConfigurations(config);
    
    // Create project-specific files based on type
    await createProjectFiles(config);
    
    // Create package.json if it doesn't exist
    if (!fs.existsSync('package.json')) {
      const packageJson = generatePackageJson(config);
      fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
    }
    
    // Create README
    const readme = generateReadme(config);
    fs.writeFileSync('README.md', readme);
    
    // Install AI CLI tools if selected
    if (config.features && config.features.includes('ai-cli')) {
      spinner.text = 'Installing AI CLI tools...';
      await installAICLITools(config);
    }
    
    // Create AI context file if requested
    if (config.aiContext) {
      if (!fs.existsSync('.ai')) {
        fs.mkdirSync('.ai');
      }
      const aiContext = generateAIContext(config);
      fs.writeFileSync('.ai/context.md', aiContext);
      
      // Create additional AI context files
      const recentWork = generateRecentWork(config);
      fs.writeFileSync('.ai/recent-work.md', recentWork);
      
      const preferences = generatePreferences(config);
      fs.writeFileSync('.ai/preferences.md', preferences);
    }
    
    spinner.succeed(`Project "${config.projectName}" created successfully!`);
    
    console.log(chalk.green.bold('\\n🎉 Setup Complete!'));
    console.log(chalk.yellow('Next steps:'));
    console.log(chalk.gray(`  1. cd ${config.projectName}`));
    console.log(chalk.gray('  2. Open in VS Code with Dev Containers extension'));
    console.log(chalk.gray('  3. Run ./universal-setup.sh to install tools'));
    console.log(chalk.gray('  4. Start coding! 🚀'));
    
  } catch (error) {
    spinner.fail('Setup failed: ' + error.message);
    throw error;
  }
}

function generateDevcontainerConfig(config) {
  const base = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'devcontainer.universal.json'), 'utf8'));
  const strategy = config.strategy;
  const includeTools = strategy.includeTools || {};
  
  // Customize based on project type and strategy
  base.name = `${config.projectName} Dev Environment`;
  
  // Configure container setup based on strategy
  if (strategy.containerStrategy === 'docker-compose') {
    base.dockerComposeFile = 'docker-compose.yml';
    base.service = 'app'; // Primary service for development
    base.workspaceFolder = '/app';
    delete base.build; // Remove build config when using docker-compose
  } else if (strategy.containerStrategy === 'docker') {
    base.build = {
      dockerfile: 'Dockerfile',
      context: '.'
    };
  }
  
  // Only include heavy features in DevContainer (not production containers)
  if (strategy.containerStrategy === 'devcontainer') {
    // DevContainer gets all tools since it's development-only
    base.features = base.features || {};
    
    if (includeTools.cloudClis) {
      base.features["ghcr.io/devcontainers/features/github-cli:1"] = {};
      base.features["ghcr.io/devcontainers/features/google-cloud-cli:1"] = {};
    }
    
    if (includeTools.heavyTools && config.features && config.features.includes('playwright')) {
      base.features["ghcr.io/devcontainers/features/playwright:1"] = {};
    }
  } else {
    // Production containers: remove heavy features
    base.features = {
      "ghcr.io/devcontainers/features/node:1": {},
      "ghcr.io/devcontainers/features/git:1": {}
    };
    
    if (config.projectType === 'python') {
      base.features["ghcr.io/devcontainers/features/python:1"] = {};
    }
  }
  
  if (config.projectType === 'react') {
    const backend = config.backend || 'none';
    
    // Update port forwarding based on backend
    if (backend === 'express') {
      base.forwardPorts = [3000, 3001, 5432]; // Client, server, and database ports
      base.portsAttributes = {
        "3000": { "label": "React Client" },
        "3001": { "label": "Express Server" },
        "5432": { "label": "PostgreSQL Database" }
      };
      
      if (strategy.containerStrategy === 'docker-compose') {
        base.service = 'client'; // Use client service for development
      }
    } else if (backend === 'nextjs') {
      base.forwardPorts = [3000];
      base.portsAttributes = {
        "3000": { "label": "Next.js App" }
      };
    } else if (backend === 'firebase') {
      base.forwardPorts = [3000, 5001, 9099]; // React, Firebase emulator ports
      base.portsAttributes = {
        "3000": { "label": "React App" },
        "5001": { "label": "Firebase Functions" },
        "9099": { "label": "Firebase Auth" }
      };
    } else {
      base.forwardPorts = [3000];
      base.portsAttributes = {
        "3000": { "label": "React App" }
      };
    }
    
    // Add React-specific extensions
    base.customizations.vscode.extensions.push(
      'ES7+ React/Redux/React-Native snippets',
      'Auto Rename Tag',
      'Bracket Pair Colorizer'
    );
  }
  
  if (config.projectType === 'python') {
    base.customizations.vscode.extensions.push(
      'ms-python.python',
      'ms-python.pylint',
      'ms-python.black-formatter'
    );
    
    if (config.includeMl) {
      base.customizations.vscode.extensions.push(
        'ms-toolsai.jupyter',
        'ms-python.vscode-pylance'
      );
    }
  }
  
  if (config.features && config.features.includes('playwright')) {
    base.containerEnv.PLAYWRIGHT_BROWSERS_PATH = '/usr/bin';
    base.containerEnv.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = '/usr/bin/chromium';
  }
  
  // Add environment-specific settings
  if (strategy.environmentConfigs.length > 1) {
    base.containerEnv.NODE_ENV = 'development';
  }
  
  // Add AI context persistence if enabled
  if (config.aiContext) {
    // Add volume mounts for AI tool persistence
    base.mounts = base.mounts || [];
    base.mounts.push(
      "source=${localEnv:HOME}${localEnv:USERPROFILE}/.config/claude-code,target=/home/vscode/.config/claude-code,type=bind",
      "source=${localEnv:HOME}${localEnv:USERPROFILE}/.config/gemini,target=/home/vscode/.config/gemini,type=bind"
    );
    
    // Add container environment variables for AI context
    base.containerEnv = base.containerEnv || {};
    base.containerEnv.AI_CONTEXT_DIR = "/workspace/.ai";
    base.containerEnv.AI_CONTEXT_FILE = "/workspace/.ai/context.md";
    
    // Add post-create command to display AI context info
    base.postCreateCommand = base.postCreateCommand || "";
    base.postCreateCommand += " && echo '🧠 AI Context created: .ai/ folder with context.md' && echo '📋 Claude/Gemini settings will persist across container rebuilds'";
  }
  
  return base;
}

function generatePackageJson(config) {
  const base = {
    name: config.projectName.toLowerCase().replace(/\s+/g, '-'),
    version: '1.0.0',
    private: true,
    scripts: {}
  };
  
  switch (config.projectType) {
    case 'react':
      const backend = config.backend || 'none';
      
      if (backend === 'nextjs') {
        base.scripts = {
          dev: 'next dev',
          build: 'next build',
          start: 'next start',
          lint: 'next lint'
        };
        base.dependencies = {
          next: '^14.0.0',
          react: '^18.2.0',
          'react-dom': '^18.2.0'
        };
        base.devDependencies = {
          eslint: '^8.0.0',
          'eslint-config-next': '^14.0.0'
        };
      } else if (backend === 'express') {
        base.scripts = {
          dev: 'concurrently "npm run server" "npm run client"',
          server: 'cd server && nodemon index.js',
          client: 'cd client && npm start',
          build: 'cd client && npm run build',
          start: 'cd server && node index.js',
          'install-deps': 'npm install && cd client && npm install && cd ../server && npm install'
        };
        base.dependencies = {
          concurrently: '^8.0.0'
        };
        base.devDependencies = {
          nodemon: '^3.0.0'
        };
      } else if (backend === 'firebase') {
        base.scripts = {
          start: 'react-scripts start',
          build: 'react-scripts build',
          test: 'react-scripts test',
          dev: 'npm start',
          'firebase:serve': 'firebase emulators:start',
          'firebase:deploy': 'npm run build && firebase deploy'
        };
        base.dependencies = {
          react: '^18.2.0',
          'react-dom': '^18.2.0',
          'react-scripts': '5.0.1',
          firebase: '^10.0.0'
        };
        base.devDependencies = {
          'firebase-tools': '^12.0.0'
        };
      } else if (backend === 'serverless') {
        base.scripts = {
          start: 'react-scripts start',
          build: 'react-scripts build',
          test: 'react-scripts test',
          dev: 'npm start',
          'vercel:dev': 'vercel dev',
          'vercel:deploy': 'npm run build && vercel --prod'
        };
        base.dependencies = {
          react: '^18.2.0',
          'react-dom': '^18.2.0',
          'react-scripts': '5.0.1'
        };
        base.devDependencies = {
          vercel: '^32.0.0'
        };
      } else {
        // Frontend-only React
        base.scripts = {
          start: 'react-scripts start',
          build: 'react-scripts build',
          test: 'react-scripts test',
          dev: 'npm start'
        };
        base.dependencies = {
          react: '^18.2.0',
          'react-dom': '^18.2.0',
          'react-scripts': '5.0.1'
        };
      }
      break;
      
    case 'node':
      base.scripts = {
        start: 'node server.js',
        dev: 'nodemon server.js',
        test: 'jest'
      };
      base.dependencies = {
        express: '^4.18.0'
      };
      base.devDependencies = {
        nodemon: '^3.0.0'
      };
      break;
      
    case 'full-stack':
      base.scripts = {
        start: 'npm run server',
        dev: 'concurrently "npm run server" "npm run client"',
        server: 'node backend/server.js',
        client: 'cd frontend && npm start',
        build: 'cd frontend && npm run build'
      };
      base.dependencies = {
        express: '^4.18.0',
        concurrently: '^8.0.0'
      };
      break;
  }
  
  return base;
}

function generateReadme(config) {
  const strategy = config.strategy || {};
  const backend = config.backend || 'none';
  
  let containerSection = '';
  let deploymentSection = '';
  let projectStructure = '';
  
  // Generate container-specific documentation
  if (strategy.containerStrategy === 'docker-compose') {
    containerSection = `### Docker Compose (Multi-Service)
1. **Development**: \`docker-compose up\`
2. **VS Code**: Open in DevContainer (uses docker-compose)
3. **Production**: \`docker-compose -f docker-compose.prod.yml up\`

Services:
- **Client**: React frontend (port 3000)
- **Server**: Express API (port 3001)
- **Database**: PostgreSQL (port 5432)`;

    projectStructure = `\`\`\`
${config.projectName}/
├── .devcontainer/          # VS Code dev container configuration
├── client/                 # React frontend
│   ├── src/
│   ├── package.json
│   └── Dockerfile
├── server/                 # Express backend
│   ├── index.js
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml      # Multi-service container config
├── .env.development        # Development environment variables
├── .env.staging           # Staging environment variables
├── .env.production        # Production environment variables
└── k8s/                   # Kubernetes deployment configs
\`\`\``;
  } else if (strategy.containerStrategy === 'docker') {
    containerSection = `### Docker (Single Service)
1. **Development**: \`docker build -t ${config.projectName.toLowerCase()} . && docker run -p 3000:3000 ${config.projectName.toLowerCase()}\`
2. **VS Code**: Open in DevContainer
3. **Production**: Uses optimized multi-stage build`;

    projectStructure = `\`\`\`
${config.projectName}/
├── .devcontainer/          # VS Code dev container configuration
├── src/                    # Application source code
├── Dockerfile             # Production-ready container config
├── .dockerignore          # Docker build exclusions
├── .env.development       # Development environment variables
└── k8s/                   # Kubernetes deployment configs
\`\`\``;
  } else {
    containerSection = `### DevContainer Only
1. **VS Code**: Open in DevContainer (recommended)
2. **Local**: Run \`npm install && npm run dev\`
3. **Deploy**: Platform-specific (${strategy.deploymentStrategy})`;

    projectStructure = `\`\`\`
${config.projectName}/
├── .devcontainer/          # VS Code dev container configuration
├── src/                    # Application source code
├── universal-setup.sh      # Environment setup script
└── ${backend === 'firebase' ? 'firebase.json' : backend === 'serverless' ? 'vercel.json' : 'package.json'}
\`\`\``;
  }

  // Generate deployment-specific documentation
  if (strategy.deploymentStrategy === 'containerized') {
    deploymentSection = `
## 🚀 Deployment (Containerized)

### Kubernetes
\`\`\`bash
kubectl apply -f k8s/
\`\`\`

### Docker
\`\`\`bash
docker build -t ${config.projectName.toLowerCase()} .
docker run -p 3000:3000 ${config.projectName.toLowerCase()}
\`\`\``;
  } else if (strategy.deploymentStrategy === 'serverless') {
    deploymentSection = `
## 🚀 Deployment (Serverless)

### ${backend === 'firebase' ? 'Firebase' : 'Vercel/Netlify'}
\`\`\`bash
${backend === 'firebase' ? 'npm run firebase:deploy' : 'npm run vercel:deploy'}
\`\`\``;
  } else if (strategy.deploymentStrategy === 'static') {
    deploymentSection = `
## 🚀 Deployment (Static)

### Build and Deploy
\`\`\`bash
npm run build
# Deploy build/ folder to your hosting provider
\`\`\``;
  }

  return `# ${config.projectName}

${config.projectType.charAt(0).toUpperCase() + config.projectType.slice(1)} project with universal development environment.
${backend !== 'none' ? `**Backend**: ${backend.charAt(0).toUpperCase() + backend.slice(1)}` : ''}
**Container Strategy**: ${strategy.containerStrategy || 'devcontainer'}
**Deployment Strategy**: ${strategy.deploymentStrategy || 'static'}
**Tool Installation**: ${strategy.installLocation || 'host'} (${strategy.includeTools?.aiClis ? 'includes AI/Cloud CLIs' : 'lightweight setup'})

## 🚀 Quick Start

${containerSection}

### Manual Setup
1. Run the setup script:
   \`\`\`bash
   ./universal-setup.sh
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   ${strategy.containerStrategy === 'docker-compose' ? 'npm run install-deps' : 'npm install'}
   \`\`\`

3. Start development:
   \`\`\`bash
   npm run dev
   \`\`\`

## 🛠️ Available Tools

### Essential Tools (Always Included)
- **Node.js & npm**: JavaScript runtime and package manager
- **Git**: Version control system
- **Docker**: Container platform (when using containers)
${config.projectType === 'python' ? '- **Python**: Python runtime and pip package manager' : ''}

### Context-Aware Tool Installation
The system intelligently includes tools based on your project setup:

${strategy.includeTools?.aiClis ? `
#### AI & Cloud CLI Tools (Host Installation)
- **Claude CLI**: \`claude\` - AI-powered development assistant
- **Gemini CLI**: \`gemini\` - Google's AI CLI tool` : ''}

${strategy.includeTools?.cloudClis ? `
#### Cloud & Deployment Tools
- **GitHub CLI**: \`gh\` - GitHub command line interface
- **Google Cloud CLI**: \`gcloud\` - Cloud deployment and management` : ''}

${strategy.includeTools?.heavyTools ? `
#### Development Tools (Development Only)
- **Playwright**: Web automation and testing
- **Browser runtimes**: Chromium, Firefox` : ''}

${!strategy.includeTools?.aiClis ? `
#### Lightweight Container Setup
This project uses a **lightweight container configuration** that excludes heavy CLI tools to optimize:
- **Container size**: Faster builds and deployments
- **Security**: Minimal attack surface
- **Performance**: Reduced memory and CPU usage

*Heavy tools like Claude CLI, Google Cloud CLI are installed on the host system instead.*` : ''}

## 📦 Project Structure

${projectStructure}

## 🌍 Environment Configuration

This project uses environment-specific configurations:

${strategy.environmentConfigs && strategy.environmentConfigs.length > 1 ? 
  strategy.environmentConfigs.map(env => `- **${env}**: \`.env.${env}\``).join('\n') :
  '- **development**: Local development settings'
}
${deploymentSection}

## 🔧 Container Configuration

Edit container settings:
- **DevContainer**: \`.devcontainer/devcontainer.json\`
${strategy.containerStrategy === 'docker-compose' ? '- **Docker Compose**: `docker-compose.yml`' : ''}
${strategy.containerStrategy === 'docker' ? '- **Dockerfile**: `Dockerfile`' : ''}

## 📚 Documentation

For more information, see the [Universal Dev Environment documentation](https://github.com/nhangen/universal-dev-env).

---

Generated with Universal Dev Environment v${packageJson.version}
**Configuration**: ${JSON.stringify(strategy, null, 2)}
`;
}

function generateAIContext(config) {
  const strategy = config.strategy || {};
  const backend = config.backend || 'none';
  const timestamp = new Date().toISOString().split('T')[0];
  
  return `# AI Context for ${config.projectName}

> **🤖 AI Assistant Instructions**: Please read this entire file before responding to any questions about this project. This provides essential context for maintaining consistency across Claude, Gemini, and GitHub Copilot.
> 
> **Additional Context Files**:
> - \`.ai/recent-work.md\` - Latest development sessions and changes
> - \`.ai/preferences.md\` - Coding patterns and project preferences

## 📋 Project Overview

**Project**: ${config.projectName}
**Type**: ${config.projectType.charAt(0).toUpperCase() + config.projectType.slice(1)}
${backend !== 'none' ? `**Backend**: ${backend.charAt(0).toUpperCase() + backend.slice(1)}` : ''}
**Container Strategy**: ${strategy.containerStrategy || 'devcontainer'}
**Deployment Strategy**: ${strategy.deploymentStrategy || 'static'}
**Tool Installation**: ${strategy.installLocation || 'host'} (${strategy.includeTools?.aiClis ? 'includes AI/Cloud CLIs' : 'lightweight setup'})
**Created**: ${timestamp}

## 🚀 Quick Start Prompt

**Use this when starting new conversations:**
"This is a ${config.projectType}${backend !== 'none' ? ` + ${backend}` : ''} project using ${strategy.containerStrategy || 'devcontainer'} strategy. ${strategy.includeTools?.aiClis ? 'Full AI/Cloud tooling available.' : 'Lightweight container setup excludes heavy CLI tools.'} Current focus: ${backend === 'express' ? 'Full-stack development with React frontend and Express backend.' : backend === 'nextjs' ? 'Next.js full-stack development.' : backend === 'firebase' ? 'Serverless development with Firebase Functions.' : 'Frontend development.'}"

## 🏗️ Architecture & Setup

### Container Configuration
- **Strategy**: ${strategy.containerStrategy || 'devcontainer'}
- **Environment Configs**: ${strategy.environmentConfigs ? strategy.environmentConfigs.join(', ') : 'development'}
- **Port Forwarding**: ${backend === 'express' ? 'Client (3000), Server (3001), Database (5432)' : backend === 'nextjs' ? 'App (3000)' : backend === 'firebase' ? 'App (3000), Functions (5001), Auth (9099)' : 'App (3000)'}

### Development Tools
${strategy.includeTools?.aiClis ? `
#### AI & Cloud Tools (Host Installation)
- Claude CLI, Gemini CLI available on host
- GitHub CLI, Google Cloud CLI for deployment` : ''}
${strategy.includeTools?.heavyTools ? `
#### Heavy Development Tools
- Playwright for web automation
- Browser runtimes included` : ''}

${!strategy.includeTools?.aiClis ? `
#### Lightweight Container Setup
**Note**: This project uses lightweight containers that exclude heavy CLI tools to optimize:
- Container size (50-80% reduction)
- Build/deployment speed
- Security (minimal attack surface)

*Heavy tools like Claude CLI, Google Cloud CLI are on the host system, not in containers.*` : ''}

## 🔧 Technical Stack

**Frontend**: ${config.projectType === 'react' ? 'React 18.2.0' : config.projectType === 'node' ? 'Node.js Server' : config.projectType === 'python' ? 'Python 3.11' : 'Web Application'}
${backend === 'express' ? '**Backend**: Express.js 4.18.0 with PostgreSQL database' : ''}
${backend === 'nextjs' ? '**Framework**: Next.js 14.0.0 (full-stack)' : ''}
${backend === 'firebase' ? '**Backend**: Firebase Functions with Firestore' : ''}
${backend === 'serverless' ? '**Functions**: Vercel/Netlify Edge Functions' : ''}
${config.includeMl ? '**ML Libraries**: NumPy, Pandas, Scikit-learn, Jupyter' : ''}

### File Structure
\`\`\`
${config.projectName}/
${backend === 'express' ? `├── client/                 # React frontend
│   ├── src/
│   ├── package.json
│   └── Dockerfile          # (if using docker-compose)
├── server/                 # Express backend
│   ├── index.js
│   ├── package.json
│   └── Dockerfile          # (if using docker-compose)
├── docker-compose.yml      # Multi-service setup` : 
  backend === 'nextjs' ? `├── pages/                  # Next.js pages
│   ├── index.js
│   └── api/               # API routes
├── Dockerfile             # Production build` :
  backend === 'firebase' ? `├── src/                    # React frontend
├── functions/             # Firebase Functions
│   ├── index.js
│   └── package.json
├── firebase.json          # Firebase config` : `├── src/                    # Application code`}
├── .devcontainer/         # VS Code dev container config
${strategy.environmentConfigs && strategy.environmentConfigs.length > 1 ? 
  strategy.environmentConfigs.map(env => `├── .env.${env}             # ${env.charAt(0).toUpperCase() + env.slice(1)} environment`).join('\n') :
  '├── .env                   # Environment variables'
}
${strategy.deploymentStrategy === 'containerized' ? '└── k8s/                   # Kubernetes configs' : ''}
\`\`\`

## 💻 Development Commands

**Start Development:**
\`\`\`bash
${strategy.containerStrategy === 'docker-compose' ? 'docker-compose up' : 
  strategy.containerStrategy === 'docker' ? 'docker build -t ' + config.projectName.toLowerCase() + ' . && docker run -p 3000:3000 ' + config.projectName.toLowerCase() :
  'npm run dev'}
\`\`\`

**VS Code DevContainer:**
1. Open project in VS Code
2. Install "Dev Containers" extension  
3. Click "Reopen in Container"
4. Container will auto-configure

**Installation:**
\`\`\`bash
${backend === 'express' ? 'npm run install-deps  # Installs client, server, and root dependencies' : 'npm install'}
\`\`\`

## 🧠 AI Tool Persistence Instructions

### Claude CLI Persistence
**Settings Location**: \`~/.config/claude-code/settings.local.json\`
**Container Mount**: Ensure this path is mounted as volume in DevContainer
**Authentication**: Re-authenticate if settings don't persist: \`claude auth login\`

### Gemini CLI Persistence  
**Settings Location**: \`~/.config/gemini/settings.json\`
**State File**: \`~/.config/gemini/state_snapshot.xml\`
**Container Mount**: Both files need volume mounting for persistence
**Authentication**: Check \`gemini auth status\` if login is lost

### GitHub Copilot Persistence
**VS Code Settings**: Automatically persists via VS Code settings sync
**Authentication**: Uses VS Code's GitHub authentication (should persist)

### DevContainer Volume Mounts
**Add to .devcontainer/devcontainer.json:**
\`\`\`json
{
  "mounts": [
    "source=\${localEnv:HOME}\${localEnv:USERPROFILE}/.config/claude-code,target=/home/vscode/.config/claude-code,type=bind",
    "source=\${localEnv:HOME}\${localEnv:USERPROFILE}/.config/gemini,target=/home/vscode/.config/gemini,type=bind"
  ]
}
\`\`\`

## 📝 Recent Decisions & Context

### Container Strategy Decision
- **Chosen**: ${strategy.containerStrategy || 'devcontainer'} for ${strategy.containerStrategy === 'docker-compose' ? 'multi-service architecture' : strategy.containerStrategy === 'docker' ? 'single-service optimization' : 'development simplicity'}
- **Reasoning**: ${strategy.containerStrategy === 'docker-compose' ? 'Complex multi-service setup requires orchestration' : strategy.containerStrategy === 'docker' ? 'Single service benefits from optimized production builds' : 'Simple projects work best with development-focused containers'}

### Tool Installation Strategy
- **Heavy Tools**: ${strategy.includeTools?.aiClis ? 'Included on host for full development experience' : 'Excluded from containers for performance (installed on host instead)'}
- **Impact**: ${strategy.includeTools?.aiClis ? 'Rich development environment with all AI/Cloud tools' : '50-80% smaller containers, faster builds, better security'}

${config.includeMl ? `
### ML Library Integration
- **Approach**: Conda environment with optimized ML package installation
- **Libraries**: NumPy, Pandas, Scikit-learn, Jupyter for data science workflow
- **Environment**: Separate conda environment for project isolation
` : ''}

## 🎯 Current Development Focus

**Primary Goal**: Setting up ${config.projectType}${backend !== 'none' ? ` + ${backend}` : ''} development environment
**Next Steps**: 
1. Complete environment setup and tool configuration
2. ${backend === 'express' ? 'Implement API endpoints and database schema' : backend === 'nextjs' ? 'Set up pages and API routes' : backend === 'firebase' ? 'Configure Firebase project and functions' : 'Build core application features'}
3. Set up development workflow and testing

**Architecture Notes**: 
- ${strategy.includeTools?.aiClis ? 'Full tooling setup with AI/Cloud CLIs available' : 'Lightweight container approach with tools on host'}
- ${strategy.environmentConfigs && strategy.environmentConfigs.length > 1 ? 'Multi-environment configuration (dev/staging/prod)' : 'Single environment setup'}
- ${strategy.deploymentStrategy === 'containerized' ? 'Kubernetes-ready with production deployment configs' : strategy.deploymentStrategy === 'serverless' ? 'Serverless deployment with cloud functions' : 'Static deployment strategy'}

## 🤝 AI Collaboration Notes

**Coding Preferences**:
${config.projectType === 'react' ? '- React functional components with hooks' : ''}
${config.projectType === 'react' ? '- Modern JavaScript/TypeScript patterns' : ''}
${config.projectType === 'python' ? '- Python 3.11+ features and best practices' : ''}
${config.includeMl ? '- Data science workflow with Jupyter notebooks' : ''}
${backend === 'express' ? '- RESTful API design with Express.js' : ''}
- Container-first development approach
- Environment-specific configurations

**Project Context Sharing**:
- All AI tools should reference this file for consistency
- Update this file when making architectural decisions
- Include relevant context in prompts: "Based on AI_CONTEXT.md..."

---

*Generated by Universal Dev Environment v${packageJson.version} on ${timestamp}*
*AI Context Version: 1.0 - Update this file when project architecture changes*

<!-- AI Tool Hints -->
<!-- Claude: Lightweight ${strategy.containerStrategy || 'devcontainer'} setup with ${strategy.includeTools?.aiClis ? 'full tooling' : 'host-based tools'} -->
<!-- Copilot: ${config.projectType} + ${backend !== 'none' ? backend : 'frontend-only'} architecture -->  
<!-- Gemini: Port ${backend === 'express' ? '3000 (client), 3001 (server), 5432 (db)' : '3000'} for development -->
`;
}

function generateRecentWork(config) {
  const timestamp = new Date().toISOString().split('T')[0];
  const backend = config.backend || 'none';
  
  return `# Recent Work - ${config.projectName}

> **Last Updated**: ${timestamp}
> **AI Instructions**: This file tracks recent development sessions. Update it as you work to maintain context between AI conversations.

## 📅 Recent Sessions

### Session 1: Initial Project Setup (${timestamp})
**Focus**: Setting up ${config.projectType}${backend !== 'none' ? ` + ${backend}` : ''} development environment

**Completed**:
- ✅ Generated project structure with Universal Dev Environment v${packageJson.version}
- ✅ Configured ${config.strategy?.containerStrategy || 'devcontainer'} container strategy
- ✅ Set up ${config.strategy?.includeTools?.aiClis ? 'full AI/Cloud tooling' : 'lightweight containers with host-based tools'}
${config.includeMl ? '- ✅ Configured ML environment with conda and data science libraries' : ''}

**Next Steps**:
1. Complete development environment testing
2. ${backend === 'express' ? 'Set up database schema and API endpoints' : backend === 'nextjs' ? 'Create initial pages and API routes' : backend === 'firebase' ? 'Configure Firebase project and deploy functions' : 'Build core application features'}
3. Implement core application functionality

**Current Blockers**: None

---

## 📝 Development Log Template

### Session [N]: [Focus Area] ([Date])
**Focus**: [What you're working on]

**Completed**:
- [ ] Task 1
- [ ] Task 2

**Next Steps**:
1. [Next priority item]
2. [Secondary item]

**Current Blockers**: [Any issues blocking progress]

---

*Keep the last 5-10 sessions for context. Archive older sessions.*
`;
}

function generatePreferences(config) {
  const backend = config.backend || 'none';
  
  return `# Development Preferences - ${config.projectName}

> **AI Instructions**: These are the coding patterns and preferences for this project. Reference these when generating code or making architectural suggestions.

## 🎨 Code Style & Patterns

### General Preferences
- **Code Style**: Clean, readable, well-documented
- **Architecture**: ${config.strategy?.containerStrategy === 'docker-compose' ? 'Microservices with Docker Compose' : config.strategy?.containerStrategy === 'docker' ? 'Containerized single-service' : 'Development-focused with DevContainer'}
- **Environment**: ${config.strategy?.environmentConfigs?.length > 1 ? 'Multi-environment (dev/staging/prod)' : 'Single environment setup'}

### Language-Specific
${config.projectType === 'react' ? `
#### React/JavaScript
- **Components**: Functional components with hooks (no class components)
- **State Management**: ${backend === 'nextjs' ? 'Next.js built-in state + Context API' : 'Context API for global state, useState for local'}
- **Styling**: CSS modules or styled-components (avoid inline styles)
- **Testing**: Jest + React Testing Library
- **TypeScript**: Preferred for new features (gradual adoption)

#### Code Examples
\`\`\`jsx
// Preferred component pattern
import React, { useState, useEffect } from 'react';

const MyComponent = ({ prop1, prop2 }) => {
  const [localState, setLocalState] = useState('');
  
  useEffect(() => {
    // Side effects here
  }, []);

  return (
    <div>
      {/* Component JSX */}
    </div>
  );
};

export default MyComponent;
\`\`\`
` : ''}

${backend === 'express' ? `
#### Express.js/Node.js
- **Structure**: RESTful API design with clear route separation
- **Middleware**: Custom middleware for common functionality
- **Error Handling**: Centralized error handling middleware
- **Database**: PostgreSQL with connection pooling
- **Authentication**: JWT tokens with secure practices

#### API Patterns
\`\`\`javascript
// Preferred route pattern
const express = require('express');
const router = express.Router();

router.get('/api/resource', async (req, res, next) => {
  try {
    const result = await service.getData(req.query);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
\`\`\`
` : ''}

${config.projectType === 'python' ? `
#### Python
- **Style**: PEP 8 compliance with black formatting
- **Functions**: Type hints for all function parameters and returns
- **Error Handling**: Specific exceptions rather than bare except clauses
- **Documentation**: Docstrings for all public functions and classes
${config.includeMl ? '- **Data Science**: Jupyter notebooks for exploration, .py files for production' : ''}

#### Code Examples
\`\`\`python
from typing import List, Optional

def process_data(input_data: List[str], threshold: float = 0.5) -> Optional[dict]:
    """
    Process input data and return results above threshold.
    
    Args:
        input_data: List of strings to process
        threshold: Minimum threshold for inclusion
    
    Returns:
        Dictionary of processed results or None if no results
    """
    try:
        results = {}
        # Processing logic here
        return results if results else None
    except ValueError as e:
        logger.error(f"Data processing failed: {e}")
        raise
\`\`\`
` : ''}

## 🗂️ File Organization

### Naming Conventions
- **Files**: kebab-case for components, snake_case for utilities
- **Directories**: lowercase with hyphens
- **Constants**: UPPER_SNAKE_CASE
- **Components**: PascalCase

### Project Structure Preferences
${backend === 'express' ? `
\`\`\`
client/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/         # Page-level components
│   ├── hooks/         # Custom React hooks
│   ├── utils/         # Utility functions
│   └── styles/        # Global styles

server/
├── routes/            # API route definitions
├── middleware/        # Express middleware
├── services/          # Business logic
├── models/           # Database models
└── utils/            # Server utilities
\`\`\`
` : `
\`\`\`
src/
├── components/        # Reusable components
├── pages/            # Page components
├── hooks/            # Custom hooks
├── utils/            # Utility functions
├── services/         # API services
└── styles/           # Styling
\`\`\`
`}

## 🔧 Development Workflow

### Git Practices
- **Branches**: feature/[feature-name], bugfix/[issue-name]
- **Commits**: Conventional commits (feat:, fix:, docs:, etc.)
- **PRs**: Descriptive titles with linked issues

### Testing Approach
- **Unit Tests**: For utility functions and business logic
- **Integration Tests**: For API endpoints and database operations
- **E2E Tests**: For critical user journeys
${config.features?.includes('playwright') ? '- **Browser Testing**: Playwright for cross-browser compatibility' : ''}

### Deployment Strategy
- **Environment**: ${config.strategy?.deploymentStrategy || 'static'} deployment
- **CI/CD**: ${config.strategy?.deploymentStrategy === 'containerized' ? 'Docker builds with Kubernetes deployment' : 'Build and deploy pipeline'}
- **Monitoring**: Error tracking and performance monitoring

## 🚀 Performance Preferences

### Optimization Priorities
1. **Container Size**: ${config.strategy?.includeTools?.aiClis ? 'Full development features' : 'Lightweight containers (50-80% size reduction)'}
2. **Build Speed**: Fast development builds with hot reload
3. **Runtime Performance**: Optimized production builds
4. **Security**: Minimal attack surface, secure dependencies

### Caching Strategy
- **Development**: Hot reload with file watching
- **Build**: Layer caching for Docker builds
- **Runtime**: ${backend === 'express' ? 'Redis for session and API caching' : 'Browser caching with appropriate headers'}

---

*Update this file as project preferences evolve and new patterns emerge.*
`;
}

async function createProjectFiles(config) {
  switch (config.projectType) {
    case 'react':
      // Create React project structure based on backend selection
      const backend = config.backend || 'none';
      
      if (backend === 'nextjs') {
        // Next.js project structure
        if (!fs.existsSync('pages')) {
          fs.mkdirSync('pages');
          fs.writeFileSync('pages/index.js', `import Head from 'next/head';

export default function Home() {
  return (
    <div>
      <Head>
        <title>${config.projectName}</title>
        <meta name="description" content="Generated by Universal Dev Environment" />
      </Head>

      <main>
        <h1>Welcome to ${config.projectName}</h1>
        <p>Your Next.js universal dev environment is ready!</p>
      </main>
    </div>
  );
}
`);
          
          fs.writeFileSync('pages/api/hello.js', `export default function handler(req, res) {
  res.status(200).json({ 
    message: 'Hello from ${config.projectName} API!',
    timestamp: new Date().toISOString()
  });
}
`);
        }
      } else if (backend === 'express') {
        // React frontend with Express backend
        if (!fs.existsSync('client')) {
          fs.mkdirSync('client');
          fs.mkdirSync('client/src');
          fs.mkdirSync('client/public');
          
          fs.writeFileSync('client/src/App.js', `import React, { useState, useEffect } from 'react';

function App() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/hello')
      .then(res => res.json())
      .then(data => setMessage(data.message))
      .catch(err => console.error('API Error:', err));
  }, []);

  return (
    <div className="App">
      <h1>Welcome to ${config.projectName}</h1>
      <p>Your React + Express universal dev environment is ready!</p>
      <p>Backend says: {message}</p>
    </div>
  );
}

export default App;
`);
          
          fs.writeFileSync('client/src/index.js', `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
`);
          
          fs.writeFileSync('client/public/index.html', `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${config.projectName}</title>
</head>
<body>
    <div id="root"></div>
</body>
</html>
`);
        }
        
        // Express backend
        if (!fs.existsSync('server')) {
          fs.mkdirSync('server');
          fs.writeFileSync('server/index.js', `const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

// API routes
app.get('/api/hello', (req, res) => {
  res.json({ 
    message: 'Hello from ${config.projectName} Express API!',
    timestamp: new Date().toISOString()
  });
});

// Serve static files from React build
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

app.listen(port, () => {
  console.log(\`🚀 Server running on port \${port}\`);
});
`);
          
          // Create server package.json
          const serverPackageJson = {
            name: `${config.projectName.toLowerCase().replace(/\s+/g, '-')}-server`,
            version: '1.0.0',
            private: true,
            scripts: {
              start: 'node index.js',
              dev: 'nodemon index.js'
            },
            dependencies: {
              express: '^4.18.0',
              cors: '^2.8.5'
            },
            devDependencies: {
              nodemon: '^3.0.0'
            }
          };
          fs.writeFileSync('server/package.json', JSON.stringify(serverPackageJson, null, 2));
        }
        
        // Create client package.json
        if (!fs.existsSync('client/package.json')) {
          const clientPackageJson = {
            name: `${config.projectName.toLowerCase().replace(/\s+/g, '-')}-client`,
            version: '1.0.0',
            private: true,
            proxy: "http://localhost:3001",
            scripts: {
              start: 'react-scripts start',
              build: 'react-scripts build',
              test: 'react-scripts test',
              eject: 'react-scripts eject'
            },
            dependencies: {
              react: '^18.2.0',
              'react-dom': '^18.2.0',
              'react-scripts': '5.0.1'
            }
          };
          fs.writeFileSync('client/package.json', JSON.stringify(clientPackageJson, null, 2));
        }
        
        // Create individual Dockerfiles for docker-compose strategy
        if (config.strategy && config.strategy.containerStrategy === 'docker-compose') {
          // Client Dockerfile
          const clientDockerfile = `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
`;
          fs.writeFileSync('client/Dockerfile', clientDockerfile);
          
          // Server Dockerfile
          const serverDockerfile = `FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
`;
          fs.writeFileSync('server/Dockerfile', serverDockerfile);
        }
      } else if (backend === 'firebase') {
        // React with Firebase Functions
        if (!fs.existsSync('src')) {
          fs.mkdirSync('src');
          fs.writeFileSync('src/App.js', `import React, { useState, useEffect } from 'react';

function App() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Example Firebase Function call
    // Replace with your Firebase project URL
    fetch('/.netlify/functions/hello')
      .then(res => res.json())
      .then(data => setMessage(data.message))
      .catch(err => console.error('Firebase Function Error:', err));
  }, []);

  return (
    <div className="App">
      <h1>Welcome to ${config.projectName}</h1>
      <p>Your React + Firebase universal dev environment is ready!</p>
      <p>Function says: {message}</p>
    </div>
  );
}

export default App;
`);
          
          fs.writeFileSync('src/index.js', `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
`);
        }
        
        if (!fs.existsSync('public')) {
          fs.mkdirSync('public');
          fs.writeFileSync('public/index.html', `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${config.projectName}</title>
</head>
<body>
    <div id="root"></div>
</body>
</html>
`);
        }
        
        // Firebase functions
        if (!fs.existsSync('functions')) {
          fs.mkdirSync('functions');
          fs.writeFileSync('functions/index.js', `const functions = require('firebase-functions');

exports.hello = functions.https.onRequest((request, response) => {
  response.json({
    message: 'Hello from ${config.projectName} Firebase Function!',
    timestamp: new Date().toISOString()
  });
});
`);
          
          // Create functions package.json
          const functionsPackageJson = {
            name: `${config.projectName.toLowerCase().replace(/\s+/g, '-')}-functions`,
            version: '1.0.0',
            private: true,
            scripts: {
              serve: 'firebase emulators:start --only functions',
              shell: 'firebase functions:shell',
              start: 'npm run shell',
              deploy: 'firebase deploy --only functions',
              logs: 'firebase functions:log'
            },
            engines: {
              node: "18"
            },
            dependencies: {
              "firebase-admin": "^11.8.0",
              "firebase-functions": "^4.3.1"
            },
            devDependencies: {
              "firebase-functions-test": "^3.1.0"
            }
          };
          fs.writeFileSync('functions/package.json', JSON.stringify(functionsPackageJson, null, 2));
          
          fs.writeFileSync('firebase.json', JSON.stringify({
            "hosting": {
              "public": "build",
              "ignore": [
                "firebase.json",
                "**/.*",
                "**/node_modules/**"
              ],
              "rewrites": [
                {
                  "source": "**",
                  "destination": "/index.html"
                }
              ]
            },
            "functions": {
              "source": "functions"
            }
          }, null, 2));
        }
      } else if (backend === 'serverless') {
        // React with Serverless functions (Vercel/Netlify)
        if (!fs.existsSync('src')) {
          fs.mkdirSync('src');
          fs.writeFileSync('src/App.js', `import React, { useState, useEffect } from 'react';

function App() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/hello')
      .then(res => res.json())
      .then(data => setMessage(data.message))
      .catch(err => console.error('API Error:', err));
  }, []);

  return (
    <div className="App">
      <h1>Welcome to ${config.projectName}</h1>
      <p>Your React + Serverless universal dev environment is ready!</p>
      <p>Function says: {message}</p>
    </div>
  );
}

export default App;
`);
          
          fs.writeFileSync('src/index.js', `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
`);
        }
        
        if (!fs.existsSync('public')) {
          fs.mkdirSync('public');
          fs.writeFileSync('public/index.html', `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${config.projectName}</title>
</head>
<body>
    <div id="root"></div>
</body>
</html>
`);
        }
        
        // Vercel/Netlify API functions
        if (!fs.existsSync('api')) {
          fs.mkdirSync('api');
          fs.writeFileSync('api/hello.js', `export default function handler(req, res) {
  res.status(200).json({
    message: 'Hello from ${config.projectName} Serverless Function!',
    timestamp: new Date().toISOString()
  });
}
`);
        }
        
        // Vercel config
        fs.writeFileSync('vercel.json', JSON.stringify({
          "builds": [
            { "src": "api/**/*.js", "use": "@vercel/node" },
            { "src": "package.json", "use": "@vercel/static-build" }
          ]
        }, null, 2));
      } else {
        // Frontend-only React project
        if (!fs.existsSync('src')) {
          fs.mkdirSync('src');
          fs.writeFileSync('src/App.js', `import React from 'react';

function App() {
  return (
    <div className="App">
      <h1>Welcome to ${config.projectName}</h1>
      <p>Your React universal dev environment is ready!</p>
    </div>
  );
}

export default App;
`);
          
          fs.writeFileSync('src/index.js', `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
`);
        }
        
        if (!fs.existsSync('public')) {
          fs.mkdirSync('public');
          fs.writeFileSync('public/index.html', `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${config.projectName}</title>
</head>
<body>
    <div id="root"></div>
</body>
</html>
`);
        }
      }
      break;
      
    case 'node':
      if (!fs.existsSync('server.js')) {
        fs.writeFileSync('server.js', `const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to ${config.projectName}',
    environment: 'Universal Dev Environment Ready!'
  });
});

app.listen(port, () => {
  console.log(\`🚀 Server running on port \${port}\`);
});
`);
      }
      break;
      
    case 'full-stack':
      // Create backend
      if (!fs.existsSync('backend')) {
        fs.mkdirSync('backend');
        fs.writeFileSync('backend/server.js', `const express = require('express');
const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

app.get('/api', (req, res) => {
  res.json({ 
    message: 'Backend API for ${config.projectName}',
    timestamp: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log(\`🚀 Backend server running on port \${port}\`);
});
`);
      }
      
      // Create frontend
      if (!fs.existsSync('frontend')) {
        fs.mkdirSync('frontend');
        // Basic frontend structure would go here
      }
      break;
      
    case 'python':
      // Create Python project structure
      if (!fs.existsSync('main.py')) {
        let mainPyContent = `#!/usr/bin/env python3
"""
${config.projectName} - Python Application
"""
`;

        if (config.includeMl) {
          mainPyContent += `
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
import matplotlib.pyplot as plt

def main():
    print("🤖 Welcome to ${config.projectName} - ML Project!")
    print("Your Machine Learning development environment is ready!")
    
    # Example: Create sample data
    print("\\n📊 Creating sample dataset...")
    np.random.seed(42)
    data = {
        'feature1': np.random.randn(100),
        'feature2': np.random.randn(100),
        'target': np.random.randint(0, 2, 100)
    }
    df = pd.DataFrame(data)
    print(f"Dataset shape: {df.shape}")
    print(df.head())
    
    # Example: Basic ML workflow
    X = df[['feature1', 'feature2']]
    y = df['target']
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    print(f"\\n🔍 Train set: {X_train.shape}, Test set: {X_test.shape}")
    
    # Your ML code here
    print("\\n🚀 Ready for your machine learning project!")
    print("💡 Tip: Use 'jupyter notebook' to start interactive development")
`;
        } else {
          mainPyContent += `
def main():
    print("🐍 Welcome to ${config.projectName}!")
    print("Your Python development environment is ready!")
    
    # Your code here
    pass
`;
        }

        mainPyContent += `
if __name__ == "__main__":
    main()
`;
        
        fs.writeFileSync('main.py', mainPyContent);
      }
      
      // Create requirements.txt with common packages
      if (!fs.existsSync('requirements.txt')) {
        let requirements = `# Core packages
requests>=2.31.0
python-dotenv>=1.0.0

# Development packages
pytest>=7.0.0
black>=23.0.0
flake8>=6.0.0
`;

        // Add ML libraries if requested
        if (config.includeMl) {
          requirements += `
# Machine Learning & Data Science
numpy>=1.24.0
pandas>=2.0.0
scikit-learn>=1.3.0
matplotlib>=3.7.0
seaborn>=0.12.0
jupyter>=1.0.0
ipykernel>=6.25.0

# Optional ML libraries (uncomment as needed)
# tensorflow>=2.13.0
# torch>=2.0.0
# transformers>=4.30.0
# opencv-python>=4.8.0
# plotly>=5.15.0
# xgboost>=1.7.0
# lightgbm>=4.0.0
`;
        }

        requirements += `
# Add your project-specific packages below:
`;
        
        fs.writeFileSync('requirements.txt', requirements);
      }
      
      // Create .env file for environment variables
      if (!fs.existsSync('.env')) {
        fs.writeFileSync('.env', `# Environment variables for ${config.projectName}
# Add your configuration here

# Example:
# DEBUG=True
# API_KEY=your_api_key_here
`);
      }
      
      // Create .gitignore for Python
      if (!fs.existsSync('.gitignore')) {
        fs.writeFileSync('.gitignore', `# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Virtual environments
venv/
env/
ENV/

# Environment variables
.env
.env.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
`);
      }
      break;
  }
}

async function createTemplate(templateName, directory) {
  // Template creation logic here
  console.log(`Creating ${templateName} template in ${directory}`);
}

// Cache management functions
function initCache() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function getCacheKey(url, type = 'file', version = null) {
  const crypto = require('crypto');
  const versionString = version ? `:${version}` : '';
  return crypto.createHash('md5').update(`${type}:${url}${versionString}`).digest('hex');
}

function isCacheValid(cacheFile) {
  if (!fs.existsSync(cacheFile)) return false;
  const stats = fs.statSync(cacheFile);
  const age = Date.now() - stats.mtime.getTime();
  return age < CACHE_EXPIRY;
}

async function downloadWithCache(url, filename, useCache = true, version = null) {
  initCache();
  
  // Include current package version in cache key to auto-invalidate on updates
  const currentVersion = version || packageJson.version;
  const cacheKey = getCacheKey(url, 'file', currentVersion);
  const cacheFile = path.join(CACHE_DIR, `${cacheKey}_${filename}`);
  
  if (useCache && isCacheValid(cacheFile)) {
    console.log(chalk.green(`📦 Using cached ${filename} (v${currentVersion})`));
    return fs.readFileSync(cacheFile, 'utf8');
  }
  
  console.log(chalk.yellow(`⬇️  Downloading ${filename}...`));
  
  try {
    const response = await fetch(url);
    const content = await response.text();
    
    if (useCache) {
      // Clean up old version caches for the same URL
      cleanupOldVersions(url, filename, currentVersion);
      
      fs.writeFileSync(cacheFile, content);
      console.log(chalk.green(`💾 Cached ${filename} (v${currentVersion}) for future use`));
    }
    
    return content;
  } catch (error) {
    if (fs.existsSync(cacheFile)) {
      console.log(chalk.yellow(`⚠️  Download failed, using cached version (v${currentVersion})`));
      return fs.readFileSync(cacheFile, 'utf8');
    }
    throw error;
  }
}

function cleanupOldVersions(url, filename, currentVersion) {
  if (!fs.existsSync(CACHE_DIR)) return;
  
  const files = fs.readdirSync(CACHE_DIR);
  const baseUrl = url.replace(/[^a-zA-Z0-9]/g, '');
  
  files.forEach(file => {
    if (file.includes(filename) && file.includes(baseUrl) && !file.includes(currentVersion)) {
      const oldCacheFile = path.join(CACHE_DIR, file);
      try {
        fs.unlinkSync(oldCacheFile);
        console.log(chalk.gray(`🗑️  Cleaned up old cache: ${file}`));
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });
}

function clearCache() {
  if (fs.existsSync(CACHE_DIR)) {
    fs.rmSync(CACHE_DIR, { recursive: true, force: true });
    console.log(chalk.green('🗑️  Cache cleared'));
  }
}

// Add uninstall command
program
  .command('uninstall')
  .description('Completely remove Universal Dev Environment')
  .option('--yes', 'Skip confirmation prompts')
  .action(async (options) => {
    console.log(chalk.red.bold('🗑️  Universal Dev Environment - Uninstall'));
    console.log(chalk.gray('='.repeat(50)));
    
    if (!options.yes) {
      const { confirmed } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirmed',
        message: 'Are you sure you want to uninstall Universal Dev Environment?',
        default: false
      }]);
      
      if (!confirmed) {
        console.log(chalk.yellow('❌ Uninstall cancelled'));
        return;
      }
    }
    
    try {
      // Download and run uninstall script
      const uninstallUrl = 'https://raw.githubusercontent.com/nhangen/universal-dev-env/main/uninstall.sh';
      console.log(chalk.yellow('📥 Downloading uninstall script...'));
      
      const uninstallScript = await downloadWithCache(uninstallUrl, 'uninstall.sh', false); // Don't cache uninstall
      const scriptPath = path.join(process.cwd(), 'uninstall.sh');
      fs.writeFileSync(scriptPath, uninstallScript);
      fs.chmodSync(scriptPath, 0o755);
      
      console.log(chalk.blue('🚀 Running uninstall script...'));
      execSync(`"${scriptPath}"`, { stdio: 'inherit' });
      
      // Clean up the uninstall script
      fs.unlinkSync(scriptPath);
      
      console.log(chalk.green('✅ Uninstall complete!'));
    } catch (error) {
      console.error(chalk.red('❌ Uninstall failed:', error.message));
      console.log(chalk.yellow('💡 Try running manually:'));
      console.log(chalk.gray('   curl -fsSL https://raw.githubusercontent.com/nhangen/universal-dev-env/main/uninstall.sh | bash'));
    }
  });

// Add cache management commands
// Add guided onboarding command
program
  .command('onboard')
  .description('Start guided onboarding with role-based setup')
  .option('--skip-prompts', 'Use default configuration without prompts')
  .option('--role <role>', 'Specify agent role directly')
  .option('--here', 'Initialize in current directory')
  .action(async (options) => {
    const guidedSetup = require('./guided-setup.js');
    console.log(chalk.yellow('🚀 Launching guided onboarding process...'));
    console.log(chalk.gray('This will configure your environment based on your role and needs.\n'));
    
    try {
      // Run the guided setup process
      await require('child_process').execSync('node ./bin/guided-setup.js onboard ' + 
        (options.skipPrompts ? '--skip-prompts ' : '') +
        (options.role ? `--role ${options.role} ` : '') +
        (options.here ? '--here' : ''), 
        { stdio: 'inherit' }
      );
    } catch (error) {
      console.error(chalk.red('Onboarding failed:', error.message));
    }
  });

program
  .command('cache')
  .description('Manage cache')
  .option('--clear', 'Clear all cached files')
  .option('--info', 'Show cache information')
  .action(async (options) => {
    if (options.clear) {
      clearCache();
      return;
    }
    
    if (options.info) {
      initCache();
      if (fs.existsSync(CACHE_DIR)) {
        const files = fs.readdirSync(CACHE_DIR);
        console.log(chalk.blue(`📦 Cache directory: ${CACHE_DIR}`));
        console.log(chalk.blue(`📊 Cached files: ${files.length}`));
        
        let totalSize = 0;
        files.forEach(file => {
          const filePath = path.join(CACHE_DIR, file);
          const stats = fs.statSync(filePath);
          totalSize += stats.size;
        });
        
        console.log(chalk.blue(`💾 Total cache size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`));
      } else {
        console.log(chalk.yellow('📦 No cache directory found'));
      }
      return;
    }
    
    console.log(chalk.blue('Cache management options:'));
    console.log('  --clear  Clear all cached files');
    console.log('  --info   Show cache information');
  });

// Only run CLI when executed directly, not when imported
if (require.main === module) {
  program.parse();
}

// Export functions for testing
module.exports = {
  selectConfigurationStrategy,
  generateDockerfile,
  generateDockerCompose,
  generateDevcontainerConfig,
  generateEnvironmentConfig,
  generateKubernetesDeployment,
  generateKubernetesService,
  generateAIContext,
  generateRecentWork,
  generatePreferences
};