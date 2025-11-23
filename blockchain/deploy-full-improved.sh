#!/bin/bash

# FreeFi Protocol - Improved Full Deployment Script
# This script deploys the complete FreeFi protocol with automatic frontend updates
# Improvements over deploy-full.sh:
# - Runs forge clean before building (ensures fresh bytecode)
# - Automatically updates frontend after deployment
# - Better validation and error checking

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}===================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}===================================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Check if .env file exists
if [ ! -f .env ]; then
    print_error ".env file not found!"
    print_info "Please create a .env file with PRIVATE_KEY and ETHERSCAN_API_KEY"
    exit 1
fi

# Load environment variables
source .env

# Check if PRIVATE_KEY is set
if [ -z "$PRIVATE_KEY" ]; then
    print_error "PRIVATE_KEY not set in .env file"
    exit 1
fi

# Configuration
DEPLOY_SEPOLIA=true
DEPLOY_ARBITRUM=true
DEPLOY_BASE=false
CONFIGURE_PEERS=true
VERIFY_CONTRACTS=true
UPDATE_FRONTEND=true
CLEAN_BUILD=true

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-sepolia)
            DEPLOY_SEPOLIA=false
            shift
            ;;
        --skip-arbitrum)
            DEPLOY_ARBITRUM=false
            shift
            ;;
        --deploy-base)
            DEPLOY_BASE=true
            shift
            ;;
        --skip-verify)
            VERIFY_CONTRACTS=false
            shift
            ;;
        --skip-peers)
            CONFIGURE_PEERS=false
            shift
            ;;
        --skip-frontend)
            UPDATE_FRONTEND=false
            shift
            ;;
        --skip-clean)
            CLEAN_BUILD=false
            shift
            ;;
        --help)
            echo "Usage: ./deploy-full-improved.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --skip-sepolia      Skip Sepolia deployment"
            echo "  --skip-arbitrum     Skip Arbitrum Sepolia deployment"
            echo "  --deploy-base       Deploy on Base Sepolia"
            echo "  --skip-verify       Skip contract verification"
            echo "  --skip-peers        Skip LayerZero peer configuration"
            echo "  --skip-frontend     Skip automatic frontend update"
            echo "  --skip-clean        Skip forge clean (use cached build)"
            echo "  --help              Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

print_step "FreeFi Protocol - Improved Deployment"
echo ""
print_info "Configuration:"
echo "  Deploy Sepolia: $DEPLOY_SEPOLIA"
echo "  Deploy Arbitrum: $DEPLOY_ARBITRUM"
echo "  Deploy Base: $DEPLOY_BASE"
echo "  Verify Contracts: $VERIFY_CONTRACTS"
echo "  Configure Peers: $CONFIGURE_PEERS"
echo "  Update Frontend: $UPDATE_FRONTEND"
echo "  Clean Build: $CLEAN_BUILD"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

# ========== STEP 0: Clean and Build ==========
if [ "$CLEAN_BUILD" = true ]; then
    print_step "STEP 0: Cleaning and Building Contracts"

    print_info "Running forge clean to remove cached artifacts..."
    forge clean
    print_success "Build cache cleared!"

    print_info "Building contracts with fresh source..."
    forge build
    print_success "Contracts built successfully!"

    echo ""
    sleep 2
else
    print_warning "Skipping forge clean (using cached build)"
    print_info "Building contracts..."
    forge build
    echo ""
fi

# Create deployments directory
mkdir -p deployments

# Function to deploy with verification
deploy_with_verify() {
    local script=$1
    local rpc=$2
    local chain_name=$3

    if [ "$VERIFY_CONTRACTS" = true ]; then
        forge script "$script" --rpc-url "$rpc" --broadcast --verify -vvv
    else
        forge script "$script" --rpc-url "$rpc" --broadcast -vvv
    fi
}

