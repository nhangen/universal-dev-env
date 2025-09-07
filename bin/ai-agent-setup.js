#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora');
const fs = require('fs');
const path = require('path');

const packageJson = require('../package.json');

// Default AI Agent roles that users can customize
const DEFAULT_AGENT_ROLES = {
  'senior-software-engineer': {
    name: '👨‍💻 Senior Software Engineer',
    description: 'Focus on code quality, architecture, and implementation of new features. Review existing code in `src/`, `scripts/`, and `deployment/` to understand current practices. Ensure all new code is tested and documented.',
    focus: ['src/', 'scripts/', 'deployment/', 'testing', 'documentation'],
    enabled: true
  },
  'senior-data-scientist': {
    name: '📊 Senior Data Scientist', 
    description: 'Analyze experimental results and model performance. Your primary focus is on the data in `experiments/`, `validation/`, and `reports/`. Use your analytical skills to identify trends, validate hypotheses, and suggest model improvements.',
    focus: ['experiments/', 'validation/', 'reports/', 'data-analysis'],
    enabled: true
  },
  'devops-engineer': {
    name: '⚙️ DevOps/SysOps Engineer',
    description: 'Manage the project\'s infrastructure, deployment, and CI/CD pipelines. Review `Dockerfile`, `deployment/`, and any `.yaml` configuration files. Your goal is to ensure the system is scalable, reliable, and secure.',
    focus: ['Dockerfile', 'deployment/', 'ci-cd', 'monitoring', 'security'],
    enabled: true
  },
  'cybersecurity-analyst': {
    name: '🔒 Cybersecurity Analyst',
    description: 'Assess the security of the application and infrastructure. Review code for vulnerabilities, check dependencies, and analyze deployment configurations for security best practices.',
    focus: ['security-analysis', 'vulnerability-assessment', 'code-review'],
    enabled: false
  },
  'ai-research-scientist': {
    name: '🧠 AI/ML Research Scientist',
    description: 'Drive the core research forward. Your focus is on the models in `models/` and the theoretical documentation in `docs/` and `papers/`. Propose novel architectures and validation methodologies.',
    focus: ['models/', 'papers/', 'research', 'theoretical-documentation'],
    enabled: false
  },
  'project-manager': {
    name: '📋 Project Manager',
    description: 'Track project status, milestones, and risks. Review `PROJECT_STATUS.md`, `README.md`, and commit history to understand the project\'s trajectory. Your role is to ensure tasks are clearly defined and progress is being made.',
    focus: ['project-status', 'milestones', 'documentation', 'coordination'],
    enabled: true
  },
  'technical-writer': {
    name: '📝 Technical Writer',
    description: 'Improve and maintain project documentation. Review all `.md` files to ensure they are clear, accurate, and up-to-date. Your goal is to make the project easily understandable for new contributors.',
    focus: ['documentation', 'readme', 'guides', 'api-docs'],
    enabled: false
  },
  'qa-engineer': {
    name: '🧪 QA Engineer',
    description: 'Develop and execute test plans. Review the `tests/` directory and create new tests for existing and new features. Your focus is on ensuring the correctness and robustness of the software.',
    focus: ['tests/', 'test-plans', 'quality-assurance', 'automation'],
    enabled: true
  },
  'database-administrator': {
    name: '🗄️ Database Administrator (DBA)',
    description: 'Manage and optimize the project\'s databases (ChromaDB, FalkorDB). Review `vector_db/` and `kg_tools.py`. Ensure data integrity, performance, and security.',
    focus: ['vector_db/', 'database-optimization', 'data-integrity'],
    enabled: false
  },
  'quantum-specialist': {
    name: '⚛️ Quantum Computing Specialist',
    description: 'Focus on the quantum-specific aspects of the project. Review `drift_detection/`, `docs/quantum_hardware_integration.md`, and any files related to quantum physics. Your role is to validate and advance the quantum methodologies.',
    focus: ['quantum-hardware', 'quantum-physics', 'specialized-algorithms'],
    enabled: false
  }
};

program
  .name('ai-agent-setup')
  .description('Configure AI agent roles and generate onboarding instructions')
  .version(packageJson.version);

