.PHONY: help abis contracts frontend-setup deploy-all clean

# Default target
help:
	@echo "FreeFi - Makefile Commands"
	@echo ""
	@echo "Frontend Integration:"
	@echo "  make abis              - Generate contract ABIs and copy to frontend"
	@echo "  make contracts         - Update frontend with latest contract addresses"
	@echo "  make frontend-setup    - Complete frontend setup (abis + contracts)"
	@echo ""
	@echo "Blockchain:"
	@echo "  make deploy-all        - Run full deployment script"
	@echo "  make build             - Build contracts with Foundry"
	@echo "  make test              - Run contract tests"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean             - Clean build artifacts"

# Generate ABIs and copy to frontend
abis:
	@echo "🔨 Generating contract ABIs..."
	@cd blockchain && forge build
	@mkdir -p frontend/src/lib/abis
	@cd blockchain && cat out/VaultEVVM.sol/VaultEVVM.json | jq '.abi' > ../frontend/src/lib/abis/VaultEVVM.abi.json
	@cd blockchain && cat out/YieldFlowOFTEVVM.sol/YieldFlowOFTEVVM.json | jq '.abi' > ../frontend/src/lib/abis/YieldFlowOFTEVVM.abi.json
	@cd blockchain && cat out/MockERC20.sol/MockERC20.json | jq '.abi' > ../frontend/src/lib/abis/MockERC20.abi.json
	@echo "✅ ABIs generated and copied to frontend/src/lib/abis/"

# Update contract addresses from deployment files
contracts:
	@echo "📝 Updating contract addresses..."
	@if [ ! -f blockchain/deployments/sepolia-complete.json ]; then \
		echo "❌ Error: blockchain/deployments/sepolia-complete.json not found"; \
		echo "   Run 'make deploy-all' first or deploy contracts manually"; \
		exit 1; \
	fi
	@# Extract addresses from deployment files
	@VAULT=$$(jq -r '.vault' blockchain/deployments/sepolia-complete.json); \
	OFT=$$(jq -r '.oft' blockchain/deployments/sepolia-complete.json); \
	USDC=$$(jq -r '.usdc' blockchain/deployments/sepolia-complete.json); \
	echo "Updating frontend/src/lib/contracts.ts..."; \
	sed -i.bak "s/vault: '0x[a-fA-F0-9]*'/vault: '$$VAULT'/" frontend/src/lib/contracts.ts; \
	sed -i.bak "s/oft: '0x[a-fA-F0-9]*'/oft: '$$OFT'/" frontend/src/lib/contracts.ts; \
	sed -i.bak "s/usdc: '0x[a-fA-F0-9]*'/usdc: '$$USDC'/" frontend/src/lib/contracts.ts; \
	rm -f frontend/src/lib/contracts.ts.bak
	@# Also update executor API
	@VAULT=$$(jq -r '.vault' blockchain/deployments/sepolia-complete.json); \
	echo "Updating frontend/src/app/api/executor/route.ts..."; \
	sed -i.bak "s/const VAULT_ADDRESS = '0x[a-fA-F0-9]*'/const VAULT_ADDRESS = '$$VAULT'/" frontend/src/app/api/executor/route.ts; \
	rm -f frontend/src/app/api/executor/route.ts.bak
	@echo "✅ Contract addresses updated!"
	@echo "   Sepolia Vault: $$(jq -r '.vault' blockchain/deployments/sepolia-complete.json)"
	@echo "   Sepolia OFT:   $$(jq -r '.oft' blockchain/deployments/sepolia-complete.json)"
	@echo "   Sepolia USDC:  $$(jq -r '.usdc' blockchain/deployments/sepolia-complete.json)"

# Complete frontend setup
frontend-setup: abis contracts
	@echo ""
	@echo "✅ Frontend setup complete!"
	@echo ""
	@echo "Next steps:"
	@echo "  1. cd frontend"
	@echo "  2. npm install (if not done)"
	@echo "  3. npm run dev"
	@echo ""
	@echo "Contract addresses are in: frontend/src/lib/contracts.ts"
	@echo "Contract ABIs are in: frontend/src/lib/abis/"

# Build contracts
build:
	@echo "🔨 Building contracts..."
	@cd blockchain && forge build

# Run tests
test:
	@echo "🧪 Running tests..."
	@cd blockchain && forge test -vvv

# Deploy all contracts (requires .env setup)
deploy-all:
	@echo "🚀 Running full deployment..."
	@if [ ! -f blockchain/.env ]; then \
		echo "❌ Error: blockchain/.env not found"; \
		echo "   Copy blockchain/.env.example to blockchain/.env and configure it"; \
		exit 1; \
	fi
	@cd blockchain && ./deploy-full.sh

# Clean build artifacts
clean:
	@echo "🧹 Cleaning build artifacts..."
	@cd blockchain && forge clean
	@rm -rf blockchain/out blockchain/cache
	@rm -rf frontend/src/lib/abis/*.json
	@echo "✅ Clean complete"

# Install dependencies
install:
	@echo "📦 Installing dependencies..."
	@cd blockchain && forge install
	@cd frontend && npm install
	@echo "✅ Dependencies installed"

# Quick dev setup (first time)
setup: install build frontend-setup
	@echo ""
	@echo "✅ Development environment ready!"
	@echo ""
	@echo "To deploy contracts:"
	@echo "  1. Configure blockchain/.env with your private key"
	@echo "  2. make deploy-all"
	@echo ""
	@echo "To start frontend:"
	@echo "  1. cd frontend"
	@echo "  2. npm run dev"
