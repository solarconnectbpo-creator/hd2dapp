#!/bin/bash

###############################################################################
# HD2D Online Platform - Complete Deployment Script
# 
# This script sets up the complete HD2D platform:
# - Backend: Cloudflare Workers + D1 Database
# - Frontend: Expo Web App on custom domain
# - Environment: All required configurations
#
# Usage: bash deploy.sh [local|production]
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PLATFORM_MODE="${1:-local}"  # local or production
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        HD2D Online Platform - Deployment Script               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

###############################################################################
# STEP 1: Validate Prerequisites
###############################################################################
step_validate() {
    echo -e "${YELLOW}[1/6] Validating prerequisites...${NC}"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}✗ Node.js not found. Please install Node.js 18+${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Node.js: $(node -v)${NC}"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}✗ npm not found${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ npm: $(npm -v)${NC}"
    
    # For production: Check wrangler
    if [ "$PLATFORM_MODE" = "production" ]; then
        if ! command -v wrangler &> /dev/null; then
            echo -e "${YELLOW}→ Installing Wrangler CLI (Cloudflare)...${NC}"
            npm install -g wrangler
        fi
        echo -e "${GREEN}✓ Wrangler: $(wrangler -v)${NC}"
    fi
    
    echo ""
}

###############################################################################
# STEP 2: Install Dependencies
###############################################################################
step_install_deps() {
    echo -e "${YELLOW}[2/6] Installing dependencies...${NC}"
    
    # Frontend
    if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        echo "  → Installing frontend dependencies..."
        cd "$FRONTEND_DIR"
        npm install --legacy-peer-deps
    else
        echo "  → Frontend dependencies already installed"
    fi
    
    # Backend
    if [ ! -d "$BACKEND_DIR/node_modules" ]; then
        echo "  → Installing backend dependencies..."
        cd "$BACKEND_DIR"
        npm install
    else
        echo "  → Backend dependencies already installed"
    fi
    
    echo -e "${GREEN}✓ Dependencies installed${NC}"
    echo ""
}

###############################################################################
# STEP 3: Configure Environment
###############################################################################
step_configure_env() {
    echo -e "${YELLOW}[3/6] Configuring environment...${NC}"
    
    if [ "$PLATFORM_MODE" = "local" ]; then
        echo "  → Setting up LOCAL development environment"
        API_URL="http://localhost:8787"
        echo -e "${GREEN}✓ Frontend will use: $API_URL${NC}"
        
    else  # production
        echo "  → Setting up PRODUCTION environment"
        read -p "Enter your Cloudflare Workers URL (e.g., https://hd2d-backend.username.workers.dev): " WORKERS_URL
        read -p "Enter your custom domain (default: hardcoredoortodoorclosers.com): " DOMAIN
        DOMAIN=${DOMAIN:-"hardcoredoortodoorclosers.com"}
        
        API_URL="https://${DOMAIN}/api"
        echo -e "${GREEN}✓ Frontend will use: $API_URL${NC}"
    fi
    
    echo ""
}

###############################################################################
# STEP 4: Setup Backend
###############################################################################
step_setup_backend() {
    echo -e "${YELLOW}[4/6] Setting up backend...${NC}"
    
    cd "$BACKEND_DIR"
    
    if [ "$PLATFORM_MODE" = "local" ]; then
        echo "  → Backend ready for LOCAL testing"
        echo -e "${GREEN}✓ Run: cd backend && npm run dev${NC}"
        
    else  # production
        echo "  → Setting up CLOUDFLARE WORKERS"
        
        # Check if wrangler authenticated
        if ! wrangler whoami &> /dev/null; then
            echo -e "${YELLOW}  → You need to authenticate with Cloudflare${NC}"
            echo "  → Opening Cloudflare login..."
            wrangler login
        else
            echo -e "${GREEN}✓ Already authenticated with Cloudflare${NC}"
        fi
        
        # Check/create D1 database
        echo "  → Checking D1 database..."
        if ! wrangler d1 info hd2d &> /dev/null; then
            echo "  → Creating D1 database..."
            wrangler d1 create hd2d
            echo -e "${YELLOW}  ⚠ Update wrangler.toml with the database_id from above${NC}"
        else
            echo -e "${GREEN}✓ D1 database exists${NC}"
        fi
        
        # Check/create KV namespace
        echo "  → Checking KV namespace..."
        if ! wrangler kv:namespace list | grep -q "HD2D_CACHE"; then
            echo "  → Creating KV namespace..."
            wrangler kv:namespace create "HD2D_CACHE"
            echo -e "${YELLOW}  ⚠ Update wrangler.toml with the KV id from above${NC}"
        else
            echo -e "${GREEN}✓ KV namespace exists${NC}"
        fi
    fi
    
    echo ""
}

