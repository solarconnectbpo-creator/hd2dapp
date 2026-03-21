#!/bin/bash

###############################################################################
# HD2D Platform - Docker Deployment Script
# 
# Deploys the entire platform using Docker and Docker Compose
# Suitable for VMs, servers, or cloud instances
###############################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        HD2D Platform - Docker Deployment                       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker not installed. Install from: https://docs.docker.com/get-docker/${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Docker Compose not installed. Install from: https://docs.docker.com/compose/install/${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker $(docker -v | awk '{print $3}')${NC}"
echo -e "${GREEN}✓ Docker Compose $(docker-compose -v | awk '{print $3}')${NC}"
echo ""

# Configuration
read -p "Enter deployment mode (local/production) [local]: " MODE
MODE=${MODE:-local}

read -p "Enter app domain (default: localhost): " DOMAIN
DOMAIN=${DOMAIN:-localhost}

read -p "Enter OpenAI API key (or press Enter to use development key): " OPENAI_KEY
OPENAI_KEY=${OPENAI_KEY:-sk-dev}

echo ""
echo -e "${YELLOW}Deploying...${NC}"
echo ""

# Set environment variables
export OPENAI_API_KEY=$OPENAI_KEY
export APP_DOMAIN=$DOMAIN
export DEPLOYMENT_MODE=$MODE

# Create directories
mkdir -p certs logs data

# Build images
echo "Building Docker images..."
docker-compose build

# Start services
echo "Starting services..."
if [ "$MODE" = "production" ]; then
    docker-compose --profile production up -d
else
    docker-compose up -d
fi

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 5

# Check health
echo ""
echo -e "${YELLOW}Checking service health...${NC}"

if docker ps | grep -q "backend"; then
    echo -e "${GREEN}✓ Backend is running${NC}"
else
    echo -e "${RED}✗ Backend failed to start${NC}"
    docker-compose logs backend
    exit 1
fi

if docker ps | grep -q "frontend"; then
    echo -e "${GREEN}✓ Frontend is running${NC}"
else
    echo -e "${RED}✗ Frontend failed to start${NC}"
    docker-compose logs frontend
    exit 1
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Deployment successful!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

echo "Services running:"
echo -e "  Frontend:  ${BLUE}http://$DOMAIN:8081${NC}"
echo -e "  Backend:   ${BLUE}http://$DOMAIN:8787${NC}"
echo ""

echo "Useful commands:"
echo "  View logs:      docker-compose logs -f"
echo "  Stop services:  docker-compose down"
echo "  Restart:        docker-compose restart"
echo "  Shell access:   docker-compose exec backend sh"
echo ""

