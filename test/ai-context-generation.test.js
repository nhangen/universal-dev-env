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

const { 
  generateAIContext, 
  generateRecentWork, 
  generatePreferences,
  selectConfigurationStrategy 
} = require('../bin/universal-setup.js');

describe('AI Context Generation', () => {
  
  test('generateAIContext should create comprehensive context for React+Express', () => {
    const config = {
      projectName: 'test-app',
      projectType: 'react',
      backend: 'express',
      aiContext: true,
      strategy: {
        containerStrategy: 'docker-compose',
        deploymentStrategy: 'containerized',
        installLocation: 'container',
        environmentConfigs: ['development', 'staging', 'production'],
        includeTools: {
          aiClis: false,
          cloudClis: false,
          heavyTools: false
        }
      }
    };
    
    const aiContext = generateAIContext(config);
    
    // Test project overview section
    expect(aiContext).toContain('# AI Context for test-app');
    expect(aiContext).toContain('**Project**: test-app');
    expect(aiContext).toContain('**Type**: React');
    expect(aiContext).toContain('**Backend**: Express');
    expect(aiContext).toContain('**Container Strategy**: docker-compose');
    expect(aiContext).toContain('**Deployment Strategy**: containerized');
    
    // Test quick start prompt
    expect(aiContext).toContain('This is a react + express project using docker-compose strategy');
    expect(aiContext).toContain('Lightweight container setup excludes heavy CLI tools');
    
    // Test architecture details
    expect(aiContext).toContain('Client (3000), Server (3001), Database (5432)');
    expect(aiContext).toContain('Express.js 4.18.0 with PostgreSQL database');
    
    // Test lightweight container messaging
    expect(aiContext).toContain('Lightweight Container Setup');
    expect(aiContext).toContain('50-80% reduction');
    expect(aiContext).toContain('Heavy tools like Claude CLI, Google Cloud CLI are on the host system');
    
    // Test AI tool persistence instructions
    expect(aiContext).toContain('Claude CLI Persistence');
    expect(aiContext).toContain('~/.config/claude-code/settings.local.json');
    expect(aiContext).toContain('Gemini CLI Persistence');
    expect(aiContext).toContain('~/.config/gemini/settings.json');
    expect(aiContext).toContain('state_snapshot.xml');
  });

  test('generateAIContext should handle frontend-only React project', () => {
    const config = {
      projectName: 'simple-react',
      projectType: 'react',
      backend: 'none',
      strategy: {
        containerStrategy: 'devcontainer',
        deploymentStrategy: 'static',
        installLocation: 'host',
        environmentConfigs: ['development'],
        includeTools: {
          aiClis: true,
          cloudClis: true,
          heavyTools: true
        }
      }
    };
    
    const aiContext = generateAIContext(config);
    
    expect(aiContext).not.toContain('**Backend**:'); // Should not show backend when none specified
    expect(aiContext).toContain('Full AI/Cloud tooling available');
    expect(aiContext).toContain('Frontend development');
    expect(aiContext).toContain('AI & Cloud Tools (Host Installation)');
    expect(aiContext).toContain('Claude CLI, Gemini CLI available on host');
    expect(aiContext).not.toContain('Lightweight Container Setup');
  });

  test('generateAIContext should handle Python ML project', () => {
    const config = {
      projectName: 'ml-project',
      projectType: 'python',
      includeMl: true,
      strategy: {
        containerStrategy: 'docker',
        deploymentStrategy: 'containerized',
        environmentConfigs: ['development', 'production'],
        includeTools: { aiClis: false }
      }
    };
    
    const aiContext = generateAIContext(config);
    
    expect(aiContext).toContain('**Type**: Python');
    expect(aiContext).toContain('**ML Libraries**: NumPy, Pandas, Scikit-learn, Jupyter');
    expect(aiContext).toContain('ML Library Integration');
    expect(aiContext).toContain('Conda environment with optimized ML package installation');
    expect(aiContext).toContain('Python 3.11');
  });

});

describe('Recent Work Generation', () => {
  
  test('generateRecentWork should create development log template', () => {
    const config = {
      projectName: 'test-app',
      projectType: 'react',
      backend: 'express',
      strategy: { containerStrategy: 'docker-compose', includeTools: { aiClis: false } }
    };
    
    const recentWork = generateRecentWork(config);
    
    // Test header and instructions
    expect(recentWork).toContain('# Recent Work - test-app');
    expect(recentWork).toContain('**AI Instructions**: This file tracks recent development sessions');
    
    // Test initial session
    expect(recentWork).toContain('Session 1: Initial Project Setup');
    expect(recentWork).toContain('Setting up react + express development environment');
    expect(recentWork).toContain('Generated project structure with Universal Dev Environment');
    expect(recentWork).toContain('Configured docker-compose container strategy');
    expect(recentWork).toContain('lightweight containers with host-based tools');
    
    // Test next steps
    expect(recentWork).toContain('Set up database schema and API endpoints');
    expect(recentWork).toContain('Complete development environment testing');
    
    // Test template
    expect(recentWork).toContain('Development Log Template');
    expect(recentWork).toContain('Session [N]: [Focus Area] ([Date])');
    expect(recentWork).toContain('Keep the last 5-10 sessions for context');
  });

  test('generateRecentWork should handle ML projects', () => {
    const config = {
      projectName: 'ml-app',
      projectType: 'python',
      includeMl: true,
      strategy: { includeTools: { aiClis: true } }
    };
    
    const recentWork = generateRecentWork(config);
    
    expect(recentWork).toContain('Configured ML environment with conda and data science libraries');
  });

});

