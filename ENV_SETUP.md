# Environment Variables Setup Guide

## Quick Setup

1. **Copy the example environment file:**
   ```bash
   cd durusuna-backend
   cp env.example .env
   ```

2. **Update Sevalla credentials in `.env`:**
   - Open your Sevalla dashboard
   - Copy your Access Key and Secret Key
   - Replace `your_sevalla_access_key_here` and `your_sevalla_secret_key_here` in the `.env` file

3. **Test your setup:**
   ```bash
   npm run test:sevalla
   ```

## What's Included

The `env.example` file contains:
- ✅ **Ready-to-use defaults** for local development (database, Redis, etc.)
- ⚠️ **Placeholder values** for Sevalla storage credentials (you must update these)
- 📝 **Comments** explaining each section

## For Production

⚠️ **Security Notes:**
- Never commit your `.env` file to version control
- Generate strong JWT secrets: `openssl rand -base64 64`
- Use strong, unique passwords for all services
- Rotate secrets regularly 