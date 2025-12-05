#!/bin/bash

###############################################################################
# HD2D - Quick Cloudflare D1 Setup Script
# Automates database creation and migration deployment
###############################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     HD2D - Cloudflare D1 Quick Setup                           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Check authentication
echo -e "${YELLOW}[1/5] Checking Cloudflare authentication...${NC}"
if ! wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}→ Not authenticated. Opening Cloudflare login...${NC}"
    wrangler login
fi
echo -e "${GREEN}✓ Authenticated${NC}"
echo ""

# Step 2: Create D1 Database
echo -e "${YELLOW}[2/5] Creating D1 database...${NC}"
if ! wrangler d1 info hd2d &> /dev/null 2>&1; then
    echo -e "${YELLOW}→ Creating new database 'hd2d'...${NC}"
    DB_OUTPUT=$(wrangler d1 create hd2d 2>&1)
    DB_ID=$(echo "$DB_OUTPUT" | grep "database_id" | awk -F'"' '{print $2}' | head -1)
    
    if [ -z "$DB_ID" ]; then
        echo -e "${RED}✗ Failed to create database${NC}"
        echo "$DB_OUTPUT"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Database created${NC}"
    echo -e "${YELLOW}→ Database ID: $DB_ID${NC}"
    echo -e "${YELLOW}→ Add this to backend/wrangler.toml:${NC}"
    echo ""
    echo "[[d1_databases]]"
    echo "binding = \"DB\""
    echo "database_name = \"hd2d\""
    echo "database_id = \"$DB_ID\""
    echo ""
else
    echo -e "${GREEN}✓ Database 'hd2d' already exists${NC}"
fi
echo ""

# Step 3: Create KV Namespace
echo -e "${YELLOW}[3/5] Creating KV namespace...${NC}"
if ! wrangler kv:namespace list 2>/dev/null | grep -q "HD2D_CACHE"; then
    echo -e "${YELLOW}→ Creating KV namespace 'HD2D_CACHE'...${NC}"
    KV_OUTPUT=$(wrangler kv:namespace create "HD2D_CACHE" 2>&1)
    KV_ID=$(echo "$KV_OUTPUT" | grep "id =" | awk -F'"' '{print $2}' | head -1)
    
    if [ -z "$KV_ID" ]; then
        echo -e "${RED}✗ Failed to create KV namespace${NC}"
        echo "$KV_OUTPUT"
        exit 1
    fi
    
    echo -e "${GREEN}✓ KV namespace created${NC}"
    echo -e "${YELLOW}→ KV ID: $KV_ID${NC}"
    echo -e "${YELLOW}→ Add this to backend/wrangler.toml:${NC}"
    echo ""
    echo "[[kv_namespaces]]"
    echo "binding = \"HD2D_CACHE\""
    echo "id = \"$KV_ID\""
    echo ""
else
    echo -e "${GREEN}✓ KV namespace 'HD2D_CACHE' already exists${NC}"
fi
echo ""

# Step 4: Run Migrations
echo -e "${YELLOW}[4/5] Running database migrations...${NC}"
cd backend

if [ -f "../D1_ALL_MIGRATIONS.sql" ]; then
    echo -e "${YELLOW}→ Using consolidated migrations file...${NC}"
    wrangler d1 execute hd2d --file=../D1_ALL_MIGRATIONS.sql
else
    echo -e "${YELLOW}→ Running individual migrations...${NC}"
    for migration in D1_migrations/00*.sql; do
        echo "  → Running $(basename $migration)..."
        wrangler d1 execute hd2d --file="$migration" || true
    done
fi

echo -e "${GREEN}✓ Migrations completed${NC}"
echo ""

# Step 5: Verify
echo -e "${YELLOW}[5/5] Verifying setup...${NC}"
TABLE_COUNT=$(wrangler d1 shell hd2d <<EOF
SELECT COUNT(*) as table_count FROM sqlite_master WHERE type='table';
EOF
)

echo -e "${GREEN}✓ Database setup complete!${NC}"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Setup Complete!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Next steps:"
echo "1. Update backend/wrangler.toml with database_id and KV id (if shown above)"
echo "2. Deploy: cd backend && wrangler deploy"
echo "3. Set environment variable: EXPO_PUBLIC_API_URL=<your-workers-url>"
echo ""
echo "Connect custom domain at: https://dash.cloudflare.com"
echo ""