program
  .command('configure')
  .description('Interactive configuration of AI agent roles for your project')
  .option('--project-name <name>', 'Project name')
  .option('--project-type <type>', 'Project type (react, node, python, etc.)')
  .action(async (options) => {
    console.log(chalk.blue.bold('🤖 AI Agent Role Configuration'));
    console.log(chalk.gray('='.repeat(60)));
    console.log(chalk.cyan('Configure which AI agent roles are available for your project.\n'));

    // Get basic project info
    const projectInfo = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectName',
        message: 'Project name:',
        default: options.projectName || path.basename(process.cwd()),
        validate: (input) => input.length > 0
      },
      {
        type: 'list',
        name: 'projectType',
        message: 'Primary project type:',
        choices: [
          { name: '⚛️  React/Frontend', value: 'react' },
          { name: '🟢 Node.js/Backend', value: 'node' },
          { name: '🐍 Python/ML', value: 'python' },
          { name: '🔄 Full-Stack', value: 'full-stack' },
          { name: '🔬 Research/Academic', value: 'research' },
          { name: '⚙️  DevOps/Infrastructure', value: 'infrastructure' },
          { name: '🏢 Enterprise/Business', value: 'enterprise' },
          { name: '📊 Data Science/Analytics', value: 'data-science' }
        ],
        default: options.projectType || 'react'
      }
    ]);

    // Configure roles
    console.log(chalk.yellow('\n📋 Role Configuration'));
    console.log(chalk.gray('Select which AI agent roles should be available for your project:\n'));

    const roleChoices = Object.entries(DEFAULT_AGENT_ROLES).map(([key, role]) => ({
      name: `${role.name} - ${role.description.substring(0, 80)}...`,
      value: key,
      checked: role.enabled
    }));

    const roleAndTrackingAnswers = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'enabledRoles',
        message: 'Select available AI agent roles:',
        choices: roleChoices,
        validate: (input) => input.length > 0 || 'At least one role must be enabled'
      },
      {
        type: 'confirm',
        name: 'enableAutoTracking',
        message: '🔄 Enable automatic session tracking with git post-commit hook?',
        default: false
      }
    ]);
    
    const { enabledRoles, enableAutoTracking } = roleAndTrackingAnswers;

    // Customize role descriptions
    const customRoles = { ...DEFAULT_AGENT_ROLES };
    
    console.log(chalk.yellow('\n✏️  Role Customization'));
    console.log(chalk.gray('Customize role descriptions for your project context:\n'));

    for (const roleKey of enabledRoles) {
      const role = DEFAULT_AGENT_ROLES[roleKey];
      
      const { customizeRole } = await inquirer.prompt([{
        type: 'confirm',
        name: 'customizeRole',
        message: `Customize description for ${role.name}?`,
        default: false
      }]);

      if (customizeRole) {
        const { customDescription, customFocus } = await inquirer.prompt([
          {
            type: 'editor',
            name: 'customDescription',
            message: `Edit description for ${role.name}:`,
            default: role.description
          },
          {
            type: 'input',
            name: 'customFocus',
            message: 'Focus areas (comma-separated):',
            default: role.focus.join(', '),
            filter: (input) => input.split(',').map(s => s.trim())
          }
        ]);

        customRoles[roleKey] = {
          ...role,
          description: customDescription,
          focus: customFocus,
          enabled: true,
          customized: true
        };
      } else {
        customRoles[roleKey] = { ...role, enabled: true };
      }
    }

    // Disable roles not selected
    Object.keys(customRoles).forEach(key => {
      if (!enabledRoles.includes(key)) {
        customRoles[key].enabled = false;
      }
    });

    // Generate configuration
    const config = {
      project: projectInfo,
      roles: customRoles,
      autoTracking: enableAutoTracking,
      generatedAt: new Date().toISOString(),
      version: packageJson.version
    };

    await generateAgentInstructions(config);
    
    console.log(chalk.green.bold('\n✅ AI Agent Configuration Complete!'));
    console.log(chalk.white('Generated files:'));
    console.log(chalk.gray('  AI_AGENT_ONBOARDING.md - Instructions for new AI agents'));
    console.log(chalk.gray('  .ai-agent-config.json   - Role configuration'));
    console.log(chalk.gray('  SESSION_HANDOFF.md      - Template for session handoffs'));
  });

program
  .command('add-role')
  .description('Add a new custom AI agent role')
  .option('--name <name>', 'Role name')
  .option('--description <desc>', 'Role description')
  .action(async (options) => {
    const config = loadAgentConfig();
    
    const roleInfo = await inquirer.prompt([
      {
        type: 'input',
        name: 'roleKey',
        message: 'Role key (lowercase-with-hyphens):',
        validate: (input) => /^[a-z-]+$/.test(input) || 'Use lowercase letters and hyphens only'
      },
      {
        type: 'input', 
        name: 'name',
        message: 'Role display name:',
        default: options.name
      },
      {
        type: 'editor',
        name: 'description',
        message: 'Role description and responsibilities:',
        default: options.description || 'Enter role description...'
      },
      {
        type: 'input',
        name: 'focus',
        message: 'Focus areas (comma-separated):',
        filter: (input) => input.split(',').map(s => s.trim())
      }
    ]);

    config.roles[roleInfo.roleKey] = {
      name: roleInfo.name,
      description: roleInfo.description,
      focus: roleInfo.focus,
      enabled: true,
      custom: true
    };

    saveAgentConfig(config);
    await generateAgentInstructions(config);

    console.log(chalk.green(`✅ Added custom role: ${roleInfo.name}`));
  });

