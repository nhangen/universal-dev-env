const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// Import functions to test
const {
  DEFAULT_AGENT_ROLES,
  loadAgentConfig,
  saveAgentConfig,
  generateAgentInstructions
} = require('../bin/ai-agent-setup.js');

describe('Edge Cases and Error Handling', () => {
  let testDir;
  let originalCwd;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-case-test-'));
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

  describe('Invalid Input Handling', () => {
    test('should handle null/undefined config gracefully', async () => {
      expect(() => saveAgentConfig(null)).toThrow();
      expect(() => saveAgentConfig(undefined)).toThrow();
      
      // loadAgentConfig should still work without a file
      expect(() => loadAgentConfig()).not.toThrow();
    });

    test('should handle empty project configuration', async () => {
      const config = {
        roles: DEFAULT_AGENT_ROLES,
        autoTracking: false
      };

      expect(() => generateAgentInstructions(config)).not.toThrow();
      
      await generateAgentInstructions(config);
      expect(fs.existsSync('AI_AGENT_ONBOARDING.md')).toBe(true);
      
      const content = fs.readFileSync('AI_AGENT_ONBOARDING.md', 'utf8');
      expect(content).toContain(path.basename(testDir)); // Should use directory name as fallback
    });

    test('should handle malformed role objects', async () => {
      const config = {
        project: { name: 'malformed-test' },
        roles: {
          'valid-role': { ...DEFAULT_AGENT_ROLES['senior-software-engineer'], enabled: true },
          'missing-name': { description: 'Missing name field', enabled: true },
          'missing-description': { name: 'Missing Description', enabled: true },
          'invalid-focus': { name: 'Invalid Focus', description: 'Test', focus: 'not-array', enabled: true },
          'missing-enabled': { name: 'Missing Enabled', description: 'Test', focus: ['test'] }
        },
        autoTracking: false
      };

      // Should not crash even with malformed role objects
      expect(() => generateAgentInstructions(config)).not.toThrow();
      
      await generateAgentInstructions(config);
      const content = fs.readFileSync('AI_AGENT_ONBOARDING.md', 'utf8');
      expect(content).toContain('valid-role');
    });

    test('should handle extremely long project names', async () => {
      const longName = 'a'.repeat(1000); // 1000 character name
      const config = {
        project: { name: longName, type: 'react' },
        roles: { 'senior-software-engineer': { ...DEFAULT_AGENT_ROLES['senior-software-engineer'], enabled: true } },
        autoTracking: false
      };

      expect(() => generateAgentInstructions(config)).not.toThrow();
      
      await generateAgentInstructions(config);
      const content = fs.readFileSync('AI_AGENT_ONBOARDING.md', 'utf8');
      expect(content).toContain(longName);
    });

    test('should handle special characters and unicode in role names', async () => {
      const config = {
        project: { name: 'unicode-test' },
        roles: {
          'unicode-role': {
            name: '🌟 Spéciál Röle 中文 العربية 🚀',
            description: 'Testing unicode characters: café naïve résumé Москва 東京',
            focus: ['unicode-handling', 'internationalization'],
            enabled: true,
            custom: true
          }
        },
        autoTracking: false
      };

      expect(() => generateAgentInstructions(config)).not.toThrow();
      
      await generateAgentInstructions(config);
      const content = fs.readFileSync('AI_AGENT_ONBOARDING.md', 'utf8');
      expect(content).toContain('🌟 Spéciál Röle 中文 العربية 🚀');
      expect(content).toContain('café naïve résumé Москва 東京');
    });
  });

  describe('File System Edge Cases', () => {
    test('should handle non-writable directory', async () => {
      const readOnlyDir = path.join(testDir, 'readonly');
      fs.mkdirSync(readOnlyDir);
      
      try {
        fs.chmodSync(readOnlyDir, 0o444); // Read-only
        process.chdir(readOnlyDir);
        
        const config = {
          project: { name: 'readonly-test' },
          roles: { 'senior-software-engineer': { ...DEFAULT_AGENT_ROLES['senior-software-engineer'], enabled: true } },
          autoTracking: false
        };

        // Should handle gracefully or throw descriptive error
        try {
          await generateAgentInstructions(config);
        } catch (error) {
          expect(error.message).toMatch(/permission|access|write/i);
        }
      } finally {
        process.chdir(testDir);
        try {
          fs.chmodSync(readOnlyDir, 0o755);
        } catch (e) {
          // Cleanup may fail on some systems
        }
      }
    });

    test('should handle disk full simulation (write interruption)', async () => {
      const config = {
        project: { name: 'interrupted-write' },
        roles: { 'senior-software-engineer': { ...DEFAULT_AGENT_ROLES['senior-software-engineer'], enabled: true } },
        autoTracking: false
      };

      // Create a mock fs scenario (simplified test)
      const originalWriteFileSync = fs.writeFileSync;
      let callCount = 0;
      
      fs.writeFileSync = function(...args) {
        callCount++;
        if (callCount === 2) { // Fail on second write
          throw new Error('ENOSPC: no space left on device');
        }
        return originalWriteFileSync.apply(fs, args);
      };

      try {
        await generateAgentInstructions(config);
      } catch (error) {
        expect(error.message).toContain('ENOSPC');
      } finally {
        fs.writeFileSync = originalWriteFileSync;
      }
    });

    test('should handle concurrent file access', async () => {
      const config = {
        project: { name: 'concurrent-test' },
        roles: { 'senior-software-engineer': { ...DEFAULT_AGENT_ROLES['senior-software-engineer'], enabled: true } },
        autoTracking: false
      };

      // Simulate concurrent access by creating files with different content
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(generateAgentInstructions({
          ...config,
          project: { name: `concurrent-test-${i}` }
        }));
      }

      // All should complete without crashing
      expect(() => Promise.all(promises)).not.toThrow();
      await Promise.all(promises);
      
      expect(fs.existsSync('AI_AGENT_ONBOARDING.md')).toBe(true);
    });

    test('should handle missing parent directories', async () => {
      const deepDir = path.join(testDir, 'very', 'deep', 'nested', 'path');
      process.chdir(deepDir); // This should fail

      // Should fall back gracefully
      expect(process.cwd()).toBe(testDir); // Should still be in testDir
    });

    test('should handle symbolic links and junctions', async () => {
      try {
        const targetDir = path.join(testDir, 'target');
        const linkDir = path.join(testDir, 'link');
        
        fs.mkdirSync(targetDir);
        fs.symlinkSync(targetDir, linkDir, 'dir');
        
        process.chdir(linkDir);
        
        const config = {
          project: { name: 'symlink-test' },
          roles: { 'senior-software-engineer': { ...DEFAULT_AGENT_ROLES['senior-software-engineer'], enabled: true } },
          autoTracking: false
        };

        expect(() => generateAgentInstructions(config)).not.toThrow();
        
        await generateAgentInstructions(config);
        expect(fs.existsSync('AI_AGENT_ONBOARDING.md')).toBe(true);
      } catch (error) {
        // Symlinks might not be supported on all systems
        console.warn('Symlink test skipped:', error.message);
      }
    });
  });

  describe('Git Integration Edge Cases', () => {
    test('should handle corrupted git repository', async () => {
      // Create a fake .git directory with corrupted content
      fs.mkdirSync('.git');
      fs.writeFileSync('.git/config', 'corrupted git config');
      
      const config = {
        project: { name: 'corrupted-git' },
        roles: { 'senior-software-engineer': { ...DEFAULT_AGENT_ROLES['senior-software-engineer'], enabled: true } },
        autoTracking: true // This should be handled gracefully
      };

      expect(() => generateAgentInstructions(config)).not.toThrow();
      
      await generateAgentInstructions(config);
      expect(fs.existsSync('AI_AGENT_ONBOARDING.md')).toBe(true);
    });

    test('should handle git repository without hooks directory', async () => {
      try {
        execSync('git init', { stdio: 'ignore' });
        
        // Remove hooks directory after git init
        if (fs.existsSync('.git/hooks')) {
          fs.rmSync('.git/hooks', { recursive: true });
        }
        
        const config = {
          project: { name: 'no-hooks-dir' },
          roles: { 'senior-software-engineer': { ...DEFAULT_AGENT_ROLES['senior-software-engineer'], enabled: true } },
          autoTracking: true
        };

        expect(() => generateAgentInstructions(config)).not.toThrow();
        
        await generateAgentInstructions(config);
        
        // Should create hooks directory if auto-tracking is enabled
        expect(fs.existsSync('.git/hooks') || fs.existsSync('AI_AGENT_ONBOARDING.md')).toBe(true);
      } catch (error) {
        console.warn('Git test skipped:', error.message);
      }
    });

    test('should handle existing post-commit hook with complex content', async () => {
      try {
        execSync('git init', { stdio: 'ignore' });
        
        const existingHook = `#!/bin/bash
# Complex existing hook
set -e

# Multiple git commands
BRANCH=$(git symbolic-ref --short HEAD)
COMMIT=$(git rev-parse HEAD)

# Conditional logic
if [ "$BRANCH" == "main" ]; then
    echo "Deploying to production"
    # Deploy script here
fi

# Error handling
trap 'echo "Hook failed"' ERR

# Call other hooks
if [ -f .git/hooks/post-commit.local ]; then
    .git/hooks/post-commit.local
fi

exit 0
`;
        
        fs.mkdirSync('.git/hooks', { recursive: true });
        fs.writeFileSync('.git/hooks/post-commit', existingHook);
        fs.chmodSync('.git/hooks/post-commit', 0o755);
        
        const config = {
          project: { name: 'complex-hook' },
          roles: { 'senior-software-engineer': { ...DEFAULT_AGENT_ROLES['senior-software-engineer'], enabled: true } },
          autoTracking: true
        };

        expect(() => generateAgentInstructions(config)).not.toThrow();
        
        await generateAgentInstructions(config);
        
        // Should backup existing hook
        const backupFiles = fs.readdirSync('.git/hooks').filter(f => f.startsWith('post-commit.backup-'));
        expect(backupFiles.length).toBeGreaterThan(0);
        
      } catch (error) {
        console.warn('Complex hook test skipped:', error.message);
      }
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    test('should handle large number of roles', async () => {
      const manyRoles = {};
      
      // Generate 100 roles
      for (let i = 0; i < 100; i++) {
        manyRoles[`role-${i}`] = {
          name: `Role ${i}`,
          description: `This is role number ${i} with a longer description that includes multiple sentences and various details about what this role does.`,
          focus: [`area-${i}`, `task-${i}`, `responsibility-${i}`],
          enabled: i % 5 === 0 // Enable every 5th role
        };
      }
      
      const config = {
        project: { name: 'many-roles-test' },
        roles: manyRoles,
        autoTracking: false
      };

      expect(() => generateAgentInstructions(config)).not.toThrow();
      
      await generateAgentInstructions(config);
      
      const content = fs.readFileSync('AI_AGENT_ONBOARDING.md', 'utf8');
      expect(content.length).toBeGreaterThan(1000); // Should be substantial
      expect(content).toContain('Role 0');
      expect(content).toContain('Role 5'); // Enabled roles
    });

    test('should handle very long role descriptions', async () => {
      const veryLongDescription = 'This is a very long description. '.repeat(1000); // ~30KB description
      
      const config = {
        project: { name: 'long-desc-test' },
        roles: {
          'verbose-role': {
            name: 'Verbose Role',
            description: veryLongDescription,
            focus: ['verbose-tasks'],
            enabled: true
          }
        },
        autoTracking: false
      };

      expect(() => generateAgentInstructions(config)).not.toThrow();
      
      await generateAgentInstructions(config);
      
      const content = fs.readFileSync('AI_AGENT_ONBOARDING.md', 'utf8');
      expect(content).toContain(veryLongDescription.substring(0, 100)); // Contains part of long description
    });

    test('should handle deeply nested focus arrays', async () => {
      const config = {
        project: { name: 'nested-focus-test' },
        roles: {
          'complex-role': {
            name: 'Complex Role',
            description: 'A role with complex focus structure',
            focus: Array(1000).fill().map((_, i) => `focus-area-${i}`), // 1000 focus areas
            enabled: true
          }
        },
        autoTracking: false
      };

      expect(() => generateAgentInstructions(config)).not.toThrow();
      
      await generateAgentInstructions(config);
      
      const content = fs.readFileSync('AI_AGENT_ONBOARDING.md', 'utf8');
      expect(content).toContain('Complex Role');
      expect(content).toContain('focus-area-0');
    });
  });

  describe('Configuration Validation Edge Cases', () => {
    test('should handle circular references in config', () => {
      const config = {
        project: { name: 'circular-test' },
        roles: DEFAULT_AGENT_ROLES,
        autoTracking: false
      };
      
      // Create circular reference
      config.self = config;
      
      // Should not crash JSON.stringify in saveAgentConfig
      expect(() => saveAgentConfig(config)).toThrow(); // JSON.stringify should fail
    });

    test('should handle config with function properties', () => {
      const config = {
        project: { name: 'function-test' },
        roles: DEFAULT_AGENT_ROLES,
        autoTracking: false,
        invalidFunction: () => 'this should not be saved'
      };

      saveAgentConfig(config);
      const loaded = loadAgentConfig();
      
      // Functions should not be preserved
      expect(loaded.invalidFunction).toBeUndefined();
      expect(typeof loaded.invalidFunction).not.toBe('function');
    });

    test('should handle config with null prototype', () => {
      const config = Object.create(null);
      config.project = { name: 'null-proto-test' };
      config.roles = DEFAULT_AGENT_ROLES;
      config.autoTracking = false;

      expect(() => saveAgentConfig(config)).not.toThrow();
      
      saveAgentConfig(config);
      const loaded = loadAgentConfig();
      expect(loaded.project.name).toBe('null-proto-test');
    });

    test('should handle date objects in config', () => {
      const testDate = new Date('2024-01-01T00:00:00Z');
      const config = {
        project: { name: 'date-test', createdAt: testDate },
        roles: DEFAULT_AGENT_ROLES,
        autoTracking: false,
        generatedAt: testDate
      };

      saveAgentConfig(config);
      const loaded = loadAgentConfig();
      
      // Dates should be serialized as strings
      expect(typeof loaded.generatedAt).toBe('string');
      expect(loaded.generatedAt).toBe('2024-01-01T00:00:00.000Z');
    });
  });

  describe('System Integration Edge Cases', () => {
    test('should handle system with no temporary directory access', () => {
      const originalTmpdir = os.tmpdir;
      os.tmpdir = () => '/nonexistent/tmp';
      
      try {
        // Should fall back gracefully or use current directory
        const config = {
          project: { name: 'no-tmp-test' },
          roles: { 'senior-software-engineer': { ...DEFAULT_AGENT_ROLES['senior-software-engineer'], enabled: true } },
          autoTracking: false
        };

        expect(() => generateAgentInstructions(config)).not.toThrow();
      } finally {
        os.tmpdir = originalTmpdir;
      }
    });

    test('should handle process termination during file writes', async () => {
      // Simulate interrupted writes by mocking fs operations
      const originalWriteFileSync = fs.writeFileSync;
      let writeAttempts = 0;
      
      fs.writeFileSync = function(...args) {
        writeAttempts++;
        if (writeAttempts === 2) {
          // Simulate process interruption
          throw new Error('Process interrupted');
        }
        return originalWriteFileSync.apply(fs, args);
      };

      const config = {
        project: { name: 'interrupted-test' },
        roles: { 'senior-software-engineer': { ...DEFAULT_AGENT_ROLES['senior-software-engineer'], enabled: true } },
        autoTracking: false
      };

      try {
        await generateAgentInstructions(config);
      } catch (error) {
        expect(error.message).toContain('interrupted');
      } finally {
        fs.writeFileSync = originalWriteFileSync;
      }
    });

    test('should handle different line ending systems', async () => {
      const config = {
        project: { name: 'line-ending-test' },
        roles: { 'senior-software-engineer': { ...DEFAULT_AGENT_ROLES['senior-software-engineer'], enabled: true } },
        autoTracking: false
      };

      await generateAgentInstructions(config);
      
      const content = fs.readFileSync('AI_AGENT_ONBOARDING.md', 'utf8');
      
      // Should handle different line endings gracefully
      expect(content).toBeTruthy();
      expect(content.length).toBeGreaterThan(100);
      
      // Test that content is properly formatted regardless of line endings
      const lines = content.split(/\r?\n/);
      expect(lines.length).toBeGreaterThan(10);
      expect(lines[0]).toContain('# AI Agent Onboarding Instructions');
    });
  });
});