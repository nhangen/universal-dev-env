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
        }
      ]);

      config = { ...options, ...answers };
    } else {
      config = {
        projectName: options.name || path.basename(process.cwd()),
        projectType: options.type || 'react',
        features: ['ai-cli', 'gcloud', 'github-cli', 'vscode-extensions'],
        baseImage: 'debian',
        cache: options.cache
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
  .command('upgrade')
  .description('Upgrade universal-dev-env to latest version')
  .action(async () => {
    const spinner = ora('Upgrading universal-dev-env...').start();
    
    try {
      execSync('npm install -g @nhangen/universal-dev-env@latest', { stdio: 'inherit' });
      spinner.succeed('Upgraded to latest version!');
    } catch (error) {
      spinner.fail('Upgrade failed: ' + error.message);
    }
  });

async function setupProject(config) {
  const spinner = ora('Setting up project...').start();
  const useCache = config.cache !== false; // Default to true unless explicitly disabled
  
  if (useCache) {
    spinner.text = 'Setting up project (cache enabled)...';
  }
  
  try {
    // Create basic project structure
    if (!fs.existsSync(config.projectName)) {
      fs.mkdirSync(config.projectName, { recursive: true });
    }
    
    process.chdir(config.projectName);
    
    // Copy universal setup files
    const templateDir = path.join(__dirname, '..', 'templates');
    const universalFiles = [
      'universal-setup.sh',
      'Dockerfile.universal',
      'devcontainer.universal.json'
    ];
    
    for (const file of universalFiles) {
      const srcPath = path.join(__dirname, '..', file);
      const destPath = path.join(process.cwd(), file);
      
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        
        if (file.endsWith('.sh')) {
          execSync(`chmod +x "${destPath}"`);
        }
      }
    }
    
    // Create .devcontainer directory and copy config
    if (!fs.existsSync('.devcontainer')) {
      fs.mkdirSync('.devcontainer');
    }
    
    const devcontainerConfig = generateDevcontainerConfig(config);
    fs.writeFileSync('.devcontainer/devcontainer.json', JSON.stringify(devcontainerConfig, null, 2));
    
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
  
  // Customize based on project type
  base.name = `${config.projectName} Dev Environment`;
  
  if (config.projectType === 'python') {
    base.customizations.vscode.extensions.push(
      'ms-python.python',
      'ms-python.pylint',
      'ms-python.black-formatter'
    );
  }
  
  if (config.features.includes('playwright')) {
    base.containerEnv.PLAYWRIGHT_BROWSERS_PATH = '/usr/bin';
    base.containerEnv.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = '/usr/bin/chromium';
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
  return `# ${config.projectName}

${config.projectType.charAt(0).toUpperCase() + config.projectType.slice(1)} project with universal development environment.

## 🚀 Quick Start

### Using DevContainer (Recommended)
1. Open this project in VS Code
2. Install the "Dev Containers" extension
3. Click "Reopen in Container" when prompted
4. Wait for the container to build and setup to complete

### Manual Setup
1. Run the setup script:
   \`\`\`bash
   ./universal-setup.sh
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

3. Start development:
   \`\`\`bash
   npm run dev
   \`\`\`

## 🛠️ Available Tools

- **Claude CLI**: \`claude\` - AI-powered development assistant
- **Gemini CLI**: \`gemini\` - Google's AI CLI tool
- **GitHub CLI**: \`gh\` - GitHub command line interface
- **Google Cloud CLI**: \`gcloud\` - Cloud deployment and management

## 📦 Project Structure

\`\`\`
${config.projectName}/
├── .devcontainer/          # VS Code dev container configuration
├── universal-setup.sh      # Environment setup script
├── Dockerfile.universal    # Multi-stage Docker configuration
└── README.md              # This file
\`\`\`

## 🔧 Customization

Edit \`devcontainer.json\` to customize:
- VS Code extensions
- Port forwarding
- Environment variables
- Container mounts

## 📚 Documentation

For more information, see the [Universal Dev Environment documentation](https://github.com/nhangen/universal-dev-env).

---

Generated with Universal Dev Environment v${packageJson.version}
`;
}

async function createProjectFiles(config) {
  switch (config.projectType) {
    case 'react':
      // Create basic React structure
      if (!fs.existsSync('src')) {
        fs.mkdirSync('src');
        fs.writeFileSync('src/App.js', `import React from 'react';

function App() {
  return (
    <div className="App">
      <h1>Welcome to ${config.projectName}</h1>
      <p>Your universal dev environment is ready!</p>
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

// Add cache management commands
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

program.parse();