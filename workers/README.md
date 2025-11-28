# Cloudflare Workers

This directory contains the Cloudflare Workers for the New Pallavi Boat Club website.

## Workers

### 1. Content API Worker (`content-api-worker.js`)
Handles website content storage and retrieval using Cloudflare KV.

**Endpoints:**
- `GET /content` - Retrieve all content
- `POST /content/update` - Update a specific section

### 2. R2 Uploader Worker (`r2-uploader-worker.js`)
Handles image uploads to Cloudflare R2 storage.

**Endpoints:**
- `POST /upload` - Upload an image

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## Quick Start

```bash
# Install Wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create KV namespace
wrangler kv:namespace create "CONTENT_STORE"

# Deploy Content API
cd workers
wrangler deploy --config wrangler.toml

# Deploy R2 Uploader (optional)
wrangler deploy --config wrangler-r2.toml
```

## Configuration

- `wrangler.toml` - Configuration for Content API worker
- `wrangler-r2.toml` - Configuration for R2 Uploader worker

Make sure to update the KV namespace ID and R2 bucket name in these files before deploying.
