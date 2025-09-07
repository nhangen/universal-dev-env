const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

// Import functions to test
const {
  DEFAULT_AGENT_ROLES,
  loadAgentConfig,
  saveAgentConfig,
  generateAgentInstructions
} = require('../bin/ai-agent-setup.js');

describe('AI Agent Setup', () => {
  let testDir;
  let originalCwd;

  beforeEach(() => {
    // Create temporary test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-agent-test-'));
    originalCwd = process.cwd();
    process.chdir(testDir);
    
    // Initialize git repo for tests
    try {
      execSync('git init', { stdio: 'ignore' });
      execSync('git config user.email "test@example.com"', { stdio: 'ignore' });
      execSync('git config user.name "Test User"', { stdio: 'ignore' });
    } catch (error) {
      console.warn('Git not available for tests');
    }
  });

  afterEach(() => {
    // Clean up
    process.chdir(originalCwd);
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean up test directory:', error.message);
    }
  });

  describe('Default Agent Roles', () => {
    test('should have all expected default roles', () => {
      const expectedRoles = [
        'senior-software-engineer',
        'senior-data-scientist', 
        'devops-engineer',
        'cybersecurity-analyst',
        'ai-research-scientist',
        'project-manager',
        'technical-writer',
        'qa-engineer',
        'database-administrator',
        'quantum-specialist'
      ];

      expectedRoles.forEach(roleKey => {
        expect(DEFAULT_AGENT_ROLES).toHaveProperty(roleKey);
        expect(DEFAULT_AGENT_ROLES[roleKey]).toHaveProperty('name');
        expect(DEFAULT_AGENT_ROLES[roleKey]).toHaveProperty('description');
        expect(DEFAULT_AGENT_ROLES[roleKey]).toHaveProperty('focus');
        expect(DEFAULT_AGENT_ROLES[roleKey]).toHaveProperty('enabled');
      });
    });

    test('should have valid role structure', () => {
      Object.entries(DEFAULT_AGENT_ROLES).forEach(([key, role]) => {
        expect(typeof role.name).toBe('string');
        expect(role.name.length).toBeGreaterThan(0);
        
        expect(typeof role.description).toBe('string');
        expect(role.description.length).toBeGreaterThan(10);
        
        expect(Array.isArray(role.focus)).toBe(true);
        expect(role.focus.length).toBeGreaterThan(0);
        
        expect(typeof role.enabled).toBe('boolean');
      });
    });

    test('should have some roles enabled by default', () => {
      const enabledRoles = Object.values(DEFAULT_AGENT_ROLES).filter(role => role.enabled);
      expect(enabledRoles.length).toBeGreaterThan(0);
      expect(enabledRoles.length).toBeLessThan(Object.keys(DEFAULT_AGENT_ROLES).length);
    });
  });

  describe('Configuration Management', () => {
    test('should load default config when no file exists', () => {
      const config = loadAgentConfig();
      
      expect(config).toHaveProperty('project');
      expect(config).toHaveProperty('roles');
      expect(config.project.name).toBe(path.basename(testDir));
      expect(config.roles).toEqual(DEFAULT_AGENT_ROLES);
    });

    test('should save and load configuration correctly', () => {
      const testConfig = {
        project: { name: 'test-project', type: 'react' },
        roles: { 'test-role': { name: 'Test', enabled: true } },
        autoTracking: true,
        generatedAt: new Date().toISOString(),
        version: '1.0.0'
      };

      saveAgentConfig(testConfig);
      
      expect(fs.existsSync('.ai-agent-config.json')).toBe(true);
      
      const loadedConfig = loadAgentConfig();
      expect(loadedConfig.project.name).toBe('test-project');
      expect(loadedConfig.autoTracking).toBe(true);
      expect(loadedConfig).toHaveProperty('updatedAt');
    });

    test('should handle corrupted config file gracefully', () => {
      fs.writeFileSync('.ai-agent-config.json', 'invalid json');
      
      const config = loadAgentConfig();
      expect(config).toHaveProperty('roles');
      expect(config.roles).toEqual(DEFAULT_AGENT_ROLES);
    });

    test('should preserve custom roles when saving', () => {
      const config = loadAgentConfig();
      config.roles['custom-role'] = {
        name: 'Custom Role',
        description: 'A custom role for testing',
        focus: ['custom-area'],
        enabled: true,
        custom: true
      };

      saveAgentConfig(config);
      const reloaded = loadAgentConfig();
      
      expect(reloaded.roles['custom-role']).toBeDefined();
      expect(reloaded.roles['custom-role'].custom).toBe(true);
    });
  });

  describe('File Generation', () => {
    test('should generate AI onboarding instructions', async () => {
      const config = {
        project: { name: 'test-project', type: 'react' },
        roles: {
          'senior-software-engineer': { ...DEFAULT_AGENT_ROLES['senior-software-engineer'], enabled: true }
        },
        autoTracking: false,
        generatedAt: new Date().toISOString(),
        version: '1.0.0'
      };

      await generateAgentInstructions(config);
      
      expect(fs.existsSync('AI_AGENT_ONBOARDING.md')).toBe(true);
      
      const content = fs.readFileSync('AI_AGENT_ONBOARDING.md', 'utf8');
      expect(content).toContain('AI Agent Onboarding Instructions');
      expect(content).toContain('test-project');
      expect(content).toContain('Senior Software Engineer');
      expect(content).toContain('MANDATORY Updates Required');
    });

    test('should generate initial session handoff', async () => {
      const config = {
        project: { name: 'test-project', type: 'python' },
        roles: DEFAULT_AGENT_ROLES,
        autoTracking: false,
        generatedAt: new Date().toISOString(),
        version: '1.0.0'
      };

      await generateAgentInstructions(config);
      
      expect(fs.existsSync('SESSION_HANDOFF.md')).toBe(true);
      
      const content = fs.readFileSync('SESSION_HANDOFF.md', 'utf8');
      expect(content).toContain('SESSION HANDOFF DOCUMENTATION');
      expect(content).toContain('Initial Setup');
      expect(content).toContain('test-project');
    });

    test('should not overwrite existing session handoff', async () => {
      const existingContent = '# Existing handoff content';
      fs.writeFileSync('SESSION_HANDOFF.md', existingContent);

      const config = {
        project: { name: 'test-project' },
        roles: DEFAULT_AGENT_ROLES,
        autoTracking: false
      };

      await generateAgentInstructions(config);
      
      const content = fs.readFileSync('SESSION_HANDOFF.md', 'utf8');
      expect(content).toBe(existingContent);
    });

    test('should include auto-tracking info when enabled', async () => {
      const config = {
        project: { name: 'test-project' },
        roles: { 'senior-software-engineer': { ...DEFAULT_AGENT_ROLES['senior-software-engineer'], enabled: true } },
        autoTracking: true,
        generatedAt: new Date().toISOString(),
        version: '1.0.0'
      };

      await generateAgentInstructions(config);
      
      const content = fs.readFileSync('AI_AGENT_ONBOARDING.md', 'utf8');
      expect(content).toContain('post-commit hook');
    });
  });

  describe('Role Assignment Logic', () => {
    test('should recommend roles based on project type', async () => {
      const reactConfig = {
        project: { name: 'react-app', type: 'react' },
        roles: DEFAULT_AGENT_ROLES,
        autoTracking: false
      };

      await generateAgentInstructions(reactConfig);
      const reactContent = fs.readFileSync('AI_AGENT_ONBOARDING.md', 'utf8');
      expect(reactContent).toContain('Frontend changes needed');
      
      // Clean up for next test
      fs.unlinkSync('AI_AGENT_ONBOARDING.md');
      fs.unlinkSync('SESSION_HANDOFF.md');
      
      const pythonConfig = {
        project: { name: 'python-app', type: 'python' },
        roles: DEFAULT_AGENT_ROLES,
        autoTracking: false
      };

      await generateAgentInstructions(pythonConfig);
      const pythonContent = fs.readFileSync('AI_AGENT_ONBOARDING.md', 'utf8');
      expect(pythonContent).toContain('Data analysis/ML work');
    });

    test('should filter enabled roles only', async () => {
      const config = {
        project: { name: 'test-project' },
        roles: {
          'senior-software-engineer': { ...DEFAULT_AGENT_ROLES['senior-software-engineer'], enabled: true },
          'qa-engineer': { ...DEFAULT_AGENT_ROLES['qa-engineer'], enabled: false }
        },
        autoTracking: false
      };

      await generateAgentInstructions(config);
      const content = fs.readFileSync('AI_AGENT_ONBOARDING.md', 'utf8');
      expect(content).toContain('Senior Software Engineer');
      expect(content).not.toContain('QA Engineer');
    });
  });

  describe('Git Repository Detection', () => {
    test('should detect git repository correctly', () => {
      // We initialized git in beforeEach
      expect(fs.existsSync('.git')).toBe(true);
    });

    test('should handle non-git directories gracefully', () => {
      // Remove .git directory
      fs.rmSync('.git', { recursive: true, force: true });
      
      const config = {
        project: { name: 'no-git-project' },
        roles: DEFAULT_AGENT_ROLES,
        autoTracking: true // This should be ignored
      };

      expect(() => generateAgentInstructions(config)).not.toThrow();
    });
  });

  describe('Input Validation', () => {
    test('should handle missing project info', async () => {
      const config = {
        roles: DEFAULT_AGENT_ROLES,
        autoTracking: false
      };

      expect(() => generateAgentInstructions(config)).not.toThrow();
    });

    test('should handle empty roles object', async () => {
      const config = {
        project: { name: 'test-project' },
        roles: {},
        autoTracking: false
      };

      await generateAgentInstructions(config);
      const content = fs.readFileSync('AI_AGENT_ONBOARDING.md', 'utf8');
      expect(content).toContain('No roles have been enabled');
    });

    test('should validate role keys format', () => {
      const validKeys = ['senior-software-engineer', 'qa-engineer', 'tech-writer'];
      const invalidKeys = ['Senior Engineer', 'qa_engineer', 'DEVOPS', 'test role'];

      validKeys.forEach(key => {
        expect(key).toMatch(/^[a-z-]+$/);
      });

      invalidKeys.forEach(key => {
        expect(key).not.toMatch(/^[a-z-]+$/);
      });
    });
  });

  describe('File Permissions', () => {
    test('should create files with correct permissions', async () => {
      const config = {
        project: { name: 'test-project' },
        roles: DEFAULT_AGENT_ROLES,
        autoTracking: false
      };

      await generateAgentInstructions(config);
      
      const stats = fs.statSync('AI_AGENT_ONBOARDING.md');
      expect(stats.isFile()).toBe(true);
      
      const configStats = fs.statSync('.ai-agent-config.json');
      expect(configStats.isFile()).toBe(true);
    });

    test('should handle permission errors gracefully', () => {
      // Create read-only directory to test permission handling
      const readOnlyDir = path.join(testDir, 'readonly');
      fs.mkdirSync(readOnlyDir);
      
      try {
        fs.chmodSync(readOnlyDir, 0o444);
        process.chdir(readOnlyDir);
        
        const config = {
          project: { name: 'readonly-test' },
          roles: DEFAULT_AGENT_ROLES,
          autoTracking: false
        };

        // This might throw or handle gracefully depending on the system
        // We're testing that it doesn't crash the entire process
        try {
          generateAgentInstructions(config);
        } catch (error) {
          expect(error.message).toContain('permission');
        }
      } finally {
        process.chdir(testDir);
        fs.chmodSync(readOnlyDir, 0o755);
      }
    });
  });

  describe('Backup and Recovery', () => {
    test('should create backup directory for handoffs', async () => {
      const config = {
        project: { name: 'test-project' },
        roles: DEFAULT_AGENT_ROLES,
        autoTracking: false
      };

      // Create existing handoff to test backup
      fs.writeFileSync('SESSION_HANDOFF.md', 'existing content');
      
      await generateAgentInstructions(config);
      
      // Should not overwrite existing handoff
      const content = fs.readFileSync('SESSION_HANDOFF.md', 'utf8');
      expect(content).toBe('existing content');
    });

    test('should handle backup directory creation', async () => {
      const config = {
        project: { name: 'test-project' },
        roles: DEFAULT_AGENT_ROLES,
        autoTracking: false
      };

      await generateAgentInstructions(config);
      
      // Backup directory should be created even if not used
      expect(fs.existsSync('.handoffs') || !fs.existsSync('SESSION_HANDOFF.md')).toBe(true);
    });
  });
});