program
  .command('generate-handoff')
  .description('Generate session handoff template')
  .option('--role <role>', 'Current agent role')
  .option('--session-summary <summary>', 'Brief session description')
  .action(async (options) => {
    const config = loadAgentConfig();
    
    if (!options.role) {
      const { role } = await inquirer.prompt([{
        type: 'list',
        name: 'role',
        message: 'What role were you acting as this session?',
        choices: Object.entries(config.roles)
          .filter(([_, role]) => role.enabled)
          .map(([key, role]) => ({ name: role.name, value: key }))
      }]);
      options.role = role;
    }

    if (!options.sessionSummary) {
      const { summary } = await inquirer.prompt([{
        type: 'input',
        name: 'summary',
        message: 'Brief session summary:',
        validate: (input) => input.length > 0
      }]);
      options.sessionSummary = summary;
    }

    generateSessionHandoff(config, options.role, options.sessionSummary);
    console.log(chalk.green('✅ Session handoff generated: SESSION_HANDOFF.md'));
  });

program
  .command('role-info [role]')
  .description('Show information about configured roles')
  .action((role) => {
    const config = loadAgentConfig();
    
    if (role && config.roles[role]) {
      const roleInfo = config.roles[role];
      console.log(chalk.blue.bold(`\n${roleInfo.name}`));
      console.log(chalk.gray('='.repeat(50)));
      console.log(chalk.white('Description:', roleInfo.description));
      console.log(chalk.white('Focus Areas:', roleInfo.focus.join(', ')));
      console.log(chalk.white('Status:', roleInfo.enabled ? chalk.green('Enabled') : chalk.red('Disabled')));
      if (roleInfo.customized || roleInfo.custom) {
        console.log(chalk.yellow('Custom: Modified from default'));
      }
    } else {
      console.log(chalk.blue.bold('\n🤖 Configured AI Agent Roles'));
      console.log(chalk.gray('='.repeat(50)));
      
      const enabledRoles = Object.entries(config.roles).filter(([_, role]) => role.enabled);
      const disabledRoles = Object.entries(config.roles).filter(([_, role]) => !role.enabled);
      
      if (enabledRoles.length > 0) {
        console.log(chalk.green.bold('\n✅ Enabled Roles:'));
        enabledRoles.forEach(([key, role]) => {
          console.log(chalk.cyan(`${role.name}`));
          console.log(chalk.gray(`  Key: ${key}`));
          console.log(chalk.gray(`  Focus: ${role.focus.slice(0, 3).join(', ')}${role.focus.length > 3 ? '...' : ''}`));
          if (role.customized || role.custom) {
            console.log(chalk.yellow('  Status: Customized'));
          }
          console.log();
        });
      }
      
      if (disabledRoles.length > 0) {
        console.log(chalk.red.bold('❌ Disabled Roles:'));
        disabledRoles.forEach(([key, role]) => {
          console.log(chalk.gray(`${role.name} (${key})`));
        });
      }
    }
  });

function loadAgentConfig() {
  const configPath = '.ai-agent-config.json';
  
  if (fs.existsSync(configPath)) {
    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
      console.warn(chalk.yellow('⚠️  Invalid config file, using defaults'));
    }
  }
  
  // Return default config
  return {
    project: {
      name: path.basename(process.cwd()),
      type: 'react'
    },
    roles: DEFAULT_AGENT_ROLES,
    generatedAt: new Date().toISOString(),
    version: packageJson.version
  };
}

function saveAgentConfig(config) {
  config.updatedAt = new Date().toISOString();
  fs.writeFileSync('.ai-agent-config.json', JSON.stringify(config, null, 2));
}

