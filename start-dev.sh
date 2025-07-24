#!/bin/bash

# Durusuna Mobile - Development Startup Script
# This script sets up and starts the development environment

set -e

echo "🚀 Starting Durusuna Mobile Development Environment"
echo "================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ docker-compose not found. Please install Docker Compose.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"

# Create backend .env file if it doesn't exist
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}📝 Creating backend/.env from template...${NC}"
    if [ -f "backend/env.example" ]; then
        cp backend/env.example backend/.env
        echo -e "${GREEN}✅ Created backend/.env${NC}"
        echo -e "${YELLOW}⚠️  Please review and update backend/.env with your settings${NC}"
    else
        echo -e "${RED}❌ backend/env.example not found${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ backend/.env already exists${NC}"
fi

# Function to wait for service to be healthy
wait_for_service() {
    local service_name=$1
    local max_attempts=30
    local attempt=1
    
    echo -e "${BLUE}⏳ Waiting for $service_name to be healthy...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose ps $service_name | grep -q "healthy"; then
            echo -e "${GREEN}✅ $service_name is healthy${NC}"
            return 0
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            echo -e "${RED}❌ $service_name failed to become healthy after $max_attempts attempts${NC}"
            return 1
        fi
        
        echo -e "${YELLOW}⏳ Attempt $attempt/$max_attempts - $service_name not ready yet...${NC}"
        sleep 2
        ((attempt++))
    done
}

# Start the services
echo -e "${BLUE}🐳 Starting Docker services...${NC}"
docker-compose up -d

# Wait for core services to be healthy
wait_for_service postgres
wait_for_service redis

# Run database migrations and seeds
echo -e "${BLUE}🗄️  Setting up database...${NC}"
echo -e "${YELLOW}⏳ Running database migrations...${NC}"
docker-compose exec -T backend npm run db:migrate

echo -e "${YELLOW}⏳ Seeding database with initial data...${NC}"
docker-compose exec -T backend npm run db:seed

# Wait for backend to be healthy
wait_for_service backend

# Show service status
echo -e "\n${GREEN}🎉 Development environment is ready!${NC}"
echo -e "${BLUE}📋 Service Status:${NC}"
docker-compose ps

# Show useful URLs
echo -e "\n${BLUE}🌐 Service URLs:${NC}"
echo -e "  • Backend API:     ${GREEN}http://localhost:3001${NC}"
echo -e "  • API Health:      ${GREEN}http://localhost:3001/health${NC}"
echo -e "  • PostgreSQL:      ${GREEN}localhost:5433${NC}"
echo -e "  • Redis:           ${GREEN}localhost:6380${NC}"
echo -e "  • MinIO Console:   ${GREEN}http://localhost:9001${NC}"
echo -e "  • MailHog:         ${GREEN}http://localhost:8025${NC}"
echo -e "  • PgAdmin:         ${GREEN}http://localhost:5050${NC} (use --profile tools)"

# Show credentials
echo -e "\n${BLUE}🔑 Default Credentials:${NC}"
echo -e "  • PostgreSQL:      ${YELLOW}postgres / postgres123${NC}"
echo -e "  • Redis:           ${YELLOW}redis123${NC}"
echo -e "  • MinIO:           ${YELLOW}minioadmin / minioadmin123${NC}"
echo -e "  • PgAdmin:         ${YELLOW}admin@durusuna.local / admin123${NC}"

# Show helpful commands
echo -e "\n${BLUE}💡 Helpful Commands:${NC}"
echo -e "  • View logs:       ${YELLOW}docker-compose logs -f backend${NC}"
echo -e "  • Stop services:   ${YELLOW}docker-compose down${NC}"
echo -e "  • Run tests:       ${YELLOW}docker-compose exec backend npm test${NC}"
echo -e "  • Database shell:  ${YELLOW}docker-compose exec postgres psql -U postgres -d durusuna_dev${NC}"
echo -e "  • Backend shell:   ${YELLOW}docker-compose exec backend sh${NC}"

# Check if we should show logs
read -p "Would you like to view backend logs? (y/N): " show_logs
if [[ $show_logs =~ ^[Yy]$ ]]; then
    echo -e "\n${BLUE}📄 Backend Logs (Press Ctrl+C to stop):${NC}"
    docker-compose logs -f backend
fi

echo -e "\n${GREEN}🚀 Happy coding!${NC}" 