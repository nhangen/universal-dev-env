// Mock fs module before requiring the main module
jest.mock('fs');
jest.mock('path');

const fs = require('fs');
const path = require('path');

// Mock the universal devcontainer config file
fs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
  name: 'Universal Dev Environment',
  forwardPorts: [3000],
  customizations: {
    vscode: {
      extensions: []
    }
  }
}));

path.join = jest.fn((...args) => args.join('/'));

const { selectConfigurationStrategy } = require('../bin/universal-setup.js');

describe('Configuration Strategy Selection', () => {
  
  test('React + Express should use docker-compose strategy', () => {
    const config = {
      projectType: 'react',
      backend: 'express',
      projectName: 'test-app'
    };
    
    const strategy = selectConfigurationStrategy(config);
    
    expect(strategy.containerStrategy).toBe('docker-compose');
    expect(strategy.deploymentStrategy).toBe('containerized');
    expect(strategy.installLocation).toBe('container');
    expect(strategy.environmentConfigs).toEqual(['development', 'staging', 'production']);
    expect(strategy.includeTools.aiClis).toBe(false); // No AI CLIs in containers
    expect(strategy.includeTools.cloudClis).toBe(false); // No cloud CLIs in containers
  });

  test('React frontend-only should use devcontainer with host tools', () => {
    const config = {
      projectType: 'react',
      backend: 'none',
      projectName: 'simple-react'
    };
    
    const strategy = selectConfigurationStrategy(config);
    
    expect(strategy.containerStrategy).toBe('devcontainer');
    expect(strategy.deploymentStrategy).toBe('static');
    expect(strategy.installLocation).toBe('host');
    expect(strategy.includeTools.aiClis).toBe(true); // AI CLIs on host
    expect(strategy.includeTools.cloudClis).toBe(true); // Cloud CLIs on host
  });

  test('Next.js should use docker with container tools', () => {
    const config = {
      projectType: 'react',
      backend: 'nextjs',
      projectName: 'nextjs-app'
    };
    
    const strategy = selectConfigurationStrategy(config);
    
    expect(strategy.containerStrategy).toBe('docker');
    expect(strategy.deploymentStrategy).toBe('hybrid');
    expect(strategy.installLocation).toBe('container');
    expect(strategy.includeTools.aiClis).toBe(false); // No AI CLIs in containers
  });

  test('Firebase project should use devcontainer with host tools', () => {
    const config = {
      projectType: 'react',
      backend: 'firebase',
      projectName: 'firebase-app'
    };
    
    const strategy = selectConfigurationStrategy(config);
    
    expect(strategy.containerStrategy).toBe('devcontainer');
    expect(strategy.deploymentStrategy).toBe('serverless');
    expect(strategy.installLocation).toBe('host');
    expect(strategy.configFormat).toBe('yaml');
    expect(strategy.includeTools.cloudClis).toBe(true); // Needs Firebase CLI on host
  });

  test('Python project should use docker with lightweight containers', () => {
    const config = {
      projectType: 'python',
      projectName: 'python-app',
      includeMl: true
    };
    
    const strategy = selectConfigurationStrategy(config);
    
    expect(strategy.containerStrategy).toBe('docker');
    expect(strategy.deploymentStrategy).toBe('containerized');
    expect(strategy.installLocation).toBe('container');
    expect(strategy.configFormat).toBe('yaml');
    expect(strategy.includeTools.aiClis).toBe(false); // No AI CLIs in containers
    expect(strategy.additionalConfigs).toContain('jupyter');
    expect(strategy.additionalConfigs).toContain('conda');
  });

  test('Full-stack project should use docker-compose', () => {
    const config = {
      projectType: 'full-stack',
      projectName: 'fullstack-app'
    };
    
    const strategy = selectConfigurationStrategy(config);
    
    expect(strategy.containerStrategy).toBe('docker-compose');
    expect(strategy.deploymentStrategy).toBe('containerized');
    expect(strategy.installLocation).toBe('container');
    expect(strategy.environmentConfigs).toEqual(['development', 'staging', 'production']);
  });

  test('Playwright feature should be added to additional configs', () => {
    const config = {
      projectType: 'react',
      backend: 'none',
      projectName: 'test-app',
      features: ['playwright']
    };
    
    const strategy = selectConfigurationStrategy(config);
    
    expect(strategy.additionalConfigs).toContain('playwright');
    expect(strategy.includeTools.heavyTools).toBe(true); // Host installation allows heavy tools
  });

});