function installPostCommitHook() {
  const hookDir = '.git/hooks';
  const hookFile = path.join(hookDir, 'post-commit');
  const sourceHookFile = path.join(__dirname, '..', 'hooks', 'post-commit');
  
  try {
    // Check if we're in a git repository
    if (!fs.existsSync('.git')) {
      console.log(chalk.yellow('⚠️  Not a git repository - skipping post-commit hook installation'));
      return;
    }
    
    // Ensure hooks directory exists
    if (!fs.existsSync(hookDir)) {
      fs.mkdirSync(hookDir, { recursive: true });
    }
    
    // Check if hook already exists
    if (fs.existsSync(hookFile)) {
      // Backup existing hook
      const backupFile = `${hookFile}.backup-${Date.now()}`;
      fs.copyFileSync(hookFile, backupFile);
      console.log(chalk.yellow(`📋 Existing post-commit hook backed up to: ${backupFile}`));
    }
    
    // Copy our hook
    if (fs.existsSync(sourceHookFile)) {
      fs.copyFileSync(sourceHookFile, hookFile);
      fs.chmodSync(hookFile, 0o755);
      console.log(chalk.green('✅ Post-commit hook installed - will remind you to update SESSION_HANDOFF.md'));
    } else {
      // Create the hook inline if source file not found
      const hookContent = `#!/bin/bash

# AI Agent Session Tracking - Post-Commit Hook
# Reminds AI agents to update SESSION_HANDOFF.md with context after commits

COMMIT_HASH=$(git rev-parse --short HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B)
CHANGED_FILES=$(git diff-tree --no-commit-id --name-only -r HEAD)
FILES_COUNT=$(echo "$CHANGED_FILES" | wc -l)

echo ""
echo "🤖 AI Agent Reminder: You just committed $COMMIT_HASH"
echo "📝 Commit: $COMMIT_MSG"
echo "📁 Files changed: $FILES_COUNT"
echo ""

# Check if SESSION_HANDOFF.md was updated recently (within last 5 minutes)
HANDOFF_FILE="SESSION_HANDOFF.md"
if [ -f "$HANDOFF_FILE" ]; then
    LAST_MODIFIED=$(stat -c %Y "$HANDOFF_FILE" 2>/dev/null || stat -f %m "$HANDOFF_FILE" 2>/dev/null)
    CURRENT_TIME=$(date +%s)
    TIME_DIFF=$((CURRENT_TIME - LAST_MODIFIED))
    
    if [ $TIME_DIFF -gt 300 ]; then  # More than 5 minutes ago
        echo "⚠️  SESSION_HANDOFF.md was last updated $(($TIME_DIFF / 60)) minutes ago"
        echo ""
        echo "🔥 REQUIRED: Update SESSION_HANDOFF.md with context about this commit:"
        echo "   - WHY did you make these changes?"
        echo "   - What approach did you choose and why?"
        echo "   - Any challenges or discoveries?"
        echo "   - What should be tested or validated next?"
        echo ""
        echo "💡 The next AI agent needs your reasoning, not just the file changes!"
        echo ""
    else
        echo "✅ SESSION_HANDOFF.md recently updated - good job maintaining context!"
    fi
else
    echo "🚨 CRITICAL: SESSION_HANDOFF.md not found!"
    echo ""
    echo "🔥 REQUIRED: Create SESSION_HANDOFF.md immediately with:"
    echo "   - Your role and what you're working on"
    echo "   - Context about this commit: $COMMIT_MSG"
    echo "   - Why you chose this approach"
    echo "   - What the next agent should know"
    echo ""
    echo "Run: uds-ai-setup generate-handoff --role your-role"
    echo ""
fi

# Extra reminder for significant commits
if [ $FILES_COUNT -gt 3 ] || echo "$COMMIT_MSG" | grep -qi "major\\|significant\\|important\\|breaking\\|refactor"; then
    echo "🚨 SIGNIFICANT COMMIT DETECTED ($FILES_COUNT files)"
    echo ""
    echo "This commit appears important - extra context needed:"
    echo "   - What was the problem you solved?"
    echo "   - Why this solution over alternatives?"
    echo "   - What could break from this change?"
    echo "   - What needs testing before next steps?"
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
`;
      
      fs.writeFileSync(hookFile, hookContent);
      fs.chmodSync(hookFile, 0o755);
      console.log(chalk.green('✅ Post-commit hook installed - will remind you to update SESSION_HANDOFF.md'));
    }
    
  } catch (error) {
    console.log(chalk.yellow(`⚠️  Failed to install post-commit hook: ${error.message}`));
  }
}

