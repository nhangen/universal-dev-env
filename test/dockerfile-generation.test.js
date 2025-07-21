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

const { generateDockerfile } = require('../bin/universal-setup.js');

describe('Dockerfile Generation', () => {
  
  test('Next.js Dockerfile should be multi-stage and optimized', () => {
    const config = {
      projectType: 'react',
      backend: 'nextjs',
      projectName: 'nextjs-app',
      strategy: {
        includeTools: { heavyTools: false }
      }
    };
    
    const dockerfile = generateDockerfile(config);
    
    expect(dockerfile).toContain('FROM node:18-alpine AS base');
    expect(dockerfile).toContain('FROM base AS deps');
    expect(dockerfile).toContain('FROM base AS builder');
    expect(dockerfile).toContain('FROM base AS runner');
    expect(dockerfile).toContain('USER nextjs');
    expect(dockerfile).not.toContain('gcloud');
    expect(dockerfile).not.toContain('claude');
  });

  test('Python Dockerfile should be lightweight without ML packages when heavy tools disabled', () => {
    const config = {
      projectType: 'python',
      projectName: 'python-app',
      includeMl: true,
      strategy: {
        includeTools: { heavyTools: false }
      }
    };
    
    const dockerfile = generateDockerfile(config);
    
    expect(dockerfile).toContain('FROM python:3.11-slim');
    expect(dockerfile).toContain('USER app');
    expect(dockerfile).toContain('build-essential');
    expect(dockerfile).not.toContain('numpy pandas scikit-learn'); // No ML in lightweight container
  });

  test('Python Dockerfile should include ML packages when heavy tools enabled', () => {
    const config = {
      projectType: 'python',
      projectName: 'python-ml-app',
      includeMl: true,
      strategy: {
        includeTools: { heavyTools: true }
      }
    };
    
    const dockerfile = generateDockerfile(config);
    
    expect(dockerfile).toContain('FROM python:3.11-slim');
    expect(dockerfile).toContain('numpy pandas scikit-learn matplotlib seaborn jupyter');
  });

  test('Generic Node.js Dockerfile should be minimal', () => {
    const config = {
      projectType: 'node',
      projectName: 'simple-node',
      strategy: {
        includeTools: { heavyTools: false }
      }
    };
    
    const dockerfile = generateDockerfile(config);
    
    expect(dockerfile).toContain('FROM node:18-alpine');
    expect(dockerfile).toContain('npm ci --only=production');
    expect(dockerfile).toContain('USER app');
    expect(dockerfile).toContain('EXPOSE 3000');
    expect(dockerfile).not.toContain('gcloud');
    expect(dockerfile).not.toContain('playwright');
  });

});