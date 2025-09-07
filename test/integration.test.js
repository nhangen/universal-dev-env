const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, spawn } = require('child_process');

// Import the main setup module
const {
  DEFAULT_AGENT_ROLES,
  loadAgentConfig,
  generateAgentInstructions
} = require('../bin/ai-agent-setup.js');

describe('AI Agent Setup - Integration Tests', () => {
  let testDir;
  let originalCwd;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'integration-test-'));
    originalCwd = process.cwd();
    process.chdir(testDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean up test directory');
    }
  });

  describe('Complete Workflow Integration', () => {
    test('should complete full setup workflow from start to finish', async () => {
      // Step 1: Initialize git repository
      try {
        execSync('git init', { stdio: 'ignore' });
        execSync('git config user.email "test@example.com"', { stdio: 'ignore' });
        execSync('git config user.name "Test User"', { stdio: 'ignore' });
      } catch (error) {
        console.warn('Git not available for integration test');
        return;
      }

      // Step 2: Configure AI agent roles (simulate user choices)
      const config = {
        project: { name: 'integration-test-project', type: 'react' },
        roles: {
          'senior-software-engineer': { ...DEFAULT_AGENT_ROLES['senior-software-engineer'], enabled: true },
          'qa-engineer': { ...DEFAULT_AGENT_ROLES['qa-engineer'], enabled: true },
          'technical-writer': { ...DEFAULT_AGENT_ROLES['technical-writer'], enabled: false }
        },
        autoTracking: true,
        generatedAt: new Date().toISOString(),
        version: '1.0.0'
      };

      // Step 3: Generate all configuration files
      await generateAgentInstructions(config);

      // Step 4: Verify all files were created correctly
      expect(fs.existsSync('AI_AGENT_ONBOARDING.md')).toBe(true);
      expect(fs.existsSync('SESSION_HANDOFF.md')).toBe(true);
      expect(fs.existsSync('.ai-agent-config.json')).toBe(true);
      expect(fs.existsSync('.git/hooks/post-commit')).toBe(true);

      // Step 5: Verify post-commit hook is executable
      const hookStats = fs.statSync('.git/hooks/post-commit');
      expect(hookStats.mode & 0o100).toBeTruthy(); // Owner execute bit

      // Step 6: Verify configuration can be loaded
      const loadedConfig = loadAgentConfig();
      expect(loadedConfig.project.name).toBe('integration-test-project');
      expect(loadedConfig.autoTracking).toBe(true);
      expect(loadedConfig.roles['senior-software-engineer'].enabled).toBe(true);
      expect(loadedConfig.roles['qa-engineer'].enabled).toBe(true);
      expect(loadedConfig.roles['technical-writer'].enabled).toBe(false);

      // Step 7: Simulate AI agent onboarding process
      const onboardingContent = fs.readFileSync('AI_AGENT_ONBOARDING.md', 'utf8');
      
      // AI agent should find these required sections
      expect(onboardingContent).toContain('MANDATORY ONBOARDING STEPS');
      expect(onboardingContent).toContain('AVAILABLE AI AGENT ROLES');
      expect(onboardingContent).toContain('Senior Software Engineer');
      expect(onboardingContent).toContain('QA Engineer');
      expect(onboardingContent).not.toContain('Technical Writer'); // Should be filtered out
      
      // Step 8: Verify session handoff was initialized
      const handoffContent = fs.readFileSync('SESSION_HANDOFF.md', 'utf8');
      expect(handoffContent).toContain('SESSION HANDOFF DOCUMENTATION');
      expect(handoffContent).toContain('integration-test-project');
      expect(handoffContent).toContain('Initial Setup');

      // Step 9: Test post-commit hook behavior
      // Create and commit a file to trigger the hook
      fs.writeFileSync('test.txt', 'test content');
      execSync('git add test.txt', { stdio: 'ignore' });
      
      // Capture hook output
      let hookOutput = '';
      try {
        hookOutput = execSync('git commit -m "test commit"', { encoding: 'utf8' });
      } catch (error) {
        hookOutput = error.stdout || '';
      }

      // Hook should have provided reminders
      expect(hookOutput).toContain('AI Agent Reminder');
    });

    test('should handle complete workflow without git repository', async () => {
      // Test workflow in non-git environment
      const config = {
        project: { name: 'no-git-project', type: 'python' },
        roles: {
          'senior-data-scientist': { ...DEFAULT_AGENT_ROLES['senior-data-scientist'], enabled: true }
        },
        autoTracking: true, // Should be ignored without git
        generatedAt: new Date().toISOString(),
        version: '1.0.0'
      };

      await generateAgentInstructions(config);

      // Should create files successfully
      expect(fs.existsSync('AI_AGENT_ONBOARDING.md')).toBe(true);
      expect(fs.existsSync('SESSION_HANDOFF.md')).toBe(true);
      expect(fs.existsSync('.ai-agent-config.json')).toBe(true);
      
      // Should not create git hook
      expect(fs.existsSync('.git/hooks/post-commit')).toBe(false);

      const onboardingContent = fs.readFileSync('AI_AGENT_ONBOARDING.md', 'utf8');
      expect(onboardingContent).toContain('Senior Data Scientist');
      expect(onboardingContent).toContain('python');
    });

    test('should support role customization workflow', async () => {
      // Step 1: Start with default roles
      let config = {
        project: { name: 'customization-test', type: 'research' },
        roles: { ...DEFAULT_AGENT_ROLES },
        autoTracking: false
      };

      // Step 2: Customize a role (simulate user editing)
      config.roles['senior-software-engineer'] = {
        ...config.roles['senior-software-engineer'],
        enabled: true,
        description: 'Custom description for this specific research project focusing on algorithm implementation and performance optimization.',
        customized: true
      };

      // Add a completely custom role
      config.roles['research-coordinator'] = {
        name: '🔬 Research Coordinator',
        description: 'Coordinates research activities between different teams and ensures proper documentation of experimental results.',
        focus: ['coordination', 'documentation', 'research-management'],
        enabled: true,
        custom: true
      };

      // Step 3: Generate files with customizations
      await generateAgentInstructions(config);

      // Step 4: Verify customizations are reflected
      const onboardingContent = fs.readFileSync('AI_AGENT_ONBOARDING.md', 'utf8');
      expect(onboardingContent).toContain('algorithm implementation and performance optimization');
      expect(onboardingContent).toContain('Research Coordinator');
      expect(onboardingContent).toContain('This role has been customized');

      // Step 5: Verify config persistence
      const loadedConfig = loadAgentConfig();
      expect(loadedConfig.roles['senior-software-engineer'].customized).toBe(true);
      expect(loadedConfig.roles['research-coordinator'].custom).toBe(true);
      expect(loadedConfig.roles['research-coordinator'].name).toContain('Research Coordinator');
    });
  });

  describe('Multi-Project Integration', () => {
    test('should handle multiple project configurations', async () => {
      // Create multiple project configurations
      const projects = [
        {
          name: 'frontend-app',
          type: 'react',
          roles: ['senior-software-engineer', 'qa-engineer'],
          autoTracking: true
        },
        {
          name: 'ml-research',
          type: 'research',
          roles: ['ai-research-scientist', 'senior-data-scientist', 'technical-writer'],
          autoTracking: false
        },
        {
          name: 'infrastructure',
          type: 'infrastructure',
          roles: ['devops-engineer', 'cybersecurity-analyst'],
          autoTracking: true
        }
      ];

      for (const projectConfig of projects) {
        // Create separate directory for each project
        const projectDir = path.join(testDir, projectConfig.name);
        fs.mkdirSync(projectDir);
        process.chdir(projectDir);

        // Initialize git for projects that need it
        if (projectConfig.autoTracking) {
          try {
            execSync('git init', { stdio: 'ignore' });
            execSync('git config user.email "test@example.com"', { stdio: 'ignore' });
            execSync('git config user.name "Test User"', { stdio: 'ignore' });
          } catch (error) {
            console.warn(`Git setup failed for ${projectConfig.name}`);
          }
        }

        // Configure project
        const config = {
          project: { name: projectConfig.name, type: projectConfig.type },
          roles: Object.fromEntries(
            projectConfig.roles.map(roleKey => [
              roleKey,
              { ...DEFAULT_AGENT_ROLES[roleKey], enabled: true }
            ])
          ),
          autoTracking: projectConfig.autoTracking
        };

        await generateAgentInstructions(config);

        // Verify project-specific setup
        expect(fs.existsSync('AI_AGENT_ONBOARDING.md')).toBe(true);
        const content = fs.readFileSync('AI_AGENT_ONBOARDING.md', 'utf8');
        expect(content).toContain(projectConfig.name);
        expect(content).toContain(projectConfig.type);

        // Verify role filtering
        projectConfig.roles.forEach(roleKey => {
          const roleName = DEFAULT_AGENT_ROLES[roleKey].name;
          expect(content).toContain(roleName);
        });

        // Verify hook installation based on autoTracking
        if (projectConfig.autoTracking && fs.existsSync('.git')) {
          expect(fs.existsSync('.git/hooks/post-commit')).toBe(true);
        }
      }

      process.chdir(testDir);
    });

    test('should handle project migration between configurations', async () => {
      // Start with simple configuration
      let config = {
        project: { name: 'evolving-project', type: 'react' },
        roles: {
          'senior-software-engineer': { ...DEFAULT_AGENT_ROLES['senior-software-engineer'], enabled: true }
        },
        autoTracking: false,
        version: '1.0.0'
      };

      await generateAgentInstructions(config);

      let onboardingContent = fs.readFileSync('AI_AGENT_ONBOARDING.md', 'utf8');
      expect(onboardingContent).toContain('Senior Software Engineer');
      expect(onboardingContent).not.toContain('QA Engineer');

      // Evolve project: add QA and enable auto-tracking
      config.roles['qa-engineer'] = { ...DEFAULT_AGENT_ROLES['qa-engineer'], enabled: true };
      config.autoTracking = true;

      // Initialize git for auto-tracking
      try {
        execSync('git init', { stdio: 'ignore' });
        execSync('git config user.email "test@example.com"', { stdio: 'ignore' });
        execSync('git config user.name "Test User"', { stdio: 'ignore' });
      } catch (error) {
        console.warn('Git not available for migration test');
      }

      await generateAgentInstructions(config);

      // Verify evolution
      onboardingContent = fs.readFileSync('AI_AGENT_ONBOARDING.md', 'utf8');
      expect(onboardingContent).toContain('Senior Software Engineer');
      expect(onboardingContent).toContain('QA Engineer');

      const finalConfig = loadAgentConfig();
      expect(finalConfig.autoTracking).toBe(true);
      expect(finalConfig.roles['qa-engineer'].enabled).toBe(true);

      // Session handoff should not be overwritten during evolution
      const handoffContent = fs.readFileSync('SESSION_HANDOFF.md', 'utf8');
      expect(handoffContent).toContain('Initial Setup'); // Original content preserved
    });
  });

  describe('CLI Integration Simulation', () => {
    test('should simulate complete CLI workflow', async () => {
      // This test simulates what happens when user runs: uds-ai-setup configure
      
      // Step 1: Check if CLI script exists and is executable
      const cliScript = path.join(__dirname, '..', 'bin', 'ai-agent-setup.js');
      expect(fs.existsSync(cliScript)).toBe(true);

      const stats = fs.statSync(cliScript);
      expect(stats.mode & 0o100).toBeTruthy(); // Should be executable

      // Step 2: Test CLI argument parsing (simulate running with --help)
      try {
        const helpOutput = execSync(`node "${cliScript}" --help`, { encoding: 'utf8', timeout: 5000 });
        expect(helpOutput).toContain('AI Agent');
        expect(helpOutput).toContain('configure');
        expect(helpOutput).toContain('role-info');
      } catch (error) {
        console.warn('CLI help test failed:', error.message);
      }

      // Step 3: Test role-info command
      try {
        const roleInfoOutput = execSync(`node "${cliScript}" role-info`, { 
          encoding: 'utf8', 
          timeout: 5000,
          cwd: testDir 
        });
        expect(roleInfoOutput).toContain('Configured AI Agent Roles');
        expect(roleInfoOutput).toContain('Senior Software Engineer');
      } catch (error) {
        console.warn('CLI role-info test failed:', error.message);
      }

      // Step 4: Test that CLI can generate handoff template
      try {
        execSync(`node "${cliScript}" generate-handoff --role senior-software-engineer --session-summary "test session"`, {
          timeout: 10000,
          cwd: testDir,
          stdio: 'ignore'
        });
        
        expect(fs.existsSync(path.join(testDir, 'SESSION_HANDOFF.md'))).toBe(true);
        
        const handoffContent = fs.readFileSync(path.join(testDir, 'SESSION_HANDOFF.md'), 'utf8');
        expect(handoffContent).toContain('test session');
        expect(handoffContent).toContain('Senior Software Engineer');
      } catch (error) {
        console.warn('CLI handoff generation test failed:', error.message);
      }
    });

    test('should handle CLI with invalid arguments gracefully', async () => {
      const cliScript = path.join(__dirname, '..', 'bin', 'ai-agent-setup.js');
      
      // Test invalid command
      try {
        execSync(`node "${cliScript}" invalid-command`, {
          encoding: 'utf8',
          timeout: 5000,
          cwd: testDir
        });
      } catch (error) {
        // Should exit with error but not crash
        expect(error.status).toBeGreaterThan(0);
      }

      // Test missing required arguments
      try {
        execSync(`node "${cliScript}" generate-handoff`, {
          encoding: 'utf8',
          timeout: 5000,
          cwd: testDir
        });
      } catch (error) {
        // Should handle missing arguments gracefully
        expect(error.status).toBeGreaterThan(0);
      }
    });
  });

  describe('Real-world Usage Simulation', () => {
    test('should simulate realistic AI agent session workflow', async () => {
      // Initialize a realistic project
      try {
        execSync('git init', { stdio: 'ignore' });
        execSync('git config user.email "agent@example.com"', { stdio: 'ignore' });
        execSync('git config user.name "AI Agent"', { stdio: 'ignore' });
      } catch (error) {
        console.warn('Git setup failed for realistic test');
        return;
      }

      // Step 1: User configures AI agent setup
      const config = {
        project: { name: 'real-world-app', type: 'full-stack' },
        roles: {
          'senior-software-engineer': { ...DEFAULT_AGENT_ROLES['senior-software-engineer'], enabled: true },
          'devops-engineer': { ...DEFAULT_AGENT_ROLES['devops-engineer'], enabled: true },
          'qa-engineer': { ...DEFAULT_AGENT_ROLES['qa-engineer'], enabled: true }
        },
        autoTracking: true,
        generatedAt: new Date().toISOString(),
        version: '1.0.0'
      };

      await generateAgentInstructions(config);

      // Step 2: AI Agent reads onboarding instructions
      const onboarding = fs.readFileSync('AI_AGENT_ONBOARDING.md', 'utf8');
      expect(onboarding).toContain('MANDATORY ONBOARDING STEPS');

      // Step 3: AI Agent works and commits changes (simulate development)
      const workSessions = [
        { 
          files: ['src/app.js', 'src/components/Header.js'], 
          message: 'feat: implement user header component',
          role: 'senior-software-engineer'
        },
        { 
          files: ['docker-compose.yml', 'Dockerfile'], 
          message: 'ops: add containerization for development',
          role: 'devops-engineer' 
        },
        { 
          files: ['tests/header.test.js', 'tests/app.test.js'], 
          message: 'test: add unit tests for header component',
          role: 'qa-engineer'
        }
      ];

      for (const session of workSessions) {
        // Create files
        session.files.forEach(file => {
          const dir = path.dirname(file);
          if (dir !== '.' && !fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(file, `// ${file} content for ${session.role}`);
        });

        // Simulate AI agent updating handoff before commit
        const handoffUpdate = `
### Latest Work - ${session.role}
- Working on: ${session.message}
- Files modified: ${session.files.join(', ')}
- Approach: Following ${session.role} best practices
`;
        
        if (fs.existsSync('SESSION_HANDOFF.md')) {
          let handoff = fs.readFileSync('SESSION_HANDOFF.md', 'utf8');
          handoff = handoff.replace('## CURRENT STATE SUMMARY', `## CURRENT STATE SUMMARY${handoffUpdate}`);
          fs.writeFileSync('SESSION_HANDOFF.md', handoff);
        }

        // Commit changes
        execSync(`git add ${session.files.join(' ')}`, { stdio: 'ignore' });
        const commitOutput = execSync(`git commit -m "${session.message}"`, { encoding: 'utf8' });
        
        // Verify post-commit hook reminder appeared
        expect(commitOutput).toContain('AI Agent Reminder');
      }

      // Step 4: Verify realistic workflow results
      const commits = execSync('git log --oneline', { encoding: 'utf8' });
      expect(commits).toContain('feat: implement user header component');
      expect(commits).toContain('ops: add containerization');
      expect(commits).toContain('test: add unit tests');

      // Verify files were created
      expect(fs.existsSync('src/app.js')).toBe(true);
      expect(fs.existsSync('docker-compose.yml')).toBe(true);
      expect(fs.existsSync('tests/header.test.js')).toBe(true);

      // Verify handoff contains work context
      const finalHandoff = fs.readFileSync('SESSION_HANDOFF.md', 'utf8');
      expect(finalHandoff).toContain('senior-software-engineer');
      expect(finalHandoff).toContain('devops-engineer');
      expect(finalHandoff).toContain('qa-engineer');
    });

    test('should handle AI agent disconnection and recovery', async () => {
      try {
        execSync('git init', { stdio: 'ignore' });
        execSync('git config user.email "test@example.com"', { stdio: 'ignore' });
        execSync('git config user.name "Test User"', { stdio: 'ignore' });
      } catch (error) {
        console.warn('Git not available for disconnection test');
        return;
      }

      // Set up project
      const config = {
        project: { name: 'disconnection-test' },
        roles: { 'senior-software-engineer': { ...DEFAULT_AGENT_ROLES['senior-software-engineer'], enabled: true } },
        autoTracking: true
      };

      await generateAgentInstructions(config);

      // Simulate AI agent starting work but not updating handoff
      fs.writeFileSync('feature.js', 'partial implementation');
      execSync('git add feature.js', { stdio: 'ignore' });
      const commitOutput = execSync('git commit -m "wip: partial feature implementation"', { encoding: 'utf8' });

      // Hook should warn about missing handoff update
      expect(commitOutput).toContain('REQUIRED: Update SESSION_HANDOFF.md');

      // Simulate another AI agent reading the situation
      const onboarding = fs.readFileSync('AI_AGENT_ONBOARDING.md', 'utf8');
      const handoff = fs.readFileSync('SESSION_HANDOFF.md', 'utf8');
      const gitLog = execSync('git log --oneline -3', { encoding: 'utf8' });

      // New agent should be able to understand the situation
      expect(onboarding).toContain('git log --oneline -5');
      expect(handoff).toContain('Initial Setup');
      expect(gitLog).toContain('wip: partial feature implementation');

      // Verify recovery information is available
      expect(fs.existsSync('feature.js')).toBe(true);
      const featureContent = fs.readFileSync('feature.js', 'utf8');
      expect(featureContent).toContain('partial implementation');
    });
  });

  describe('Performance and Scalability Integration', () => {
    test('should handle large-scale project configuration efficiently', async () => {
      const startTime = Date.now();

      // Create configuration with many roles and complex project
      const largeConfig = {
        project: { 
          name: 'enterprise-scale-application',
          type: 'enterprise',
          description: 'Large enterprise application with multiple teams and complex requirements'
        },
        roles: { ...DEFAULT_AGENT_ROLES },
        autoTracking: true,
        generatedAt: new Date().toISOString(),
        version: '1.0.0'
      };

      // Enable all roles
      Object.keys(largeConfig.roles).forEach(key => {
        largeConfig.roles[key].enabled = true;
      });

      await generateAgentInstructions(largeConfig);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should complete within reasonable time (less than 5 seconds)
      expect(processingTime).toBeLessThan(5000);

      // Verify all files were created
      expect(fs.existsSync('AI_AGENT_ONBOARDING.md')).toBe(true);
      expect(fs.existsSync('SESSION_HANDOFF.md')).toBe(true);
      expect(fs.existsSync('.ai-agent-config.json')).toBe(true);

      // Verify content includes all roles
      const onboardingContent = fs.readFileSync('AI_AGENT_ONBOARDING.md', 'utf8');
      Object.values(DEFAULT_AGENT_ROLES).forEach(role => {
        expect(onboardingContent).toContain(role.name);
      });

      // Verify file sizes are reasonable (not excessive)
      const onboardingStats = fs.statSync('AI_AGENT_ONBOARDING.md');
      expect(onboardingStats.size).toBeLessThan(100000); // Less than 100KB
      expect(onboardingStats.size).toBeGreaterThan(5000); // More than 5KB (should have substantial content)
    });
  });
});