describe('Preferences Generation', () => {
  
  test('generatePreferences should create React coding standards', () => {
    const config = {
      projectName: 'react-app',
      projectType: 'react',
      backend: 'none',
      strategy: { 
        containerStrategy: 'devcontainer',
        environmentConfigs: ['development'],
        deploymentStrategy: 'static',
        includeTools: { aiClis: true }
      }
    };
    
    const preferences = generatePreferences(config);
    
    // Test React-specific patterns
    expect(preferences).toContain('# Development Preferences - react-app');
    expect(preferences).toContain('React/JavaScript');
    expect(preferences).toContain('Functional components with hooks (no class components)');
    expect(preferences).toContain('Context API for global state, useState for local');
    expect(preferences).toContain('Jest + React Testing Library');
    
    // Test code examples
    expect(preferences).toContain('// Preferred component pattern');
    expect(preferences).toContain('import React, { useState, useEffect }');
    expect(preferences).toContain('const MyComponent = ({ prop1, prop2 }) => {');
    
    // Test file organization
    expect(preferences).toContain('File Organization');
    expect(preferences).toContain('kebab-case for components');
    expect(preferences).toContain('PascalCase');
  });

  test('generatePreferences should create Express backend patterns', () => {
    const config = {
      projectName: 'fullstack-app',
      projectType: 'react',
      backend: 'express',
      strategy: { 
        containerStrategy: 'docker-compose',
        deploymentStrategy: 'containerized'
      }
    };
    
    const preferences = generatePreferences(config);
    
    // Test Express-specific patterns
    expect(preferences).toContain('Express.js/Node.js');
    expect(preferences).toContain('RESTful API design with clear route separation');
    expect(preferences).toContain('PostgreSQL with connection pooling');
    expect(preferences).toContain('JWT tokens with secure practices');
    
    // Test API patterns
    expect(preferences).toContain('// Preferred route pattern');
    expect(preferences).toContain('const express = require(\'express\')');
    expect(preferences).toContain('router.get(\'/api/resource\', async (req, res, next)');
    
    // Test project structure
    expect(preferences).toContain('client/');
    expect(preferences).toContain('server/');
    expect(preferences).toContain('routes/            # API route definitions');
    expect(preferences).toContain('Redis for session and API caching');
  });

  test('generatePreferences should create Python coding standards', () => {
    const config = {
      projectName: 'python-app',
      projectType: 'python',
      includeMl: true,
      features: ['playwright']
    };
    
    const preferences = generatePreferences(config);
    
    // Test Python-specific patterns
    expect(preferences).toContain('Python');
    expect(preferences).toContain('PEP 8 compliance with black formatting');
    expect(preferences).toContain('Type hints for all function parameters and returns');
    expect(preferences).toContain('Jupyter notebooks for exploration, .py files for production');
    
    // Test Python code examples
    expect(preferences).toContain('from typing import List, Optional');
    expect(preferences).toContain('def process_data(input_data: List[str], threshold: float = 0.5)');
    expect(preferences).toContain('"""');
    expect(preferences).toContain('logger.error(f"Data processing failed: {e}")');
    
    // Test testing approach with Playwright
    expect(preferences).toContain('Browser Testing');
    expect(preferences).toContain('Playwright for cross-browser compatibility');
  });

});

describe('AI Context Integration with Configuration Strategy', () => {
  
  test('AI context should integrate with lightweight container strategy', () => {
    const config = {
      projectType: 'react',
      backend: 'express',
      projectName: 'test-app'
    };
    
    const strategy = selectConfigurationStrategy(config);
    config.strategy = strategy;
    
    const aiContext = generateAIContext(config);
    
    // Should reflect container strategy decisions
    expect(strategy.containerStrategy).toBe('docker-compose');
    expect(strategy.installLocation).toBe('container');
    expect(strategy.includeTools.aiClis).toBe(false);
    
    // AI context should reflect these decisions
    expect(aiContext).toContain('docker-compose');
    expect(aiContext).toContain('Lightweight container setup excludes heavy CLI tools');
    expect(aiContext).toContain('Heavy tools like Claude CLI, Google Cloud CLI are on the host system');
  });

  test('AI context should handle host-based tool installation', () => {
    const config = {
      projectType: 'react',
      backend: 'firebase',
      projectName: 'firebase-app'
    };
    
    const strategy = selectConfigurationStrategy(config);
    config.strategy = strategy;
    
    const aiContext = generateAIContext(config);
    
    // Should use host installation for serverless
    expect(strategy.installLocation).toBe('host');
    expect(strategy.includeTools.aiClis).toBe(true);
    expect(strategy.includeTools.cloudClis).toBe(true);
    
    // AI context should reflect full tooling
    expect(aiContext).toContain('Full AI/Cloud tooling available');
    expect(aiContext).toContain('AI & Cloud Tools (Host Installation)');
    expect(aiContext).not.toContain('Lightweight Container Setup');
  });

});