#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora');
const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');

const packageJson = require('../package.json');

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
        baseImage: 'debian'
      };
    }

    await setupProject(config);
  });

program
  .command('install')
  .description('Install development tools in current environment')
  .option('--dry-run', 'Show what would be installed without executing')
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
      execSync('npm install -g @axelroark/universal-dev-env@latest', { stdio: 'inherit' });
      spinner.succeed('Upgraded to latest version!');
    } catch (error) {
      spinner.fail('Upgrade failed: ' + error.message);
    }
  });

async function setupProject(config) {
  const spinner = ora('Setting up project...').start();
  
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

For more information, see the [Universal Dev Environment documentation](https://github.com/axelroark/universal-dev-env).

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

program.parse();