class UniversalDevEnv < Formula
  desc "Universal development environment setup for modern web projects"
  homepage "https://github.com/nhangen/universal-dev-env"
  url "https://github.com/nhangen/universal-dev-env/archive/v1.0.0.tar.gz"
  sha256 "YOUR_SHA256_HERE"
  license "MIT"

  depends_on "node"
  depends_on "docker"

  def install
    # Install the main script
    bin.install "universal-setup.sh" => "universal-dev-setup"
    
    # Install Node.js CLI
    system "npm", "install", "--global", "--prefix=#{prefix}", "."
    
    # Install templates and configuration files
    (share/"universal-dev-env").install "Dockerfile.universal"
    (share/"universal-dev-env").install "devcontainer.universal.json"
    (share/"universal-dev-env").install "README-universal-setup.md"
    
    # Create symlinks for easy access
    bin.install_symlink share/"universal-dev-env/bin/universal-setup.js" => "uds"
  end

  test do
    system "#{bin}/universal-dev-setup", "--version"
    system "#{bin}/uds", "--version"
  end

  def caveats
    <<~EOS
      Universal Dev Environment has been installed!
      
      Available commands:
        universal-dev-setup  # Main setup script
        uds                  # Node.js CLI tool
      
      Get started:
        1. mkdir my-project && cd my-project
        2. uds init
        3. Open in VS Code with Dev Containers extension
      
      Documentation: https://github.com/nhangen/universal-dev-env
    EOS
  end
end