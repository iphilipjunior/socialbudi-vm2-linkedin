#!/bin/bash
# deploy.sh - SocialBudi LinkedIn Scraper deployment script

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info() {
  echo -e "${YELLOW}[INFO]${NC} $1"
}

success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

info "Starting deployment of SocialBudi LinkedIn Scraper..."

# Step 1: Pull latest code
info "Pulling latest code from origin main..."
if git pull origin main; then
  success "Git pull completed."
else
  error "Git pull failed."
  exit 1
fi

# Step 2: Install production dependencies
info "Installing production dependencies..."
if npm install --production; then
  success "npm install completed."
else
  error "npm install failed."
  exit 1
fi

# Step 3: Restart PM2 process
info "Restarting PM2 process..."
if pm2 restart socialbudi-linkedin; then
  success "PM2 process restarted."
else
  info "PM2 process not found, starting fresh..."
  if pm2 start ecosystem.config.js; then
    success "PM2 process started."
  else
    error "Failed to start PM2 process."
    exit 1
  fi
fi

# Step 4: Wait for server to be ready
info "Waiting 3 seconds for server to initialize..."
sleep 3

# Step 5: Health check
info "Running health check on http://localhost:3000/health..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)

if [ "$HTTP_STATUS" -eq 200 ]; then
  HEALTH_RESPONSE=$(curl -s http://localhost:3000/health)
  success "Health check passed! (HTTP $HTTP_STATUS)"
  echo "$HEALTH_RESPONSE"
else
  error "Health check failed! (HTTP $HTTP_STATUS)"
  error "Showing PM2 logs:"
  pm2 logs socialbudi-linkedin --lines 20 --nostream
  exit 1
fi

success "Deployment complete!"

# Make this script executable
chmod +x "$0"
