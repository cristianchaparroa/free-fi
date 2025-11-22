#!/bin/bash

echo "🔧 FreeFi - Node.js Upgrade Script"
echo "=================================="
echo ""
echo "Current Node.js version: $(node --version)"
echo "Required: >= v20.9.0"
echo ""

# Option 1: Install nvm (Node Version Manager) - RECOMMENDED
echo "📦 Option 1: Install nvm (Recommended)"
echo "---------------------------------------"
echo "Run these commands:"
echo ""
echo "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash"
echo "source ~/.bashrc  # or source ~/.zshrc if using zsh"
echo "nvm install 20"
echo "nvm use 20"
echo "nvm alias default 20"
echo ""

# Option 2: System-wide upgrade
echo "📦 Option 2: System-wide upgrade"
echo "--------------------------------"
echo "Run these commands:"
echo ""
echo "curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
echo "sudo apt-get install -y nodejs"
echo ""

# Option 3: Using snap
echo "📦 Option 3: Using snap (fastest)"
echo "--------------------------------"
echo "Run these commands:"
echo ""
echo "sudo snap install node --classic --channel=20"
echo ""

echo "After upgrading, verify with:"
echo "node --version  # Should show v20.x.x"
echo ""
echo "Then restart the dev server:"
echo "cd /home/hackwy/frontend/free-fi/frontend"
echo "npm run dev"
