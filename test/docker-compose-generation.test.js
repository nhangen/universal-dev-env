// Mock fs module before requiring the main module
jest.mock('fs');
jest.mock('path');

const fs = require('fs');
const path = require('path');

// Mock the universal devcontainer config file  
fs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
  name: 'Universal Dev Environment',
  forwardPorts: [3000],
  customizations: { vscode: { extensions: [] } }
}));

path.join = jest.fn((...args) => args.join('/'));

const { generateDockerCompose } = require('../bin/universal-setup.js');

describe('Docker Compose Generation', () => {
  
  test('React + Express should generate multi-service compose with database', () => {
    const config = {
      projectType: 'react',
      backend: 'express',
      projectName: 'fullstack-app'
    };
    
    const dockerCompose = generateDockerCompose(config);
    
    expect(dockerCompose).toContain('version: \'3.8\'');
    expect(dockerCompose).toContain('services:');
    expect(dockerCompose).toContain('client:');
    expect(dockerCompose).toContain('server:');
    expect(dockerCompose).toContain('db:');
    expect(dockerCompose).toContain('postgres:15-alpine');
    expect(dockerCompose).toContain('3000:3000');
    expect(dockerCompose).toContain('3001:3001');
    expect(dockerCompose).toContain('5432:5432');
    expect(dockerCompose).toContain('postgres_data:');
  });

  test('Full-stack project should generate frontend/backend services', () => {
    const config = {
      projectType: 'full-stack',
      projectName: 'fullstack-app'
    };
    
    const dockerCompose = generateDockerCompose(config);
    
    expect(dockerCompose).toContain('frontend:');
    expect(dockerCompose).toContain('backend:');
    expect(dockerCompose).toContain('redis:');
    expect(dockerCompose).toContain('redis:7-alpine');
  });

  test('Generic project should generate simple single-service compose', () => {
    const config = {
      projectType: 'node',
      projectName: 'simple-app'
    };
    
    const dockerCompose = generateDockerCompose(config);
    
    expect(dockerCompose).toContain('version: \'3.8\'');
    expect(dockerCompose).toContain('app:');
    expect(dockerCompose).toContain('build: .');
    expect(dockerCompose).toContain('3000:3000');
    expect(dockerCompose).not.toContain('client:');
    expect(dockerCompose).not.toContain('server:');
  });

});