# ========== STEP 1: Deploy on Sepolia ==========
if [ "$DEPLOY_SEPOLIA" = true ]; then
    print_step "STEP 1: Deploying on Sepolia (Destination Chain)"

    print_info "This will deploy:"
    echo "  - Mock USDC"
    echo "  - VaultEVVM (with EVVM integration)"
    echo "  - YieldFlowOFTEVVM"
    echo ""

    if deploy_with_verify "script/DeployAll.s.sol:DeployAll" "sepolia" "Sepolia"; then
        print_success "Sepolia deployment complete!"

        # Read deployed addresses
        if [ -f deployments/sepolia-complete.json ]; then
            SEPOLIA_OFT=$(cat deployments/sepolia-complete.json | grep -o '"oft": "[^"]*"' | cut -d'"' -f4)
            SEPOLIA_VAULT=$(cat deployments/sepolia-complete.json | grep -o '"vault": "[^"]*"' | cut -d'"' -f4)
            SEPOLIA_USDC=$(cat deployments/sepolia-complete.json | grep -o '"usdc": "[^"]*"' | cut -d'"' -f4)

            print_success "Deployed contracts:"
            echo "  MockERC20 (USDC): $SEPOLIA_USDC"
            echo "  VaultEVVM: $SEPOLIA_VAULT"
            echo "  YieldFlowOFTEVVM: $SEPOLIA_OFT"
        fi
    else
        print_error "Sepolia deployment failed!"
        exit 1
    fi

    echo ""
    sleep 3
else
    print_warning "Skipping Sepolia deployment"
    echo ""
fi

# ========== STEP 2: Deploy on Arbitrum Sepolia ==========
if [ "$DEPLOY_ARBITRUM" = true ]; then
    print_step "STEP 2: Deploying on Arbitrum Sepolia (Source Chain)"

    print_info "This will deploy:"
    echo "  - Mock USDC"
    echo "  - YieldFlowOFTEVVM"
    echo ""

    if deploy_with_verify "script/DeployYieldFlowOFTEVVM.s.sol:DeployYieldFlowOFTEVVM" "arbitrum-sepolia" "Arbitrum Sepolia"; then
        print_success "Arbitrum Sepolia deployment complete!"

        # Read deployed addresses
        if [ -f deployments/oft-arbitrum-sepolia.json ]; then
            ARBITRUM_OFT=$(cat deployments/oft-arbitrum-sepolia.json | grep -o '"oft": "[^"]*"' | cut -d'"' -f4)
            ARBITRUM_USDC=$(cat deployments/oft-arbitrum-sepolia.json | grep -o '"usdc": "[^"]*"' | cut -d'"' -f4)

            print_success "Deployed contracts:"
            echo "  MockERC20 (USDC): $ARBITRUM_USDC"
            echo "  YieldFlowOFTEVVM: $ARBITRUM_OFT"
        fi
    else
        print_error "Arbitrum Sepolia deployment failed!"
        exit 1
    fi

    echo ""
    sleep 3
else
    print_warning "Skipping Arbitrum Sepolia deployment"
    echo ""
fi

# ========== STEP 3: Deploy on Base Sepolia (Optional) ==========
if [ "$DEPLOY_BASE" = true ]; then
    print_step "STEP 3: Deploying on Base Sepolia (Source Chain)"

    print_info "This will deploy:"
    echo "  - Mock USDC"
    echo "  - YieldFlowOFTEVVM"
    echo ""

    if deploy_with_verify "script/DeployYieldFlowOFTEVVM.s.sol:DeployYieldFlowOFTEVVM" "base-sepolia" "Base Sepolia"; then
        print_success "Base Sepolia deployment complete!"

        # Read deployed addresses
        if [ -f deployments/oft-base-sepolia.json ]; then
            BASE_OFT=$(cat deployments/oft-base-sepolia.json | grep -o '"oft": "[^"]*"' | cut -d'"' -f4)
            BASE_USDC=$(cat deployments/oft-base-sepolia.json | grep -o '"usdc": "[^"]*"' | cut -d'"' -f4)

            print_success "Deployed contracts:"
            echo "  MockERC20 (USDC): $BASE_USDC"
            echo "  YieldFlowOFTEVVM: $BASE_OFT"
        fi
    else
        print_error "Base Sepolia deployment failed!"
        exit 1
    fi

    echo ""
    sleep 3
else
    print_warning "Skipping Base Sepolia deployment"
    echo ""
fi