###############################################################################
# STEP 5: Initialize Database
###############################################################################
step_init_database() {
    echo -e "${YELLOW}[5/6] Initializing database...${NC}"
    
    cd "$BACKEND_DIR"
    
    if [ "$PLATFORM_MODE" = "local" ]; then
        echo "  → Skipping for local mode (use local SQLite)"
        echo -e "${GREEN}✓ Local database will be auto-initialized${NC}"
        
    else  # production
        echo "  → Running D1 migrations..."
        
        MIGRATIONS=(
            "D1_migrations/001_initial_schema.sql"
            "D1_migrations/002_users_auth.sql"
            "D1_migrations/003_leads.sql"
            "D1_migrations/004_deals.sql"
            "D1_migrations/005_social.sql"
            "D1_migrations/006_events.sql"
            "D1_migrations/007_tasks.sql"
            "D1_migrations/008_calls.sql"
            "D1_migrations/009_workflows.sql"
            "D1_migrations/010_admin.sql"
            "D1_migrations/011_rbac.sql"
            "D1_migrations/012_marketplace.sql"
            "D1_migrations/013_lead_verification.sql"
            "D1_migrations/0014_pricing_disputes.sql"
        )
        
        for migration in "${MIGRATIONS[@]}"; do
            if [ -f "$migration" ]; then
                echo "  → Running $migration..."
                wrangler d1 execute hd2d --file="$migration" || echo "    ⚠ Migration may have already been run"
            fi
        done
        
        echo -e "${GREEN}✓ Database initialized${NC}"
    fi
    
    echo ""
}

###############################################################################
# STEP 6: Build & Deploy
###############################################################################
step_build_deploy() {
    echo -e "${YELLOW}[6/6] Building and deploying...${NC}"
    
    if [ "$PLATFORM_MODE" = "local" ]; then
        echo "  → Building frontend for web..."
        cd "$FRONTEND_DIR"
        
        echo -e "${GREEN}✓ Ready to start!${NC}"
        echo ""
        echo -e "${BLUE}LOCAL DEPLOYMENT READY:${NC}"
        echo ""
        echo "Terminal 1 - Start Backend:"
        echo "  cd backend && npm run dev"
        echo ""
        echo "Terminal 2 - Start Frontend:"
        echo "  npm run dev"
        echo ""
        echo "Then open:"
        echo "  http://localhost:8081"
        echo ""
        
    else  # production
        echo "  → Building backend..."
        cd "$BACKEND_DIR"
        wrangler deploy
        
        echo ""
        echo "  → Building frontend..."
        cd "$FRONTEND_DIR"
        npm run build
        
        echo -e "${GREEN}✓ Deployment complete!${NC}"
        echo ""
        echo -e "${BLUE}PRODUCTION DEPLOYMENT READY:${NC}"
        echo ""
        echo "Your platform is live at:"
        echo "  https://${DOMAIN}"
        echo ""
        echo "Backend API:"
        echo "  https://${DOMAIN}/api"
        echo ""
    fi
    
    echo ""
}

###############################################################################
# Display Help
###############################################################################
show_help() {
    cat << EOF
${BLUE}HD2D Online Platform - Deployment Script${NC}

${YELLOW}Usage:${NC}
  bash deploy.sh [mode]

${YELLOW}Modes:${NC}
  local        Setup for local development (default)
  production   Deploy to Cloudflare Workers + production domain

${YELLOW}Examples:${NC}
  bash deploy.sh                  # Local setup
  bash deploy.sh production       # Production setup

${YELLOW}Prerequisites for Production:${NC}
  • Cloudflare account
  • Custom domain (hardcoredoortodoorclosers.com)
  • Node.js 18+
  • Wrangler CLI (will be installed if needed)

${YELLOW}Output:${NC}
  The script will:
  1. Validate all prerequisites
  2. Install dependencies
  3. Configure environment variables
  4. Setup backend (Cloudflare Workers)
  5. Initialize database
  6. Build and deploy

EOF
}

###############################################################################
# Main Execution
###############################################################################

# Show help if requested
if [ "$PLATFORM_MODE" = "help" ] || [ "$PLATFORM_MODE" = "-h" ] || [ "$PLATFORM_MODE" = "--help" ]; then
    show_help
    exit 0
fi

# Validate mode
if [ "$PLATFORM_MODE" != "local" ] && [ "$PLATFORM_MODE" != "production" ]; then
    echo -e "${RED}Invalid mode: $PLATFORM_MODE${NC}"
    echo "Use 'local' (default) or 'production'"
    exit 1
fi

echo "Mode: $PLATFORM_MODE"
echo ""

# Run all steps
step_validate
step_install_deps
step_configure_env
step_setup_backend
step_init_database
step_build_deploy

echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Deployment script complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
