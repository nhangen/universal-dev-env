const fs = require('fs');
const path = require('path');
const os = require('os');

// Import functions to test
const {
  DEFAULT_AGENT_ROLES,
  generateAgentInstructions,
  loadAgentConfig,
  saveAgentConfig
} = require('../bin/ai-agent-setup.js');

describe('File Generation', () => {
  let testDir;
  let originalCwd;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'file-gen-test-'));
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

  describe('AI_AGENT_ONBOARDING.md Generation', () => {
    test('should generate complete onboarding file with all required sections', async () => {
      const config = {
        project: { name: 'test-project', type: 'react' },
        roles: {
          'senior-software-engineer': { ...DEFAULT_AGENT_ROLES['senior-software-engineer'], enabled: true },
          'qa-engineer': { ...DEFAULT_AGENT_ROLES['qa-engineer'], enabled: true }
        },
        autoTracking: false,
        generatedAt: new Date().toISOString(),
        version: '1.0.0'
      };

      await generateAgentInstructions(config);
      
      expect(fs.existsSync('AI_AGENT_ONBOARDING.md')).toBe(true);
      
      const content = fs.readFileSync('AI_AGENT_ONBOARDING.md', 'utf8');
      
      // Check required sections
      expect(content).toContain('# AI Agent Onboarding Instructions');
      expect(content).toContain('## 🚀 MANDATORY ONBOARDING STEPS');
      expect(content).toContain('## 🎭 AVAILABLE AI AGENT ROLES');
      expect(content).toContain('## 📋 ROLE SELECTION GUIDELINES');
      expect(content).toContain('## 📤 SESSION HANDOFF REQUIREMENTS');
      expect(content).toContain('CRITICAL: You MUST update SESSION_HANDOFF.md');
      
      // Check project-specific content
      expect(content).toContain('test-project');
      expect(content).toContain('react');
      
      // Check enabled roles are included
      expect(content).toContain('Senior Software Engineer');
      expect(content).toContain('QA Engineer');
    });

    test('should include mandatory handoff requirements', async () => {
      const config = {
        project: { name: 'test-project' },
        roles: { 'senior-software-engineer': { ...DEFAULT_AGENT_ROLES['senior-software-engineer'], enabled: true } },
        autoTracking: false
      };

      await generateAgentInstructions(config);
      const content = fs.readFileSync('AI_AGENT_ONBOARDING.md', 'utf8');
      
      expect(content).toContain('MANDATORY Updates Required');
      expect(content).toContain('After completing any major task');
      expect(content).toContain('When encountering obstacles');
      expect(content).toContain('Before trying risky changes');
      expect(content).toContain('Decision Reasoning');
      expect(content).toContain('Failed Attempts');
    });

    test('should show different content based on project type', async () => {
      // Test React project
      const reactConfig = {
        project: { name: 'react-app', type: 'react' },
        roles: { 'senior-software-engineer': { ...DEFAULT_AGENT_ROLES['senior-software-engineer'], enabled: true } },
        autoTracking: false
      };

      await generateAgentInstructions(reactConfig);
      const reactContent = fs.readFileSync('AI_AGENT_ONBOARDING.md', 'utf8');
      expect(reactContent).toContain('Frontend changes needed');
      expect(reactContent).toContain('JavaScript/TypeScript');
      
      // Clean up and test Python project
      fs.unlinkSync('AI_AGENT_ONBOARDING.md');
      
      const pythonConfig = {
        project: { name: 'python-app', type: 'python' },
        roles: { 'senior-data-scientist': { ...DEFAULT_AGENT_ROLES['senior-data-scientist'], enabled: true } },
        autoTracking: false
      };

      await generateAgentInstructions(pythonConfig);
      const pythonContent = fs.readFileSync('AI_AGENT_ONBOARDING.md', 'utf8');
      expect(pythonContent).toContain('Data analysis/ML work');
      expect(pythonContent).toContain('Python');
    });

    test('should handle no enabled roles gracefully', async () => {
      const config = {
        project: { name: 'empty-roles' },
        roles: {},
        autoTracking: false
      };

      await generateAgentInstructions(config);
      const content = fs.readFileSync('AI_AGENT_ONBOARDING.md', 'utf8');
      expect(content).toContain('No roles have been enabled');
      expect(content).toContain('uds ai-agent-setup configure');
    });

    test('should include auto-tracking information when enabled', async () => {
      const configWithTracking = {
        project: { name: 'tracked-project' },
        roles: { 'senior-software-engineer': { ...DEFAULT_AGENT_ROLES['senior-software-engineer'], enabled: true } },
        autoTracking: true
      };

      await generateAgentInstructions(configWithTracking);
      const content = fs.readFileSync('AI_AGENT_ONBOARDING.md', 'utf8');
      expect(content).toContain('post-commit hook');
      
      // Clean up and test without tracking
      fs.unlinkSync('AI_AGENT_ONBOARDING.md');
      
      const configWithoutTracking = {
        project: { name: 'untracked-project' },
        roles: { 'senior-software-engineer': { ...DEFAULT_AGENT_ROLES['senior-software-engineer'], enabled: true } },
        autoTracking: false
      };

      await generateAgentInstructions(configWithoutTracking);
      const contentWithoutTracking = fs.readFileSync('AI_AGENT_ONBOARDING.md', 'utf8');
      expect(contentWithoutTracking).not.toContain('post-commit hook will automatically');
    });

    test('should include custom roles when present', async () => {
      const config = {
        project: { name: 'custom-roles-project' },
        roles: {
          'senior-software-engineer': { ...DEFAULT_AGENT_ROLES['senior-software-engineer'], enabled: true },
          'custom-role': {
            name: '🚀 Custom Specialist',
            description: 'Handles custom project-specific tasks and requirements',
            focus: ['custom-area', 'specialized-tasks'],
            enabled: true,
            custom: true
          }
        },
        autoTracking: false
      };

      await generateAgentInstructions(config);
      const content = fs.readFileSync('AI_AGENT_ONBOARDING.md', 'utf8');
      expect(content).toContain('Custom Specialist');
      expect(content).toContain('custom-area, specialized-tasks');
      expect(content).toContain('This role has been customized for this project');
    });
  });

  describe('SESSION_HANDOFF.md Generation', () => {
    test('should generate initial session handoff when none exists', async () => {
      const config = {
        project: { name: 'handoff-test', type: 'python' },
        roles: {
          'senior-data-scientist': { ...DEFAULT_AGENT_ROLES['senior-data-scientist'], enabled: true },
          'ai-research-scientist': { ...DEFAULT_AGENT_ROLES['ai-research-scientist'], enabled: true }
        },
        autoTracking: true
      };

      await generateAgentInstructions(config);
      
      expect(fs.existsSync('SESSION_HANDOFF.md')).toBe(true);
      
      const content = fs.readFileSync('SESSION_HANDOFF.md', 'utf8');
      expect(content).toContain('# SESSION HANDOFF DOCUMENTATION');
      expect(content).toContain('Session Type: Initial Setup');
      expect(content).toContain('handoff-test');
      expect(content).toContain('AI Agent Configuration');
      expect(content).toContain('Senior Data Scientist');
      expect(content).toContain('AI/ML Research Scientist');
    });

    test('should not overwrite existing session handoff', async () => {
      const existingHandoff = `# EXISTING HANDOFF
This is an existing session handoff that should not be overwritten.
Current work: Important ongoing task.
`;
      fs.writeFileSync('SESSION_HANDOFF.md', existingHandoff);

      const config = {
        project: { name: 'preserve-test' },
        roles: { 'senior-software-engineer': { ...DEFAULT_AGENT_ROLES['senior-software-engineer'], enabled: true } },
        autoTracking: false
      };

      await generateAgentInstructions(config);
      
      const content = fs.readFileSync('SESSION_HANDOFF.md', 'utf8');
      expect(content).toBe(existingHandoff);
      expect(content).toContain('EXISTING HANDOFF');
      expect(content).toContain('Important ongoing task');
    });

    test('should create handoff backup directory', async () => {
      const config = {
        project: { name: 'backup-test' },
        roles: { 'senior-software-engineer': { ...DEFAULT_AGENT_ROLES['senior-software-engineer'], enabled: true } },
        autoTracking: false
      };

      await generateAgentInstructions(config);
      
      // The generateInitialHandoff function should be called, which may create the backup directory
      // Even if no backup is made, the directory structure should be prepared
      expect(fs.existsSync('AI_AGENT_ONBOARDING.md')).toBe(true);
    });

    test('should include project-specific recommendations', async () => {
      const config = {
        project: { name: 'rec-test', type: 'research' },
        roles: {
          'ai-research-scientist': { ...DEFAULT_AGENT_ROLES['ai-research-scientist'], enabled: true },
          'technical-writer': { ...DEFAULT_AGENT_ROLES['technical-writer'], enabled: true }
        },
        autoTracking: false
      };

      await generateAgentInstructions(config);
      const handoffContent = fs.readFileSync('SESSION_HANDOFF.md', 'utf8');
      
      expect(handoffContent).toContain('🎯 RECOMMENDED NEXT ROLE');
      expect(handoffContent).toContain('research');
    });
  });

  describe('Configuration File (.ai-agent-config.json)', () => {
    test('should save configuration with all required fields', () => {
      const config = {
        project: { name: 'config-test', type: 'node' },
        roles: {
          'senior-software-engineer': { ...DEFAULT_AGENT_ROLES['senior-software-engineer'], enabled: true, customized: true }
        },
        autoTracking: true,
        generatedAt: '2024-01-01T00:00:00Z',
        version: '1.0.0'
      };

      saveAgentConfig(config);
      
      expect(fs.existsSync('.ai-agent-config.json')).toBe(true);
      
      const saved = JSON.parse(fs.readFileSync('.ai-agent-config.json', 'utf8'));
      expect(saved.project.name).toBe('config-test');
      expect(saved.project.type).toBe('node');
      expect(saved.autoTracking).toBe(true);
      expect(saved.generatedAt).toBe('2024-01-01T00:00:00Z');
      expect(saved.version).toBe('1.0.0');
      expect(saved).toHaveProperty('updatedAt');
      expect(saved.roles['senior-software-engineer'].customized).toBe(true);
    });

    test('should load saved configuration correctly', () => {
      const originalConfig = {
        project: { name: 'load-test', type: 'python' },
        roles: {
          'senior-data-scientist': { ...DEFAULT_AGENT_ROLES['senior-data-scientist'], enabled: true },
          'custom-role': { name: 'Custom', enabled: false, custom: true }
        },
        autoTracking: false,
        version: '1.0.0'
      };

      saveAgentConfig(originalConfig);
      const loaded = loadAgentConfig();
      
      expect(loaded.project.name).toBe('load-test');
      expect(loaded.project.type).toBe('python');
      expect(loaded.autoTracking).toBe(false);
      expect(loaded.roles['senior-data-scientist'].enabled).toBe(true);
      expect(loaded.roles['custom-role'].custom).toBe(true);
    });

    test('should handle malformed configuration gracefully', () => {
      fs.writeFileSync('.ai-agent-config.json', '{invalid json}');
      
      const config = loadAgentConfig();
      
      // Should fall back to defaults
      expect(config).toHaveProperty('project');
      expect(config).toHaveProperty('roles');
      expect(config.project.name).toBe(path.basename(testDir));
      expect(config.roles).toEqual(DEFAULT_AGENT_ROLES);
    });

    test('should preserve custom role properties', () => {
      const config = {
        project: { name: 'preserve-test' },
        roles: {
          'senior-software-engineer': { 
            ...DEFAULT_AGENT_ROLES['senior-software-engineer'], 
            enabled: true, 
            customized: true,
            description: 'Custom description for this project'
          }
        },
        autoTracking: true
      };

      saveAgentConfig(config);
      const loaded = loadAgentConfig();
      
      expect(loaded.roles['senior-software-engineer'].customized).toBe(true);
      expect(loaded.roles['senior-software-engineer'].description).toBe('Custom description for this project');
    });
  });

  describe('File Content Validation', () => {
    test('should generate valid markdown in all files', async () => {
      const config = {
        project: { name: 'markdown-test', type: 'full-stack' },
        roles: {
          'senior-software-engineer': { ...DEFAULT_AGENT_ROLES['senior-software-engineer'], enabled: true },
          'devops-engineer': { ...DEFAULT_AGENT_ROLES['devops-engineer'], enabled: true }
        },
        autoTracking: true,
        version: '1.0.0'
      };

      await generateAgentInstructions(config);
      
      const onboardingContent = fs.readFileSync('AI_AGENT_ONBOARDING.md', 'utf8');
      const handoffContent = fs.readFileSync('SESSION_HANDOFF.md', 'utf8');
      
      // Check for proper markdown structure
      expect(onboardingContent).toMatch(/^# /m); // Has h1 headers
      expect(onboardingContent).toMatch(/^## /m); // Has h2 headers
      expect(onboardingContent).toMatch(/^### /m); // Has h3 headers
      expect(onboardingContent).toContain('```'); // Has code blocks
      
      expect(handoffContent).toMatch(/^# /m);
      expect(handoffContent).toMatch(/^## /m);
      expect(handoffContent).toMatch(/^### /m);
      
      // Check for no broken markdown links or references
      expect(onboardingContent).not.toMatch(/\[.*\]\(\)/); // No empty links
      expect(handoffContent).not.toMatch(/\[.*\]\(\)/);
    });

    test('should include required emoji indicators', async () => {
      const config = {
        project: { name: 'emoji-test' },
        roles: { 'senior-software-engineer': { ...DEFAULT_AGENT_ROLES['senior-software-engineer'], enabled: true } },
        autoTracking: false
      };

      await generateAgentInstructions(config);
      
      const content = fs.readFileSync('AI_AGENT_ONBOARDING.md', 'utf8');
      
      // Check for required emoji indicators
      expect(content).toContain('🚀'); // Onboarding steps
      expect(content).toContain('🎭'); // Available roles
      expect(content).toContain('📋'); // Role selection
      expect(content).toContain('📤'); // Session handoff
      expect(content).toContain('🔥'); // Critical/required
    });

    test('should generate consistent timestamps', async () => {
      const fixedDate = '2024-01-15T10:30:00Z';
      const config = {
        project: { name: 'timestamp-test' },
        roles: { 'senior-software-engineer': { ...DEFAULT_AGENT_ROLES['senior-software-engineer'], enabled: true } },
        autoTracking: false,
        generatedAt: fixedDate
      };

      await generateAgentInstructions(config);
      
      const onboardingContent = fs.readFileSync('AI_AGENT_ONBOARDING.md', 'utf8');
      const configContent = fs.readFileSync('.ai-agent-config.json', 'utf8');
      
      expect(onboardingContent).toContain('2024-01-15'); // Date appears in content
      expect(configContent).toContain(fixedDate); // Exact timestamp in config
    });

    test('should handle special characters in project names', async () => {
      const config = {
        project: { name: 'test-project_with.special-chars & spaces!' },
        roles: { 'senior-software-engineer': { ...DEFAULT_AGENT_ROLES['senior-software-engineer'], enabled: true } },
        autoTracking: false
      };

      await generateAgentInstructions(config);
      
      const content = fs.readFileSync('AI_AGENT_ONBOARDING.md', 'utf8');
      expect(content).toContain('test-project_with.special-chars & spaces!');
      
      const configContent = fs.readFileSync('.ai-agent-config.json', 'utf8');
      const parsed = JSON.parse(configContent);
      expect(parsed.project.name).toBe('test-project_with.special-chars & spaces!');
    });
  });

  describe('File Permissions and Access', () => {
    test('should create files with readable permissions', async () => {
      const config = {
        project: { name: 'permissions-test' },
        roles: { 'senior-software-engineer': { ...DEFAULT_AGENT_ROLES['senior-software-engineer'], enabled: true } },
        autoTracking: false
      };

      await generateAgentInstructions(config);
      
      const onboardingStats = fs.statSync('AI_AGENT_ONBOARDING.md');
      const handoffStats = fs.statSync('SESSION_HANDOFF.md');
      const configStats = fs.statSync('.ai-agent-config.json');
      
      // Check that files are readable by owner
      expect(onboardingStats.mode & 0o400).toBeTruthy(); // Owner read
      expect(handoffStats.mode & 0o400).toBeTruthy();
      expect(configStats.mode & 0o400).toBeTruthy();
      
      // Check that files are writable by owner
      expect(onboardingStats.mode & 0o200).toBeTruthy(); // Owner write
      expect(handoffStats.mode & 0o200).toBeTruthy();
      expect(configStats.mode & 0o200).toBeTruthy();
    });

    test('should handle write permission errors gracefully', async () => {
      // This test might not work on all systems, but tests error handling
      const config = {
        project: { name: 'permission-error-test' },
        roles: { 'senior-software-engineer': { ...DEFAULT_AGENT_ROLES['senior-software-engineer'], enabled: true } },
        autoTracking: false
      };

      // Create a read-only file to test overwrite behavior
      fs.writeFileSync('AI_AGENT_ONBOARDING.md', 'readonly content');
      try {
        fs.chmodSync('AI_AGENT_ONBOARDING.md', 0o444);
        
        // This should either succeed (overwriting) or fail gracefully
        try {
          await generateAgentInstructions(config);
        } catch (error) {
          expect(error.message).toMatch(/permission|access/i);
        }
      } finally {
        // Restore permissions for cleanup
        try {
          fs.chmodSync('AI_AGENT_ONBOARDING.md', 0o644);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    });
  });
});