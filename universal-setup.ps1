# Universal Dev Environment Setup - PowerShell Script for Windows
# Run with: powershell -ExecutionPolicy Bypass -File universal-setup.ps1

param(
    [switch]$SkipChocolatey,
    [switch]$SkipDocker,
    [switch]$Help
)

if ($Help) {
    Write-Host "Universal Dev Environment Setup for Windows" -ForegroundColor Blue
    Write-Host "==========================================" -ForegroundColor Blue
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -SkipChocolatey    Skip Chocolatey package manager installation"
    Write-Host "  -SkipDocker        Skip Docker Desktop installation"
    Write-Host "  -Help              Show this help message"
    Write-Host ""
    Write-Host "Example: .\universal-setup.ps1 -SkipDocker"
    exit 0
}

Write-Host "🚀 Universal Development Environment Setup (Windows)" -ForegroundColor Blue
Write-Host "======================================================" -ForegroundColor Blue

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  This script requires Administrator privileges" -ForegroundColor Yellow
    Write-Host "   Please run PowerShell as Administrator and try again" -ForegroundColor Yellow
    exit 1
}

# Function to check if command exists
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Install Chocolatey if not present and not skipped
if (-not $SkipChocolatey -and -not (Test-Command choco)) {
    Write-Host "📦 Installing Chocolatey package manager..." -ForegroundColor Yellow
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    refreshenv
}

# Install essential tools via Chocolatey
if (Test-Command choco) {
    Write-Host "🔧 Installing essential development tools..." -ForegroundColor Yellow
    
    $tools = @(
        'git',
        'nodejs',
        'vscode',
        'github-desktop'
    )
    
    foreach ($tool in $tools) {
        if (-not (Test-Command $tool)) {
            Write-Host "Installing $tool..." -ForegroundColor Gray
            choco install $tool -y --no-progress
        } else {
            Write-Host "$tool already installed ✓" -ForegroundColor Green
        }
    }
}

# Install Docker Desktop if not skipped
if (-not $SkipDocker -and -not (Test-Command docker)) {
    Write-Host "🐳 Installing Docker Desktop..." -ForegroundColor Yellow
    if (Test-Command choco) {
        choco install docker-desktop -y --no-progress
    } else {
        Write-Host "   Please download Docker Desktop from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    }
}

# Install AI CLI tools via npm
Write-Host "🤖 Installing AI CLI tools..." -ForegroundColor Yellow
if (Test-Command npm) {
    try {
        npm install -g @anthropic-ai/claude-code
        Write-Host "Claude CLI installed ✓" -ForegroundColor Green
    } catch {
        Write-Host "Failed to install Claude CLI - you may need to install it manually" -ForegroundColor Red
    }
    
    try {
        npm install -g @google/gemini-cli
        Write-Host "Gemini CLI installed ✓" -ForegroundColor Green
    } catch {
        Write-Host "Failed to install Gemini CLI - you may need to install it manually" -ForegroundColor Red
    }
} else {
    Write-Host "⚠️  Node.js not found. Please install Node.js first." -ForegroundColor Red
}

# Install GitHub CLI via Chocolatey or manual
Write-Host "📦 Installing GitHub CLI..." -ForegroundColor Yellow
if (Test-Command choco) {
    choco install gh -y --no-progress
} else {
    Write-Host "   Please download GitHub CLI from: https://cli.github.com/" -ForegroundColor Yellow
}

# Create .gitconfig if it doesn't exist
$gitConfigPath = "$env:USERPROFILE\.gitconfig"
if (-not (Test-Path $gitConfigPath)) {
    Write-Host "⚙️  Setting up Git configuration..." -ForegroundColor Yellow
    Write-Host "   Please configure Git with your details:" -ForegroundColor Gray
    Write-Host "   git config --global user.name `"Your Name`"" -ForegroundColor Gray
    Write-Host "   git config --global user.email `"your.email@example.com`"" -ForegroundColor Gray
}

# Install Windows Terminal if not present
if (-not (Get-AppxPackage -Name "Microsoft.WindowsTerminal" -ErrorAction SilentlyContinue)) {
    Write-Host "💻 Installing Windows Terminal..." -ForegroundColor Yellow
    if (Test-Command choco) {
        choco install microsoft-windows-terminal -y --no-progress
    } else {
        Write-Host "   Please install Windows Terminal from Microsoft Store" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "✅ Windows development environment setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🎉 Available tools:" -ForegroundColor Blue
Write-Host "   • Node.js & npm" -ForegroundColor Gray
Write-Host "   • Git & GitHub CLI (gh)" -ForegroundColor Gray
Write-Host "   • Visual Studio Code" -ForegroundColor Gray
Write-Host "   • Docker Desktop" -ForegroundColor Gray
Write-Host "   • Claude CLI (claude)" -ForegroundColor Gray
Write-Host "   • Gemini CLI (gemini)" -ForegroundColor Gray
Write-Host ""
Write-Host "🔄 You may need to restart your terminal or computer for all changes to take effect." -ForegroundColor Yellow
Write-Host ""
Write-Host "📚 Next steps:" -ForegroundColor Blue
Write-Host "   1. Restart your terminal" -ForegroundColor Gray
Write-Host "   2. Configure Git: git config --global user.name `"Your Name`"" -ForegroundColor Gray
Write-Host "   3. Configure Git: git config --global user.email `"your@email.com`"" -ForegroundColor Gray
Write-Host "   4. Login to GitHub: gh auth login" -ForegroundColor Gray
Write-Host "   5. Install Universal Dev Environment: npm install -g @nhangen/universal-dev-env" -ForegroundColor Gray