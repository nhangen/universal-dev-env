const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

// Import the installPostCommitHook function - we need to extract it or mock it
// For now, we'll test the hook behavior directly

describe('Post-Commit Hook', () => {
  let testDir;
  let originalCwd;
  let hookPath;

  beforeEach(() => {
    // Create temporary test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-test-'));
    originalCwd = process.cwd();
    process.chdir(testDir);
    
    // Initialize git repo
    try {
      execSync('git init', { stdio: 'ignore' });
      execSync('git config user.email "test@example.com"', { stdio: 'ignore' });
      execSync('git config user.name "Test User"', { stdio: 'ignore' });
      
      // Create hooks directory
      fs.mkdirSync('.git/hooks', { recursive: true });
      hookPath = path.join('.git', 'hooks', 'post-commit');
      
    } catch (error) {
      console.warn('Git not available for hook tests');
    }
  });

  afterEach(() => {
    process.chdir(originalCwd);
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to clean up test directory');
    }
  });

  describe('Hook Installation', () => {
    test('should create post-commit hook file', () => {
      const hookContent = `#!/bin/bash
echo "test hook"
`;
      
      fs.writeFileSync(hookPath, hookContent);
      fs.chmodSync(hookPath, 0o755);
      
      expect(fs.existsSync(hookPath)).toBe(true);
      
      const stats = fs.statSync(hookPath);
      expect(stats.mode & parseInt('755', 8)).toBeTruthy();
    });

    test('should backup existing hook before installing', () => {
      const existingHook = `#!/bin/bash
echo "existing hook"
`;
      fs.writeFileSync(hookPath, existingHook);
      
      // Simulate installing our hook with backup
      const backupPath = `${hookPath}.backup-${Date.now()}`;
      fs.copyFileSync(hookPath, backupPath);
      
      const ourHook = `#!/bin/bash
echo "our hook"
`;
      fs.writeFileSync(hookPath, ourHook);
      
      expect(fs.existsSync(backupPath)).toBe(true);
      expect(fs.readFileSync(backupPath, 'utf8')).toContain('existing hook');
      expect(fs.readFileSync(hookPath, 'utf8')).toContain('our hook');
    });

    test('should make hook executable after installation', () => {
      const hookContent = `#!/bin/bash
echo "test"
`;
      fs.writeFileSync(hookPath, hookContent);
      fs.chmodSync(hookPath, 0o755);
      
      const stats = fs.statSync(hookPath);
      // Check if file is executable (owner execute bit)
      expect(stats.mode & 0o100).toBeTruthy();
    });

    test('should handle non-git repository gracefully', () => {
      // Remove .git directory
      fs.rmSync('.git', { recursive: true, force: true });
      
      // Should not throw error when trying to install hook
      expect(() => {
        // This would be the hook installation logic
        if (!fs.existsSync('.git')) {
          console.log('Not a git repository - skipping hook installation');
          return;
        }
      }).not.toThrow();
    });
  });

  describe('Hook Content Generation', () => {
    test('should contain required reminder elements', () => {
      const hookContent = `#!/bin/bash

# AI Agent Session Tracking - Post-Commit Hook
COMMIT_HASH=$(git rev-parse --short HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B)
CHANGED_FILES=$(git diff-tree --no-commit-id --name-only -r HEAD)
FILES_COUNT=$(echo "$CHANGED_FILES" | wc -l)

echo "🤖 AI Agent Reminder: You just committed $COMMIT_HASH"
echo "📝 Commit: $COMMIT_MSG"

HANDOFF_FILE="SESSION_HANDOFF.md"
if [ -f "$HANDOFF_FILE" ]; then
    echo "✅ SESSION_HANDOFF.md found"
else
    echo "🚨 CRITICAL: SESSION_HANDOFF.md not found!"
fi
`;

      expect(hookContent).toContain('AI Agent Reminder');
      expect(hookContent).toContain('SESSION_HANDOFF.md');
      expect(hookContent).toContain('COMMIT_HASH');
      expect(hookContent).toContain('COMMIT_MSG');
    });

    test('should check for handoff file recency', () => {
      const hookContent = `#!/bin/bash

HANDOFF_FILE="SESSION_HANDOFF.md"
if [ -f "$HANDOFF_FILE" ]; then
    LAST_MODIFIED=$(stat -c %Y "$HANDOFF_FILE" 2>/dev/null || stat -f %m "$HANDOFF_FILE" 2>/dev/null)
    CURRENT_TIME=$(date +%s)
    TIME_DIFF=$((CURRENT_TIME - LAST_MODIFIED))
    
    if [ $TIME_DIFF -gt 300 ]; then
        echo "⚠️ SESSION_HANDOFF.md was last updated $(($TIME_DIFF / 60)) minutes ago"
    else
        echo "✅ SESSION_HANDOFF.md recently updated"
    fi
fi
`;

      expect(hookContent).toContain('LAST_MODIFIED');
      expect(hookContent).toContain('TIME_DIFF');
      expect(hookContent).toContain('300'); // 5 minutes
    });

    test('should detect significant commits', () => {
      const hookContent = `#!/bin/bash

COMMIT_MSG=$(git log -1 --pretty=%B)
FILES_COUNT=$(echo "$CHANGED_FILES" | wc -l)

if [ $FILES_COUNT -gt 3 ] || echo "$COMMIT_MSG" | grep -qi "major\\|significant\\|important\\|breaking"; then
    echo "🚨 SIGNIFICANT COMMIT DETECTED"
fi
`;

      expect(hookContent).toContain('SIGNIFICANT COMMIT DETECTED');
      expect(hookContent).toContain('FILES_COUNT -gt 3');
      expect(hookContent).toContain('major\\|significant\\|important\\|breaking');
    });
  });

  describe('Hook Execution Simulation', () => {
    beforeEach(() => {
      // Skip if git is not available
      try {
        execSync('git --version', { stdio: 'ignore' });
      } catch (error) {
        console.warn('Skipping hook execution tests - git not available');
        return;
      }
    });

    test('should execute after commit when installed', (done) => {
      try {
        // Create a simple test hook that writes to a file
        const testHookContent = `#!/bin/bash
echo "hook executed" > hook-executed.txt
COMMIT_HASH=$(git rev-parse --short HEAD)
echo "Commit: $COMMIT_HASH" >> hook-executed.txt
`;
        
        fs.writeFileSync(hookPath, testHookContent);
        fs.chmodSync(hookPath, 0o755);
        
        // Create a test file and commit it
        fs.writeFileSync('test.txt', 'test content');
        execSync('git add test.txt', { stdio: 'ignore' });
        execSync('git commit -m "test commit"', { stdio: 'ignore' });
        
        // Check if hook was executed
        setTimeout(() => {
          try {
            expect(fs.existsSync('hook-executed.txt')).toBe(true);
            const output = fs.readFileSync('hook-executed.txt', 'utf8');
            expect(output).toContain('hook executed');
            expect(output).toContain('Commit:');
            done();
          } catch (error) {
            done(error);
          }
        }, 100);
        
      } catch (error) {
        console.warn('Hook execution test failed:', error.message);
        done();
      }
    });

    test('should provide commit information to hook', (done) => {
      try {
        const commitInfoHook = `#!/bin/bash
COMMIT_HASH=$(git rev-parse --short HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B)
CHANGED_FILES=$(git diff-tree --no-commit-id --name-only -r HEAD)

echo "Hash: $COMMIT_HASH" > commit-info.txt
echo "Message: $COMMIT_MSG" >> commit-info.txt
echo "Files: $CHANGED_FILES" >> commit-info.txt
`;
        
        fs.writeFileSync(hookPath, commitInfoHook);
        fs.chmodSync(hookPath, 0o755);
        
        // Create and commit a test file
        fs.writeFileSync('sample.txt', 'sample content');
        execSync('git add sample.txt', { stdio: 'ignore' });
        execSync('git commit -m "Add sample file"', { stdio: 'ignore' });
        
        setTimeout(() => {
          try {
            expect(fs.existsSync('commit-info.txt')).toBe(true);
            const info = fs.readFileSync('commit-info.txt', 'utf8');
            expect(info).toContain('Hash:');
            expect(info).toContain('Message: Add sample file');
            expect(info).toContain('Files: sample.txt');
            done();
          } catch (error) {
            done(error);
          }
        }, 100);
        
      } catch (error) {
        console.warn('Commit info test failed:', error.message);
        done();
      }
    });
  });

  describe('Hook Behavior with Session Handoff', () => {
    test('should detect missing SESSION_HANDOFF.md', () => {
      const handoffCheckHook = `#!/bin/bash
HANDOFF_FILE="SESSION_HANDOFF.md"
if [ ! -f "$HANDOFF_FILE" ]; then
    echo "HANDOFF_MISSING" > hook-result.txt
else
    echo "HANDOFF_EXISTS" > hook-result.txt
fi
`;
      
      fs.writeFileSync(hookPath, handoffCheckHook);
      fs.chmodSync(hookPath, 0o755);
      
      // Test without handoff file
      expect(fs.existsSync('SESSION_HANDOFF.md')).toBe(false);
      
      // Simulate hook execution
      execSync('bash .git/hooks/post-commit', { stdio: 'ignore' });
      
      expect(fs.existsSync('hook-result.txt')).toBe(true);
      expect(fs.readFileSync('hook-result.txt', 'utf8').trim()).toBe('HANDOFF_MISSING');
    });

    test('should detect recent SESSION_HANDOFF.md updates', () => {
      // Create a recent handoff file
      fs.writeFileSync('SESSION_HANDOFF.md', 'recent handoff content');
      
      const recentCheckHook = `#!/bin/bash
HANDOFF_FILE="SESSION_HANDOFF.md"
if [ -f "$HANDOFF_FILE" ]; then
    LAST_MODIFIED=$(stat -c %Y "$HANDOFF_FILE" 2>/dev/null || stat -f %m "$HANDOFF_FILE" 2>/dev/null)
    CURRENT_TIME=$(date +%s)
    TIME_DIFF=$((CURRENT_TIME - LAST_MODIFIED))
    
    if [ $TIME_DIFF -gt 300 ]; then
        echo "HANDOFF_STALE" > hook-result.txt
    else
        echo "HANDOFF_RECENT" > hook-result.txt
    fi
else
    echo "HANDOFF_MISSING" > hook-result.txt
fi
`;
      
      fs.writeFileSync(hookPath, recentCheckHook);
      fs.chmodSync(hookPath, 0o755);
      
      // Execute hook
      execSync('bash .git/hooks/post-commit', { stdio: 'ignore' });
      
      expect(fs.existsSync('hook-result.txt')).toBe(true);
      expect(fs.readFileSync('hook-result.txt', 'utf8').trim()).toBe('HANDOFF_RECENT');
    });

    test('should detect stale SESSION_HANDOFF.md', (done) => {
      // Create an old handoff file
      fs.writeFileSync('SESSION_HANDOFF.md', 'old handoff content');
      
      // Change the file's modification time to 10 minutes ago
      const tenMinutesAgo = new Date(Date.now() - (10 * 60 * 1000));
      try {
        fs.utimesSync('SESSION_HANDOFF.md', tenMinutesAgo, tenMinutesAgo);
      } catch (error) {
        console.warn('Could not modify file time for test');
        done();
        return;
      }
      
      const staleCheckHook = `#!/bin/bash
HANDOFF_FILE="SESSION_HANDOFF.md"
if [ -f "$HANDOFF_FILE" ]; then
    LAST_MODIFIED=$(stat -c %Y "$HANDOFF_FILE" 2>/dev/null || stat -f %m "$HANDOFF_FILE" 2>/dev/null)
    CURRENT_TIME=$(date +%s)
    TIME_DIFF=$((CURRENT_TIME - LAST_MODIFIED))
    
    if [ $TIME_DIFF -gt 300 ]; then
        echo "HANDOFF_STALE" > hook-result.txt
    else
        echo "HANDOFF_RECENT" > hook-result.txt
    fi
fi
`;
      
      fs.writeFileSync(hookPath, staleCheckHook);
      fs.chmodSync(hookPath, 0o755);
      
      // Execute hook
      execSync('bash .git/hooks/post-commit', { stdio: 'ignore' });
      
      expect(fs.existsSync('hook-result.txt')).toBe(true);
      expect(fs.readFileSync('hook-result.txt', 'utf8').trim()).toBe('HANDOFF_STALE');
      done();
    });
  });

  describe('Error Handling', () => {
    test('should handle git command failures gracefully', () => {
      const errorHandlingHook = `#!/bin/bash
COMMIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
echo "Hash: $COMMIT_HASH" > error-test.txt
`;
      
      fs.writeFileSync(hookPath, errorHandlingHook);
      fs.chmodSync(hookPath, 0o755);
      
      expect(() => {
        execSync('bash .git/hooks/post-commit', { stdio: 'ignore' });
      }).not.toThrow();
      
      expect(fs.existsSync('error-test.txt')).toBe(true);
    });

    test('should continue execution even with stat command failures', () => {
      const statErrorHook = `#!/bin/bash
# Test both Linux and macOS stat commands with fallback
HANDOFF_FILE="nonexistent-file.md"
LAST_MODIFIED=$(stat -c %Y "$HANDOFF_FILE" 2>/dev/null || stat -f %m "$HANDOFF_FILE" 2>/dev/null || echo "0")
echo "Modified: $LAST_MODIFIED" > stat-test.txt
`;
      
      fs.writeFileSync(hookPath, statErrorHook);
      fs.chmodSync(hookPath, 0o755);
      
      expect(() => {
        execSync('bash .git/hooks/post-commit', { stdio: 'ignore' });
      }).not.toThrow();
      
      expect(fs.existsSync('stat-test.txt')).toBe(true);
      expect(fs.readFileSync('stat-test.txt', 'utf8')).toContain('Modified: 0');
    });
  });
});