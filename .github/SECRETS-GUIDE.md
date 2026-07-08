# Secrets to configure in GitHub Settings > Secrets and Variables > Actions

## Required Secrets for Backend (Railway)

### RAILWAY_TOKEN
# Get from: https://railway.app/account
# Used for: Authenticating with Railway CLI for deployments

## Required Secrets for Frontend (Vercel)

### VERCEL_TOKEN
# Get from: https://vercel.com/account/tokens
# Used for: Authenticating with Vercel for deployments

### VERCEL_ORG_ID
# Get from: Run `vercel teams ls` or check project settings
# Used for: Identifying your Vercel organization

### VERCEL_PROJECT_ID_STAGING
# Get from: Vercel project settings > General > Project ID (for staging project)
# Used for: Deploying to staging environment

### VERCEL_PROJECT_ID_PROD
# Get from: Vercel project settings > General > Project ID (for production project)
# Used for: Deploying to production environment

## Optional: Additional Secrets (for docker-compose.yml on Railway)

### DB_PASSWORD
# PostgreSQL password - set in Railway project variables

### DB_HOST
# PostgreSQL host - provided by Railway PostgreSQL plugin

### REDIS_HOST
# Redis host - provided by Railway Redis plugin

### REDIS_PASSWORD
# Redis password - set in Railway project variables

### KAFKA_HOST
# Kafka host - for message queue (if using hosted Kafka)

### PASETO_SECRET_KEY
# Security key for JWT tokens - generate a secure 32-byte key
# Generate with: openssl rand -base64 32