async function generateAgentInstructions(config) {
  const timestamp = new Date().toISOString().split('T')[0];
  const enabledRoles = Object.entries(config.roles).filter(([_, role]) => role.enabled);
  
  const instructionsContent = `# AI Agent Onboarding Instructions
=============================

Welcome AI Agent. You are starting a new session on the **${config.project.name}** project. 

**IMPORTANT: ALWAYS complete the onboarding process first before assuming any role. Do not ask which role to take - onboard first.**

**CRITICAL: NO AI TOOL MENTIONS in public-facing content. Do not mention Claude, AI agents, ChatGPT, LLMs, or any AI tools in commits, issues, tags, versions, documentation, website content, or any public-facing materials. This is a professional ${config.project.type} project.**

## 🚀 MANDATORY ONBOARDING STEPS

Follow these instructions precisely:

1. **Start with the README**: Read \`README.md\` - specifically any "Development Prerequisites" section for required infrastructure setup.

2. **Required Reading**: Follow the prerequisite docs in order:
   - \`DEVELOPMENT_PREREQUISITES.md\` - Development standards (if exists)
   - \`SESSION_HANDOFF.md\` - Current project status and previous agent work (REQUIRED)
   - \`.ai/context.md\` - AI-specific project context (if exists)
   - \`docs/handoffs/\` - Session handoff documentation

3. **Project Context**: Use git to review recent activity:
   \`\`\`bash
   git log --oneline -5
   git status
   \`\`\`

4. **Role Assignment**: After completing onboarding, review your specific role responsibilities below.

## 🎭 AVAILABLE AI AGENT ROLES

The following roles have been configured for this project:

${enabledRoles.map(([key, role]) => `
### ${role.name}
**Key**: \`${key}\`
**Description**: ${role.description}
**Focus Areas**: ${role.focus.join(', ')}
${role.customized || role.custom ? '**Note**: This role has been customized for this project' : ''}
`).join('')}

${enabledRoles.length === 0 ? '⚠️  No roles have been enabled. Run `uds ai-agent-setup configure` to set up roles.' : ''}

## 📋 ROLE SELECTION GUIDELINES

### If No Role is Specified in Session:
1. Review the current \`SESSION_HANDOFF.md\` to understand what the previous agent was working on
2. Check \`git log --oneline -5\` to see recent commits and active development areas  
3. Look at current issues or project status to understand immediate needs
4. Select the most appropriate role based on current project priorities

### Quick Role Assignment Guide:
${generateRoleAssignmentGuide(enabledRoles, config.project.type)}

## 📤 SESSION HANDOFF REQUIREMENTS

**CRITICAL**: You MUST update SESSION_HANDOFF.md throughout your session, not just at the end.

### MANDATORY Updates Required:

1. **After completing any major task** - Add WHY you chose that approach
2. **When encountering obstacles** - Document what didn't work and why  
3. **Before trying risky changes** - Record current state and reasoning
4. **When making architectural decisions** - Explain the tradeoffs considered
5. **At session end** - Complete handoff with full context

### What to Document (Git can't tell us):
- **Decision Reasoning**: Why you chose approach A over B
- **Failed Attempts**: What you tried that didn't work  
- **Discoveries**: Insights about the codebase or problem
- **Assumptions**: What you're assuming about requirements
- **Risks**: What could break or needs careful testing
- **Context**: Business logic or domain knowledge gained

### Handoff Template Structure:
\`\`\`markdown
# SESSION HANDOFF DOCUMENTATION
Date: YYYY-MM-DD  
Session Type: [Your Role] - [Brief Description]
Project: ${config.project.name}

## CURRENT STATE SUMMARY

### ✅ COMPLETED THIS SESSION
- [Task 1]: Description and files modified
- [Task 2]: Description and outcomes

### 🔄 IN PROGRESS
- [Task]: What was started but not finished
- [Location]: Specific files or areas being worked on
- [Next Steps]: What the next agent should continue

### 📋 NEXT PRIORITIES (In Order)
1. [Most urgent task] - [Estimated effort/complexity]
2. [Secondary task] - [Dependencies or requirements] 
3. [Future improvement] - [Nice-to-have]

## FILES MODIFIED IN THIS SESSION

### New Files Created
- \`path/to/file.js\` - Purpose and description

### Major Updates  
- \`path/to/file.js\` - What was changed and why

### Files Removed/Moved
- \`old/path\` → \`new/path\` - Reason for change

## ROLE-SPECIFIC HANDOFF

### For Next [Your Role] Agent:
- [Important context about work done]
- [Any patterns or conventions established]
- [Decisions made and reasoning]

### For Other Roles:
- [Dependencies created for other roles]
- [Integration points that need attention]

## ⚠️ BLOCKING ISSUES

- [Any problems that prevented completion]
- [External dependencies needed]
- [Decisions requiring clarification]

## 🎯 RECOMMENDED NEXT ROLE

**Suggested**: [role-key] - [Reason why this role should take over]
**Alternative**: [role-key] - [If suggested role unavailable]

---

**Session Summary**: [1-2 sentence summary of what was accomplished]
**Handoff Status**: ✅ Complete / ⚠️ Partial / 🔄 Continuing
\`\`\`

## 🛠️ PROJECT-SPECIFIC CONTEXT

### Project: ${config.project.name}
- **Type**: ${config.project.type}
- **Primary Language**: ${getProjectLanguage(config.project.type)}
- **Architecture**: ${getProjectArchitecture(config.project.type)}

### Development Environment
- **Setup Tool**: Universal Dev Environment v${config.version}
- **Container Strategy**: ${getContainerStrategy(config.project.type)}
- **Key Directories**: ${getKeyDirectories(config.project.type).join(', ')}

### AI Agent Integration
- **Configuration File**: \`.ai-agent-config.json\`
- **Onboarding**: This file (\`AI_AGENT_ONBOARDING.md\`)
- **Session Handoffs**: \`SESSION_HANDOFF.md\` (updated each session)
- **AI Context**: \`.ai/\` directory (if exists)

---

**Configuration Updated**: ${timestamp}  
**Enabled Roles**: ${enabledRoles.length}/${Object.keys(config.roles).length}  
**Custom Roles**: ${Object.values(config.roles).filter(r => r.custom || r.customized).length}

**Remember**: Your role is to continue the work efficiently and hand it off clearly to the next agent. Always read existing handoffs first, then create your own handoff when done.
`;

  fs.writeFileSync('AI_AGENT_ONBOARDING.md', instructionsContent);
  
  // Save configuration
  saveAgentConfig(config);
  
  // Install post-commit hook if auto-tracking is enabled
  if (config.autoTracking) {
    installPostCommitHook();
  }
  
  // Generate initial handoff template if it doesn't exist
  if (!fs.existsSync('SESSION_HANDOFF.md')) {
    generateInitialHandoff(config);
  }
}

