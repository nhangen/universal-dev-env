// Mock fs module before requiring the main module
jest.mock('fs');
jest.mock('path');

const fs = require('fs');
const path = require('path');

// Mock the universal devcontainer config file
fs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
  name: 'Universal Dev Environment',
  forwardPorts: [3000],
  customizations: { vscode: { extensions: [] } },
  mounts: [],
  containerEnv: {}
}));

path.join = jest.fn((...args) => args.join('/'));

const { generateDevcontainerConfig, selectConfigurationStrategy } = require('../bin/universal-setup.js');

describe('DevContainer AI Integration', () => {
  
  test('DevContainer should add AI persistence mounts when aiContext enabled', () => {
    const config = {
      projectName: 'test-app',
      projectType: 'react',
      backend: 'express',
      aiContext: true,
      strategy: {
        containerStrategy: 'docker-compose',
        environmentConfigs: ['development', 'staging', 'production']
      }
    };
    
    const devcontainerConfig = generateDevcontainerConfig(config);
    
    // Test AI persistence mounts
    expect(devcontainerConfig.mounts).toContain(
      "source=${localEnv:HOME}${localEnv:USERPROFILE}/.config/claude-code,target=/home/vscode/.config/claude-code,type=bind"
    );
    expect(devcontainerConfig.mounts).toContain(
      "source=${localEnv:HOME}${localEnv:USERPROFILE}/.config/gemini,target=/home/vscode/.config/gemini,type=bind"
    );
    
    // Test AI context environment variables
    expect(devcontainerConfig.containerEnv.AI_CONTEXT_DIR).toBe('/workspace/.ai');
    expect(devcontainerConfig.containerEnv.AI_CONTEXT_FILE).toBe('/workspace/.ai/context.md');
    
    // Test post-create command
    expect(devcontainerConfig.postCreateCommand).toContain('AI Context created: .ai/ folder with context.md');
    expect(devcontainerConfig.postCreateCommand).toContain('Claude/Gemini settings will persist across container rebuilds');
  });

  test('DevContainer should not add AI mounts when aiContext disabled', () => {
    const config = {
      projectName: 'test-app',
      projectType: 'react',
      backend: 'none',
      aiContext: false,
      strategy: {
        containerStrategy: 'devcontainer',
        environmentConfigs: ['development']
      }
    };
    
    const devcontainerConfig = generateDevcontainerConfig(config);
    
    // Should not have AI-specific mounts
    expect(devcontainerConfig.mounts).toEqual([]);
    expect(devcontainerConfig.containerEnv.AI_CONTEXT_DIR).toBeUndefined();
    expect(devcontainerConfig.containerEnv.AI_CONTEXT_FILE).toBeUndefined();
  });

  test('DevContainer should configure docker-compose with AI context', () => {
    const config = {
      projectName: 'fullstack-app',
      projectType: 'react',
      backend: 'express',
      aiContext: true,
      strategy: {
        containerStrategy: 'docker-compose',
        environmentConfigs: ['development', 'staging', 'production']
      }
    };
    
    const devcontainerConfig = generateDevcontainerConfig(config);
    
    // Test docker-compose configuration
    expect(devcontainerConfig.dockerComposeFile).toBe('docker-compose.yml');
    expect(devcontainerConfig.service).toBe('client');
    expect(devcontainerConfig.workspaceFolder).toBe('/app');
    expect(devcontainerConfig.build).toBeUndefined(); // Should be deleted for docker-compose
    
    // Test port forwarding for full-stack
    expect(devcontainerConfig.forwardPorts).toEqual([3000, 3001, 5432]);
    expect(devcontainerConfig.portsAttributes['3000'].label).toBe('React Client');
    expect(devcontainerConfig.portsAttributes['3001'].label).toBe('Express Server');
    expect(devcontainerConfig.portsAttributes['5432'].label).toBe('PostgreSQL Database');
    
    // Should still have AI persistence
    expect(devcontainerConfig.mounts).toContain(
      "source=${localEnv:HOME}${localEnv:USERPROFILE}/.config/claude-code,target=/home/vscode/.config/claude-code,type=bind"
    );
  });

  test('DevContainer should handle different project types with AI context', () => {
    const configs = [
      {
        projectType: 'react',
        backend: 'nextjs',
        expectedPorts: [3000],
        expectedService: undefined
      },
      {
        projectType: 'react', 
        backend: 'firebase',
        expectedPorts: [3000, 5001, 9099],
        expectedService: undefined
      },
      {
        projectType: 'python',
        backend: 'none',
        expectedPorts: undefined,
        expectedService: undefined
      }
    ];
    
    configs.forEach(({ projectType, backend, expectedPorts, expectedService }) => {
      const config = {
        projectName: 'test-app',
        projectType,
        backend,
        aiContext: true,
        strategy: {
          containerStrategy: 'devcontainer',
          environmentConfigs: ['development']
        }
      };
      
      const devcontainerConfig = generateDevcontainerConfig(config);
      
      // Test project-specific configuration
      if (expectedPorts) {
        expect(devcontainerConfig.forwardPorts).toEqual(expectedPorts);
      }
      
      if (expectedService) {
        expect(devcontainerConfig.service).toBe(expectedService);
      }
      
      // All should have AI persistence when enabled
      expect(devcontainerConfig.containerEnv.AI_CONTEXT_DIR).toBe('/workspace/.ai');
    });
  });

  test('DevContainer should handle lightweight vs full tooling strategies', () => {
    // Lightweight container strategy (React + Express)
    const lightweightConfig = {
      projectName: 'lightweight-app',
      projectType: 'react',
      backend: 'express',
      aiContext: true
    };
    
    const lightweightStrategy = selectConfigurationStrategy(lightweightConfig);
    lightweightConfig.strategy = lightweightStrategy;
    
    const lightweightDevContainer = generateDevcontainerConfig(lightweightConfig);
    
    // Should use docker-compose strategy
    expect(lightweightStrategy.containerStrategy).toBe('docker-compose');
    expect(lightweightStrategy.includeTools.aiClis).toBe(false);
    expect(lightweightDevContainer.dockerComposeFile).toBe('docker-compose.yml');
    
    // Full tooling strategy (React frontend only)
    const fullConfig = {
      projectName: 'full-app',
      projectType: 'react',
      backend: 'none',
      aiContext: true
    };
    
    const fullStrategy = selectConfigurationStrategy(fullConfig);
    fullConfig.strategy = fullStrategy;
    
    const fullDevContainer = generateDevcontainerConfig(fullConfig);
    
    // Should use devcontainer strategy with full tooling
    expect(fullStrategy.containerStrategy).toBe('devcontainer');
    expect(fullStrategy.includeTools.aiClis).toBe(true);
    expect(fullDevContainer.dockerComposeFile).toBeUndefined();
    expect(fullDevContainer.features).toBeDefined();
  });

  test('DevContainer should add React-specific extensions when aiContext enabled', () => {
    const config = {
      projectName: 'react-app',
      projectType: 'react',
      backend: 'none',
      aiContext: true,
      strategy: {
        containerStrategy: 'devcontainer',
        environmentConfigs: ['development']
      }
    };
    
    const devcontainerConfig = generateDevcontainerConfig(config);
    
    // Should add React-specific extensions
    expect(devcontainerConfig.customizations.vscode.extensions).toContain(
      'ES7+ React/Redux/React-Native snippets'
    );
    expect(devcontainerConfig.customizations.vscode.extensions).toContain(
      'Auto Rename Tag'
    );
    expect(devcontainerConfig.customizations.vscode.extensions).toContain(
      'Bracket Pair Colorizer'
    );
    
    // Should have AI context setup
    expect(devcontainerConfig.containerEnv.AI_CONTEXT_DIR).toBe('/workspace/.ai');
  });

  test('DevContainer should add Python extensions for ML projects', () => {
    const config = {
      projectName: 'ml-app',
      projectType: 'python',
      includeMl: true,
      aiContext: true,
      strategy: {
        containerStrategy: 'devcontainer',
        environmentConfigs: ['development']
      }
    };
    
    const devcontainerConfig = generateDevcontainerConfig(config);
    
    // Should add Python and ML-specific extensions
    expect(devcontainerConfig.customizations.vscode.extensions).toContain('ms-python.python');
    expect(devcontainerConfig.customizations.vscode.extensions).toContain('ms-python.pylint');
    expect(devcontainerConfig.customizations.vscode.extensions).toContain('ms-python.black-formatter');
    expect(devcontainerConfig.customizations.vscode.extensions).toContain('ms-toolsai.jupyter');
    expect(devcontainerConfig.customizations.vscode.extensions).toContain('ms-python.vscode-pylance');
  });

});