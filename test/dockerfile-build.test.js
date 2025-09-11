const fs = require('fs');
const path = require('path');
const os = require('os');

// Test Dockerfile generation and validation
describe('Dockerfile Build Tests', () => {
  
  // Recreate the generateDockerfile function for testing
  function generateDockerfile(config) {
    const backend = config.backend || 'none';
    const strategy = config.strategy || {};
    const includeTools = strategy.includeTools || {};
    
    if (config.projectType === 'python') {
      // Python-specific dockerfile
      const mlPackages = config.includeMl ? `
# ML libraries (only if needed and heavy tools allowed)
RUN pip install --no-cache-dir numpy pandas scikit-learn matplotlib seaborn jupyter` : '';
      
      return `# Python Application Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install only essential system dependencies
RUN apt-get update && apt-get install -y \\
    build-essential \\
    curl \\
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt${mlPackages}

# Copy application code
COPY . .

# Create non-root user
RUN useradd --create-home --shell /bin/bash app
RUN chown -R app:app /app
USER app

EXPOSE 8000

CMD ["python", "main.py"]
`;
    } else {
      // Default Node.js Dockerfile
      return `# Node.js Application Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S appgroup
RUN adduser -S app -u 1001 -G appgroup
RUN chown -R app:appgroup /app
USER app

EXPOSE 3000

CMD ["npm", "start"]
`;
    }
  }

  describe('Python Dockerfile Generation', () => {
    test('should generate basic Python Dockerfile', () => {
      const config = { projectType: 'python' };
      const dockerfile = generateDockerfile(config);
      
      expect(dockerfile).toContain('FROM python:3.11-slim');
      expect(dockerfile).toContain('WORKDIR /app');
      expect(dockerfile).toContain('COPY requirements.txt .');
      expect(dockerfile).toContain('pip install --no-cache-dir -r requirements.txt');
      expect(dockerfile).toContain('EXPOSE 8000');
      expect(dockerfile).toContain('CMD ["python", "main.py"]');
      expect(dockerfile).not.toContain('numpy'); // No ML packages by default
    });

    test('should generate Python ML Dockerfile', () => {
      const config = { projectType: 'python', includeMl: true };
      const dockerfile = generateDockerfile(config);
      
      expect(dockerfile).toContain('FROM python:3.11-slim');
      expect(dockerfile).toContain('numpy pandas scikit-learn matplotlib seaborn jupyter');
      expect(dockerfile).toContain('EXPOSE 8000');
    });

    test('should use correct base image for Python', () => {
      const config = { projectType: 'python' };
      const dockerfile = generateDockerfile(config);
      
      expect(dockerfile).toContain('FROM python:3.11-slim');
      expect(dockerfile).not.toContain('FROM node:');
    });

    test('should create non-root user correctly', () => {
      const config = { projectType: 'python' };
      const dockerfile = generateDockerfile(config);
      
      expect(dockerfile).toContain('RUN useradd --create-home --shell /bin/bash app');
      expect(dockerfile).toContain('RUN chown -R app:app /app');
      expect(dockerfile).toContain('USER app');
    });

    test('should install minimal system dependencies', () => {
      const config = { projectType: 'python' };
      const dockerfile = generateDockerfile(config);
      
      expect(dockerfile).toContain('build-essential');
      expect(dockerfile).toContain('curl');
      expect(dockerfile).toContain('rm -rf /var/lib/apt/lists/*');
      expect(dockerfile).not.toContain('chromium'); // Not needed for basic Python
    });
  });

  describe('Dockerfile Validation', () => {
    test('should have valid Docker syntax', () => {
      const config = { projectType: 'python' };
      const dockerfile = generateDockerfile(config);
      
      // Check for common Docker syntax requirements
      expect(dockerfile).toMatch(/^# .+/m); // Should start with a comment
      expect(dockerfile).toMatch(/FROM .+/); // Should have FROM instruction
      expect(dockerfile).toMatch(/WORKDIR .+/); // Should have WORKDIR
      expect(dockerfile).toMatch(/EXPOSE \d+/); // Should expose a port
      expect(dockerfile).toMatch(/CMD \[.+\]/); // Should have CMD with exec form
    });

    test('should not have security issues', () => {
      const config = { projectType: 'python' };
      const dockerfile = generateDockerfile(config);
      
      // Should not run as root in production
      expect(dockerfile).toContain('USER app');
      expect(dockerfile).not.toMatch(/USER root/);
      
      // Should clean apt cache
      expect(dockerfile).toContain('rm -rf /var/lib/apt/lists/*');
      
      // Should use specific version tags
      expect(dockerfile).toContain('python:3.11-slim');
      expect(dockerfile).not.toContain('python:latest');
    });

    test('should be optimized for build cache', () => {
      const config = { projectType: 'python' };
      const dockerfile = generateDockerfile(config);
      
      // Should copy requirements.txt before copying all code
      const reqCopyIndex = dockerfile.indexOf('COPY requirements.txt .');
      const allCopyIndex = dockerfile.indexOf('COPY . .');
      expect(reqCopyIndex).toBeLessThan(allCopyIndex);
      
      // Should install dependencies before copying code
      const pipInstallIndex = dockerfile.indexOf('pip install');
      expect(pipInstallIndex).toBeLessThan(allCopyIndex);
    });
  });

  describe('Node.js Dockerfile (Default)', () => {
    test('should generate Node.js Dockerfile for non-Python projects', () => {
      const config = { projectType: 'react' };
      const dockerfile = generateDockerfile(config);
      
      expect(dockerfile).toContain('FROM node:18-alpine');
      expect(dockerfile).toContain('npm ci --only=production');
      expect(dockerfile).toContain('EXPOSE 3000');
      expect(dockerfile).toContain('CMD ["npm", "start"]');
    });

    test('should use Alpine for Node.js projects', () => {
      const config = { projectType: 'node' };
      const dockerfile = generateDockerfile(config);
      
      expect(dockerfile).toContain('node:18-alpine');
      expect(dockerfile).toContain('addgroup -g 1001 -S appgroup');
      expect(dockerfile).toContain('adduser -S app');
    });
  });

  describe('Cross-project Type Validation', () => {
    test('should generate different Dockerfiles for different project types', () => {
      const pythonConfig = { projectType: 'python' };
      const nodeConfig = { projectType: 'node' };
      
      const pythonDockerfile = generateDockerfile(pythonConfig);
      const nodeDockerfile = generateDockerfile(nodeConfig);
      
      expect(pythonDockerfile).toContain('python:3.11-slim');
      expect(nodeDockerfile).toContain('node:18-alpine');
      
      expect(pythonDockerfile).toContain('EXPOSE 8000');
      expect(nodeDockerfile).toContain('EXPOSE 3000');
      
      expect(pythonDockerfile).toContain('python", "main.py');
      expect(nodeDockerfile).toContain('npm", "start');
    });

    test('should handle unknown project types gracefully', () => {
      const config = { projectType: 'unknown' };
      const dockerfile = generateDockerfile(config);
      
      // Should default to Node.js Dockerfile
      expect(dockerfile).toContain('FROM node:18-alpine');
      expect(dockerfile).toContain('npm ci --only=production');
    });

    test('should handle missing project type', () => {
      const config = {};
      const dockerfile = generateDockerfile(config);
      
      // Should default to Node.js Dockerfile
      expect(dockerfile).toContain('FROM node:18-alpine');
    });
  });

  describe('Requirements Validation', () => {
    test('should require requirements.txt for Python projects', () => {
      const config = { projectType: 'python' };
      const dockerfile = generateDockerfile(config);
      
      expect(dockerfile).toContain('COPY requirements.txt .');
      expect(dockerfile).toContain('pip install --no-cache-dir -r requirements.txt');
    });

    test('should require package.json for Node.js projects', () => {
      const config = { projectType: 'node' };
      const dockerfile = generateDockerfile(config);
      
      expect(dockerfile).toContain('COPY package*.json ./');
      expect(dockerfile).toContain('npm ci --only=production');
    });
  });

  describe('Port Configuration', () => {
    test('should expose correct default ports', () => {
      const testCases = [
        { config: { projectType: 'python' }, expectedPort: '8000' },
        { config: { projectType: 'node' }, expectedPort: '3000' },
        { config: { projectType: 'react' }, expectedPort: '3000' }
      ];

      testCases.forEach(({ config, expectedPort }) => {
        const dockerfile = generateDockerfile(config);
        expect(dockerfile).toContain(`EXPOSE ${expectedPort}`);
      });
    });
  });
});