function generateRoleAssignmentGuide(enabledRoles, projectType) {
  const guidelines = {
    'react': [
      '**Frontend changes needed**: Senior Software Engineer',
      '**Component testing**: QA Engineer', 
      '**Performance optimization**: Senior Software Engineer',
      '**Documentation updates**: Technical Writer'
    ],
    'python': [
      '**Data analysis/ML work**: Senior Data Scientist',
      '**Algorithm development**: AI/ML Research Scientist',
      '**Code optimization**: Senior Software Engineer', 
      '**Research documentation**: Technical Writer'
    ],
    'node': [
      '**API development**: Senior Software Engineer',
      '**Database optimization**: Database Administrator',
      '**Deployment issues**: DevOps Engineer',
      '**Security concerns**: Cybersecurity Analyst'
    ],
    'research': [
      '**Research advancement**: AI/ML Research Scientist',
      '**Data analysis**: Senior Data Scientist',
      '**Documentation**: Technical Writer',
      '**Validation**: QA Engineer'
    ],
    'infrastructure': [
      '**Infrastructure changes**: DevOps Engineer',
      '**Security assessment**: Cybersecurity Analyst',
      '**Performance monitoring**: Database Administrator',
      '**Documentation**: Technical Writer'
    ]
  };

  const defaultGuidelines = [
    '**Code changes needed**: Senior Software Engineer',
    '**Testing required**: QA Engineer',
    '**Documentation gaps**: Technical Writer',
    '**Planning/coordination**: Project Manager'
  ];

  const projectGuidelines = guidelines[projectType] || defaultGuidelines;
  
  return enabledRoles.length > 0 ? projectGuidelines.join('\n') : 
    'Configure roles first using `uds ai-agent-setup configure`';
}

function generateInitialHandoff(config) {
  const timestamp = new Date().toISOString().split('T')[0];
  
  const handoffContent = `# SESSION HANDOFF DOCUMENTATION
Date: ${timestamp}  
Session Type: Initial Setup - AI Agent Configuration
Project: ${config.project.name}

## CURRENT STATE SUMMARY

### ✅ COMPLETED THIS SESSION
- ✅ **AI Agent Configuration**: Set up ${Object.values(config.roles).filter(r => r.enabled).length} available agent roles
- ✅ **Project Setup**: Configured for ${config.project.type} development
- ✅ **Onboarding Instructions**: Generated AI_AGENT_ONBOARDING.md with role guidelines

### 🔄 NEXT PRIORITIES
1. **Environment Validation**: Verify development environment is working correctly
2. **Initial Development**: Begin core project implementation based on project type
3. **Documentation**: Update project README and technical documentation
4. **Testing Framework**: Set up appropriate testing structure

## CONFIGURED AI AGENT ROLES

### Enabled Roles:
${Object.entries(config.roles)
  .filter(([_, role]) => role.enabled)
  .map(([key, role]) => `- **${role.name}** (\`${key}\`): ${role.description.substring(0, 100)}...`)
  .join('\n')}