# ========== STEP 4: Configure LayerZero Peers ==========
if [ "$CONFIGURE_PEERS" = true ]; then
    print_step "STEP 4: Configuring LayerZero Peers"

    print_info "This will configure bidirectional peer connections"
    echo ""

    # Configure from Arbitrum to Sepolia
    if [ "$DEPLOY_ARBITRUM" = true ] && [ "$DEPLOY_SEPOLIA" = true ]; then
        print_info "Configuring Arbitrum Sepolia -> Sepolia"
        if forge script script/ConfigurePeersAuto.s.sol:ConfigurePeersAuto --rpc-url arbitrum-sepolia --broadcast -vv; then
            print_success "Arbitrum -> Sepolia peer configured!"
        else
            print_error "Failed to configure Arbitrum -> Sepolia peer"
            exit 1
        fi
        echo ""
        sleep 2
    fi

    # Configure from Sepolia to Arbitrum
    if [ "$DEPLOY_SEPOLIA" = true ] && [ "$DEPLOY_ARBITRUM" = true ]; then
        print_info "Configuring Sepolia -> Arbitrum Sepolia"
        if forge script script/ConfigurePeersAuto.s.sol:ConfigurePeersAuto --rpc-url sepolia --broadcast -vv; then
            print_success "Sepolia -> Arbitrum peer configured!"
        else
            print_error "Failed to configure Sepolia -> Arbitrum peer"
            exit 1
        fi
        echo ""
        sleep 2
    fi

    # Configure from Base to Sepolia (if Base was deployed)
    if [ "$DEPLOY_BASE" = true ] && [ "$DEPLOY_SEPOLIA" = true ]; then
        print_info "Configuring Base Sepolia -> Sepolia"
        if forge script script/ConfigurePeersAuto.s.sol:ConfigurePeersAuto --rpc-url base-sepolia --broadcast -vv; then
            print_success "Base -> Sepolia peer configured!"
        else
            print_error "Failed to configure Base -> Sepolia peer"
            exit 1
        fi
        echo ""
    fi

    print_success "All LayerZero peers configured!"
else
    print_warning "Skipping LayerZero peer configuration"
fi

# ========== STEP 5: Update Frontend ==========
if [ "$UPDATE_FRONTEND" = true ]; then
    print_step "STEP 5: Updating Frontend Configuration"

    print_info "Running 'make frontend-setup' from project root..."
    cd ..

    if make frontend-setup; then
        print_success "Frontend configuration updated!"
        print_info "ABIs copied to frontend/src/lib/abis/"
        print_info "Contract addresses updated in:"
        echo "  - frontend/src/lib/contracts.ts"
        echo "  - frontend/src/app/api/executor/route.ts"
    else
        print_error "Frontend update failed!"
        print_warning "You may need to run 'make frontend-setup' manually"
    fi

    cd blockchain
    echo ""
else
    print_warning "Skipping automatic frontend update"
    print_info "Remember to run 'make frontend-setup' manually!"
    echo ""
fi

# ========== STEP 6: Deployment Summary ==========
print_step "Deployment Complete!"
echo ""
print_success "All deployments and configurations successful!"
echo ""
echo "Deployment Summary:"
echo "==================="

if [ "$DEPLOY_SEPOLIA" = true ] && [ -f deployments/sepolia-complete.json ]; then
    echo ""
    echo "Sepolia (Destination Chain):"
    echo "  - MockERC20 (USDC): $SEPOLIA_USDC"
    echo "  - VaultEVVM: $SEPOLIA_VAULT"
    echo "  - YieldFlowOFTEVVM: $SEPOLIA_OFT"
    echo "  - Etherscan: https://sepolia.etherscan.io/address/$SEPOLIA_OFT"
fi

if [ "$DEPLOY_ARBITRUM" = true ] && [ -f deployments/oft-arbitrum-sepolia.json ]; then
    echo ""
    echo "Arbitrum Sepolia (Source Chain):"
    echo "  - MockERC20 (USDC): $ARBITRUM_USDC"
    echo "  - YieldFlowOFTEVVM: $ARBITRUM_OFT"
    echo "  - Arbiscan: https://sepolia.arbiscan.io/address/$ARBITRUM_OFT"
fi

if [ "$DEPLOY_BASE" = true ] && [ -f deployments/oft-base-sepolia.json ]; then
    echo ""
    echo "Base Sepolia (Source Chain):"
    echo "  - MockERC20 (USDC): $BASE_USDC"
    echo "  - YieldFlowOFTEVVM: $BASE_OFT"
    echo "  - Basescan: https://sepolia.basescan.org/address/$BASE_OFT"
fi

echo ""
echo "Next Steps:"
echo "==========="
if [ "$UPDATE_FRONTEND" = true ]; then
    echo "✅ Frontend is ready to use!"
    echo "   1. cd ../frontend"
    echo "   2. npm run dev"
    echo "   3. Test gasless deposits"
else
    echo "1. Update frontend: cd .. && make frontend-setup"
    echo "2. Start frontend: cd frontend && npm run dev"
    echo "3. Test gasless deposits"
fi
echo "4. Test cross-chain bridging from source chains to Sepolia"
echo "5. Create demo video for hackathon submission"
echo ""
print_success "Happy hacking! 🚀"
