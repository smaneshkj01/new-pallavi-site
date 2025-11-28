# Cloudflare Workers Deployment Guide

This guide will help you deploy the Cloudflare Workers for your New Pallavi Boat Club website.

## Prerequisites

1. **Cloudflare Account** - Sign up at [cloudflare.com](https://cloudflare.com) if you don't have one
2. **Node.js** - Install from [nodejs.org](https://nodejs.org) (version 16 or higher)
3. **Wrangler CLI** - Cloudflare's command-line tool for Workers

## Step 1: Install Wrangler

Open your terminal and run:

```bash
npm install -g wrangler
```

Verify installation:

```bash
wrangler --version
```

## Step 2: Login to Cloudflare

```bash
wrangler login
```

This will open a browser window for you to authorize Wrangler with your Cloudflare account.

## Step 3: Create KV Namespace

The Content API worker needs a KV namespace to store website content.

```bash
wrangler kv:namespace create "CONTENT_STORE"
```

This will output something like:

```
Created namespace with ID: abc123def456
```

**Copy this ID** - you'll need it in the next step.

## Step 4: Create R2 Bucket (Optional - for image uploads)

If you want image upload functionality:

```bash
wrangler r2 bucket create boatclub-images
```

## Step 5: Configure Workers

### For Content API Worker:

1. Open `workers/wrangler.toml`
2. Replace `YOUR_KV_NAMESPACE_ID` with the ID from Step 3
3. Update the `name` if you want a different worker name

### For R2 Uploader Worker:

1. Open `workers/wrangler-r2.toml`
2. Verify the `bucket_name` matches what you created in Step 4
3. Update the `name` if you want a different worker name

## Step 6: Deploy Content API Worker

Navigate to the workers directory:

```bash
cd workers
```

Deploy the content API worker:

```bash
wrangler deploy --config wrangler.toml
```

You should see output like:

```
Published boatclub-content-api (X.XX sec)
  https://boatclub-content-api.YOUR-SUBDOMAIN.workers.dev
```

**Copy this URL** - this is your new API endpoint!

## Step 7: Deploy R2 Uploader Worker (Optional)

If you want image upload functionality:

```bash
wrangler deploy --config wrangler-r2.toml
```

You should see:

```
Published boatclub-r2-uploader (X.XX sec)
  https://boatclub-r2-uploader.YOUR-SUBDOMAIN.workers.dev
```

## Step 8: Update Your Website

Now you need to update `index.html` to use your new worker URLs.

1. Open `index.html`
2. Find these lines (around line 362-363):

```javascript
const WORKER_API = "https://boatclub-content-api.smanesh-kj.workers.dev";
const R2_WORKER_URL = "https://boatclub-r2-uploader.smanesh-kj.workers.dev/";
```

3. Replace with YOUR worker URLs from Steps 6 and 7

## Step 9: Test Your Workers

### Test Content API:

```bash
curl https://YOUR-CONTENT-API-URL.workers.dev/content
```

Should return `{}` (empty object) if no content is stored yet.

### Test Save Functionality:

```bash
curl -X POST https://YOUR-CONTENT-API-URL.workers.dev/content/update \
  -H "Content-Type: application/json" \
  -d '{"section":"team","data":{"title":"Test","team":[]}}'
```

Should return:

```json
{"success":true,"message":"Section 'team' updated successfully"}
```

## Step 10: Initialize Default Content (Optional)

You can pre-populate your KV store with default content using the Cloudflare dashboard:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages** → **KV**
3. Click on your `CONTENT_STORE` namespace
4. Add keys manually:
   - Key: `team`
   - Value: Your team data as JSON

Or use the website's "Reset to Defaults" feature in the admin panel.

## Troubleshooting

### Worker not deploying?

- Make sure you're logged in: `wrangler whoami`
- Check your `wrangler.toml` configuration
- Ensure KV namespace ID is correct

### CORS errors in browser?

- The workers include CORS headers by default
- If still having issues, check the browser console for specific errors

### Images not uploading?

- Verify R2 bucket exists: `wrangler r2 bucket list`
- Check the R2 worker logs: `wrangler tail boatclub-r2-uploader`
- Update the public URL in `r2-uploader-worker.js` (line 91) with your R2 bucket's public domain

### Content not saving?

- Check worker logs: `wrangler tail boatclub-content-api`
- Verify KV namespace binding in `wrangler.toml`
- Test the endpoint directly with curl (see Step 9)

## Next Steps

After deployment:

1. ✅ Update `index.html` with your new worker URLs
2. ✅ Commit and push changes to GitHub
3. ✅ Test the admin panel on your live website
4. ✅ Make a test edit and verify it persists after refresh

## Optional: Secure the Content API with an admin token

For production you should require an admin token for update requests rather than relying on client-side credentials.

1. Choose a strong token (e.g. a random 32+ character string).
2. Set the token as a secret/environment binding for the Content API Worker.

Using Wrangler (recommended):

```bash
wrangler secret put ADMIN_TOKEN
```

Or set the `ADMIN_TOKEN` environment variable in the Cloudflare dashboard for the worker.

When `ADMIN_TOKEN` is set the worker will reject POST `/content/update` requests that do not include the matching token in either the `x-admin-token` request header or the `Authorization: Bearer <token>` header.

On the front-end you can provide the token via a short-lived client input (the project includes a settings panel token input which stores the token in `sessionStorage` for the session). For production, prefer server-side flows that avoid shipping the token to browsers.

## Speed & CDN notes (serve images fast)

To serve uploaded images quickly from R2 and a CDN, follow these recommendations:

- Use a CDN or custom domain in front of the R2 bucket (Fastly, Cloudflare CDN, AWS CloudFront, etc). Configure the CDN to cache static assets aggressively.
- Set the worker environment variable `R2_PUBLIC_URL` to the public base URL the CDN exposes (for example `https://cdn.example.com`). The R2 uploader worker will return URLs using that base.
- When uploading images, the R2 worker sets `Cache-Control: public, max-age=31536000, immutable` so CDNs and browsers can cache long-lived assets.
- Optionally, use an image resizing/optimization layer (Cloudflare Image Resizing, Fastly Image Optimizer, or an image CDN) to serve WebP/AVIF and scaled sizes. If you expose an image CDN domain as `R2_PUBLIC_URL`, configure the CDN to pull from R2 as the origin.

Quick steps to enable a CDN with R2:

1. Create a CDN distribution (Fastly/Cloudflare/CloudFront) and point the origin to your R2 bucket's public domain or to a Worker that proxies R2.
2. Configure the CDN to cache based on URL and honor origin Cache-Control headers.
3. Set `R2_PUBLIC_URL` in the uploader worker to your CDN domain and deploy.
4. Use the uploader UI in the site to upload images — the returned URL will be the CDN URL and will be cached at the CDN edge.

For Cloudflare specifically, consider Cloudflare Images or a Worker that resizes images on-the-fly and sets optimal caching headers.

## Support

If you encounter any issues:

1. Check worker logs: `wrangler tail WORKER-NAME`
2. Verify KV/R2 bindings in Cloudflare dashboard
3. Test endpoints directly with curl
4. Check browser console for client-side errors

---

**Congratulations!** Your Cloudflare Workers are now deployed and ready to use! 🎉