### Role Assignment Context:
- **Primary Project Type**: ${config.project.type}
- **Development Focus**: ${getProjectFocus(config.project.type)}
- **Most Needed Roles**: ${getMostNeededRoles(config.project.type, config.roles)}

## FILES CREATED IN THIS SESSION

### AI Agent Configuration
- \`AI_AGENT_ONBOARDING.md\` - Complete onboarding instructions for new AI agents
- \`.ai-agent-config.json\` - Role configuration and project settings
- \`SESSION_HANDOFF.md\` - This handoff template for future sessions

## 🎯 RECOMMENDED NEXT ROLE

**Suggested**: ${getRecommendedNextRole(config.project.type, config.roles)} - Begin core project development
**Alternative**: project-manager - Plan and organize development roadmap

## 🛠️ PROJECT STATUS

**Environment**: ✅ AI Agent roles configured  
**Documentation**: ✅ Onboarding instructions ready
**Development**: 🔄 Ready to begin based on project type
**Next Session**: Ready for role-based development work

---

**Handoff Status**: ✅ Complete  
**AI Agent System**: Ready for multi-agent collaboration
`;

  fs.writeFileSync('SESSION_HANDOFF.md', handoffContent);
}

function generateSessionHandoff(config, roleKey, sessionSummary) {
  const role = config.roles[roleKey];
  const timestamp = new Date().toISOString().split('T')[0];
  
  const handoffTemplate = `# SESSION HANDOFF DOCUMENTATION
Date: ${timestamp}  
Session Type: ${role ? role.name : roleKey} - ${sessionSummary}
Project: ${config.project.name}

## CURRENT STATE SUMMARY

### ✅ COMPLETED THIS SESSION
- [ ] **Task 1**: Description of what was accomplished
- [ ] **Task 2**: Files modified and outcomes

### 🔄 IN PROGRESS
- **Task**: What was started but not finished
- **Location**: Specific files or areas being worked on  
- **Next Steps**: What the next agent should continue with

### 📋 NEXT PRIORITIES (In Order)
1. **[Priority Task]** - [Estimated effort] - [Dependencies]
2. **[Secondary Task]** - [Requirements] 
3. **[Future Enhancement]** - [Nice-to-have]

## FILES MODIFIED IN THIS SESSION

### New Files Created
- \`path/to/file.ext\` - Purpose and functionality

### Major Updates
- \`path/to/file.ext\` - Description of changes made and reasoning

### Files Removed/Moved  
- \`old/path\` → \`new/path\` - Reason for change

## ${role ? role.name.toUpperCase() : roleKey.toUpperCase()} ROLE HANDOFF

### For Next ${role ? role.name : roleKey} Agent:
- **Context**: [Important context about work done in this role]
- **Patterns**: [Any coding patterns or conventions established] 
- **Decisions**: [Key decisions made and reasoning]
- **Blockers**: [Any role-specific issues encountered]

### For Other Roles:
- **Dependencies Created**: [What other roles might need to work on]
- **Integration Points**: [Areas needing cross-role coordination]
- **Documentation Needs**: [What documentation updates are needed]

## ⚠️ BLOCKING ISSUES

- **Issue 1**: [Description of any problems preventing completion]
- **External Dependencies**: [Waiting on external factors]
- **Decisions Needed**: [Requiring project lead or stakeholder input]

## 🎯 RECOMMENDED NEXT ROLE

**Primary**: \`role-key\` - [Specific reason why this role should take over next]
**Alternative**: \`role-key\` - [If primary role unavailable]
**Dependencies**: [Any setup or completion needed before next role can work]

---

**Session Summary**: ${sessionSummary}
**Work Quality**: [Self-assessment: Complete/Partial/Needs-Review]  
**Handoff Status**: ✅ Complete
**Ready for Next Agent**: [Yes/No - if no, explain what's needed]

*Generated by AI Agent Onboarding System v${packageJson.version}*
`;

  // Backup existing handoff
  if (fs.existsSync('SESSION_HANDOFF.md')) {
    const backupDir = '.handoffs';
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }
    
    const backupFile = path.join(backupDir, `handoff-${timestamp}-${Date.now()}.md`);
    fs.copyFileSync('SESSION_HANDOFF.md', backupFile);
  }

  fs.writeFileSync('SESSION_HANDOFF.md', handoffTemplate);
}

function getProjectLanguage(projectType) {
  const languages = {
    'react': 'JavaScript/TypeScript',
    'node': 'JavaScript/TypeScript', 
    'python': 'Python',
    'full-stack': 'JavaScript + Backend',
    'research': 'Python/R',
    'data-science': 'Python',
    'infrastructure': 'YAML/Shell/Go',
    'enterprise': 'Mixed'
  };
  return languages[projectType] || 'Mixed';
}

function getProjectArchitecture(projectType) {
  const architectures = {
    'react': 'Frontend SPA',
    'node': 'Backend API',
    'python': 'Application/Scripts',
    'full-stack': 'Frontend + Backend',
    'research': 'Research Pipeline',
    'data-science': 'Data Processing Pipeline', 
    'infrastructure': 'Infrastructure as Code',
    'enterprise': 'Enterprise Application'
  };
  return architectures[projectType] || 'Custom';
}

function getContainerStrategy(projectType) {
  const strategies = {
    'react': 'DevContainer',
    'node': 'Docker',
    'python': 'DevContainer + Conda',
    'full-stack': 'Docker Compose',
    'research': 'DevContainer',
    'data-science': 'DevContainer + ML Tools',
    'infrastructure': 'Multi-container',
    'enterprise': 'Orchestrated'
  };
  return strategies[projectType] || 'DevContainer';
}

function getKeyDirectories(projectType) {
  const directories = {
    'react': ['src/', 'public/', 'tests/'],
    'node': ['src/', 'routes/', 'tests/'],
    'python': ['src/', 'tests/', 'scripts/', 'docs/'],
    'full-stack': ['frontend/', 'backend/', 'tests/'],
    'research': ['experiments/', 'papers/', 'validation/', 'docs/'],
    'data-science': ['notebooks/', 'data/', 'models/', 'reports/'],
    'infrastructure': ['deployment/', 'k8s/', 'scripts/'],
    'enterprise': ['src/', 'tests/', 'docs/', 'deployment/']
  };
  return directories[projectType] || ['src/', 'tests/', 'docs/'];
}

function getProjectFocus(projectType) {
  const focuses = {
    'react': 'Frontend development and user experience',
    'node': 'Backend API development and server architecture',
    'python': 'Application development and scripting',
    'full-stack': 'End-to-end application development',
    'research': 'Scientific research and experimentation',
    'data-science': 'Data analysis and machine learning',
    'infrastructure': 'System architecture and deployment',
    'enterprise': 'Business application development'
  };
  return focuses[projectType] || 'General development';
}

function getMostNeededRoles(projectType, roles) {
  const enabledRoles = Object.entries(roles).filter(([_, role]) => role.enabled);
  
  const priorityRoles = {
    'react': ['senior-software-engineer', 'qa-engineer', 'technical-writer'],
    'node': ['senior-software-engineer', 'devops-engineer', 'cybersecurity-analyst'],
    'python': ['senior-data-scientist', 'ai-research-scientist', 'qa-engineer'],
    'full-stack': ['senior-software-engineer', 'devops-engineer', 'qa-engineer'],
    'research': ['ai-research-scientist', 'senior-data-scientist', 'technical-writer'],
    'data-science': ['senior-data-scientist', 'ai-research-scientist', 'database-administrator'],
    'infrastructure': ['devops-engineer', 'cybersecurity-analyst', 'database-administrator'],
    'enterprise': ['senior-software-engineer', 'project-manager', 'cybersecurity-analyst']
  };

  const projectPriorities = priorityRoles[projectType] || ['senior-software-engineer', 'qa-engineer'];
  
  return projectPriorities
    .filter(roleKey => enabledRoles.some(([key]) => key === roleKey))
    .map(roleKey => {
      const role = enabledRoles.find(([key]) => key === roleKey);
      return role ? role[1].name : roleKey;
    })
    .slice(0, 3)
    .join(', ');
}

function getRecommendedNextRole(projectType, roles) {
  const enabledRoles = Object.entries(roles).filter(([_, role]) => role.enabled);
  
  const recommendations = {
    'react': 'senior-software-engineer',
    'node': 'senior-software-engineer', 
    'python': 'senior-data-scientist',
    'full-stack': 'senior-software-engineer',
    'research': 'ai-research-scientist',
    'data-science': 'senior-data-scientist',
    'infrastructure': 'devops-engineer',
    'enterprise': 'project-manager'
  };

  const recommended = recommendations[projectType] || 'senior-software-engineer';
  
  // Check if recommended role is enabled
  const foundRole = enabledRoles.find(([key]) => key === recommended);
  if (foundRole) {
    return `${recommended} (${foundRole[1].name})`;
  }
  
  // Fallback to first enabled role
  const fallback = enabledRoles[0];
  return fallback ? `${fallback[0]} (${fallback[1].name})` : 'No roles enabled';
}

// Only run CLI when executed directly
if (require.main === module) {
  program.parse();
}

module.exports = {
  DEFAULT_AGENT_ROLES,
  loadAgentConfig,
  saveAgentConfig,
  generateAgentInstructions
};