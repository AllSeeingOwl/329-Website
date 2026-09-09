# Fly.io Deployment Prompts for Jules

Use these prompts with Google Jules to prepare and deploy the 329-Website to Fly.io.

**Replace the previous Railway deployment prompts (4.1 and 4.2) with these Fly.io-specific prompts.**

---

## Phase 1: Fly.io Setup & Configuration

### Prompt FLY.1: Prepare Project for Fly.io Deployment

```
Task: Prepare the 329-Website project for deployment to Fly.io.

Context:
- Project: 329-Website (3minsto9 ARG)
- Current setup: Express.js backend (server.ts), Vite frontend, @upstash/redis
- We're migrating from Vercel to Fly.io for better admin panel support
- Fly.io uses Docker for containerization

Create/update the following files:

1. **Dockerfile** (in project root)
   - Use Node.js 20 LTS as base image
   - Multi-stage build: Stage 1 builds TypeScript and Vite, Stage 2 runs production
   - Install dependencies with pnpm
   - Build TypeScript: npm run build:vite (or equivalent)
   - Start command: node dist/server.js
   - Expose port 3000
   - Use .dockerignore to exclude node_modules, .git, etc.

2. **.dockerignore** (in project root)
   - Exclude: node_modules, .git, .github, dist, .env, npm-debug.log, etc.

3. **fly.toml** (Fly.io configuration file)
   - App name: "allseeingowl-329-website" (or your preference)
   - Primary region: iad (US East - adjust if you prefer)
   - Internal port: 3000
   - Define health check endpoint: GET /health
   - Set env variables section for:
     - NODE_ENV = production
     - PORT = 3000
   - Allocate resources: 1 shared-cpu-1x, 256MB RAM (free tier)
   - Auto-start: true
   - Auto-stop: false (always on)

4. **.env.example** (example environment variables)
   - ADMIN_PASSWORD=your-secure-admin-password-here
   - UPSTASH_REDIS_URL=your-redis-url-here
   - NODE_ENV=production
   - PORT=3000
   - (Add any other environment variables your app needs)

5. **Add health check endpoint** to server.ts:
   - GET /health should return { status: "ok" }
   - This helps Fly.io monitor your app
   - Should be accessible without authentication

Requirements:
- Use TypeScript for type safety
- Ensure all production dependencies are in package.json (not devDependencies)
- Verify build process works locally: npm run build:vite
- Docker image should be under 500MB
- No hardcoded secrets or passwords
- Documentation in files explaining each configuration

Please provide:
1. Complete Dockerfile
2. Complete .dockerignore
3. Complete fly.toml configuration
4. Health check endpoint code for server.ts
5. Instructions on how to build and test Docker image locally
```

### Prompt FLY.2: Create Fly.io Deployment Guide

```
Task: Create a comprehensive step-by-step guide for deploying to Fly.io.

Create file: FLY_IO_DEPLOYMENT.md

Sections needed:

1. **Prerequisites**
   - Sign up for free Fly.io account (https://fly.io)
   - Install Fly CLI: brew install flyctl (macOS) or download for other OS
   - Verify installation: flyctl version
   - Have GitHub repo ready (already have this)

2. **Local Testing (Important!)**
   - Build Docker image locally: docker build -t 329-website:latest .
   - Test Docker image: docker run -p 3000:3000 329-website:latest
   - Verify app runs at http://localhost:3000
   - Test health endpoint: curl http://localhost:3000/health
   - Ctrl+C to stop
   - Delete local image: docker rmi 329-website:latest

3. **Initial Fly.io Setup**
   - Login to Fly: flyctl auth login
   - Create app on Fly: flyctl launch --no-deploy
     - App name: allseeingowl-329-website (or your choice)
     - Select primary region: iad (US East) or nearest to you
     - Would you like Fly to modify fly.toml? Yes
     - Would you like to set up PostgreSQL? No (we use Redis)
     - Would you like to set up Redis? No (we use Upstash Redis)
     - Deploy now? No (we'll configure first)

4. **Set Environment Variables**
   - Get Upstash Redis URL:
     - Visit https://console.upstash.com
     - Create Redis database or copy existing connection string
     - Format: redis://default:password@host:port
   - Generate secure admin password (use: openssl rand -base64 32)
   - Set secrets on Fly: flyctl secrets set ADMIN_PASSWORD="your-password"
   - Set secrets on Fly: flyctl secrets set UPSTASH_REDIS_URL="your-redis-url"
   - Verify secrets: flyctl secrets list
   - Note: Secrets are NOT shown, only listed as set

5. **Deploy to Fly.io**
   - Deploy app: flyctl deploy
   - Watch deployment logs in real-time
   - If successful, you'll get app URL
   - If error, check logs: flyctl logs

6. **Verify Deployment**
   - Get app URL: flyctl info
   - Test public site: https://your-app-url.fly.dev
   - Test health endpoint: curl https://your-app-url.fly.dev/health
   - Test admin login: POST to https://your-app-url.fly.dev/api/admin/authenticate
   - Test admin dashboard: Visit https://your-app-url.fly.dev/admin/index.html
   - Test a full workflow: Login → View phases → Export emails

7. **Custom Domain (Optional)**
   - If you have a custom domain:
   - Add DNS records pointing to Fly.io
   - Configure with: flyctl certs create yourdomain.com
   - Wait for certificate to be issued (~1 hour)

8. **Monitoring & Logs**
   - View live logs: flyctl logs
   - View app status: flyctl status
   - Monitor resources: flyctl dashboard open
   - Scale app (if needed): flyctl scale vm shared-cpu-2x (paid option)

9. **Updating Your App**
   - Make code changes locally
   - Commit to GitHub
   - Push to Fly: flyctl deploy
   - Or enable auto-deployment from GitHub (optional)

10. **Rollback (If Something Goes Wrong)**
    - View deployment history: flyctl releases
    - Rollback to previous version: flyctl releases rollback
    - Redeploy previous version if needed

11. **Troubleshooting**
    - App won't start? Check logs: flyctl logs --all
    - Redis connection failing? Verify UPSTASH_REDIS_URL is correct
    - Admin panel returning 403? Check ADMIN_PASSWORD is set
    - Health check failing? Verify /health endpoint in server.ts
    - Memory issues? Check current usage: flyctl status
    - For persistent issues, see Fly.io docs: https://fly.io/docs

12. **Free Tier Limits & Recommendations**
    - 3 shared-cpu-1x VMs (1 core, 256MB RAM each)
    - 3GB RAM total
    - 160GB egress per month
    - Unlimited ingress
    - Your app: 1 small VM with 256MB RAM is sufficient for admin + public site
    - Monitor usage: flyctl dashboard open

Requirements:
- Step-by-step instructions even for beginners
- Include command examples (copy-paste ready)
- Explain what each step does and why
- Include troubleshooting for common issues
- Link to official Fly.io documentation
- Note security best practices (secrets, HTTPS)
- Provide rollback instructions
- Format with clear sections and code blocks

Please provide the complete deployment guide in Markdown format.
```

---

## Phase 2: GitHub Actions Automation (Optional but Recommended)

### Prompt FLY.3: Create GitHub Actions Auto-Deploy Workflow

```
Task: Create a GitHub Actions workflow for automatic deployment to Fly.io on push to main branch.

Create file: .github/workflows/deploy-fly.yml

Workflow should:
1. Trigger on push to main branch (and manual trigger)
2. Build and deploy to Fly.io automatically
3. Run basic health checks after deployment
4. Notify on success or failure

Steps:
1. Checkout code
2. Use official Fly.io GitHub Action: superfly/flyctl-actions@1.3
3. Deploy with: flyctl deploy
4. Wait for deployment to complete
5. Run health check curl to verify deployment
6. On failure, post comment to PR or send notification

Configuration:
- FLY_API_TOKEN: Store in GitHub Secrets (generate from Fly.io account)
- Add to secrets: FLY_API_TOKEN, ADMIN_PASSWORD, UPSTASH_REDIS_URL
- Deploy to app: allseeingowl-329-website (or your app name)

Requirements:
- Use official Fly.io GitHub Action
- Include health check verification
- Add timeout (15 minutes max)
- Include step descriptions (clear what's happening)
- Log output for debugging
- Only deploy on successful tests (if tests exist)
- Conditional: Only run on main branch, not on pull requests

Please provide:
1. Complete GitHub Actions workflow file
2. Instructions on setting up FLY_API_TOKEN in GitHub Secrets
3. How to manually trigger deployment if needed
4. How to disable auto-deploy if needed
```

---

## Phase 3: Verification & Testing

### Prompt FLY.4: Create Fly.io Deployment Verification Script

```
Task: Create a script to verify the deployment is working correctly.

Create file: scripts/verify-fly-deployment.sh

Script should:
1. Take app URL as parameter (e.g., https://allseeingowl-329-website.fly.dev)
2. Check if app is accessible (HTTP 200)
3. Verify health endpoint returns { status: "ok" }
4. Test admin authentication endpoint (POST to /api/admin/authenticate)
5. Test public site loads (check for expected HTML content)
6. Test Redis connection indirectly (check if admin session works)
7. Generate report of all tests
8. Exit with success (0) or failure (1) based on results

Test cases to include:
- [ ] GET / returns 200 and HTML content
- [ ] GET /health returns 200 and { status: "ok" }
- [ ] POST /api/admin/authenticate with wrong password returns 401
- [ ] POST /api/admin/authenticate with correct password returns 200
- [ ] Admin dashboard file exists and loads
- [ ] Email export endpoint is protected (returns 403 without auth)
- [ ] Phase management endpoints are protected

Requirements:
- Use curl for HTTP requests (no dependencies)
- Print clear pass/fail messages
- Show response times
- Handle connection errors gracefully
- Include usage instructions
- Make script executable (#!/bin/bash)
- Optional: Accept admin password as parameter for testing

Please provide:
1. Complete verification script
2. Usage instructions
3. Example output
4. How to run it after deployment
```

---

## Summary: Complete Fly.io Deployment Workflow

**Use these prompts in this order:**

1. **FLY.1** → Create Docker & Fly.io configuration files
2. **FLY.2** → Create deployment guide (comprehensive step-by-step)
3. **FLY.3** → Create GitHub Actions auto-deploy (optional but recommended)
4. **FLY.4** → Create verification script for testing deployments

**Then follow the deployment guide (FLY.2) to deploy your app.**

---

## Quick Reference: Key Differences from Railway

| Feature | Railway (Trial) | Fly.io (Free) |
|---------|-----------------|---------------|
| Free tier duration | Trial only (~7 days) | Unlimited |
| Always-on | ✅ Yes | ✅ Yes |
| Cold starts | None | None |
| RAM allocation | Varies | 256MB (free tier) |
| Monthly egress limit | Unlimited in trial | 160GB |
| Docker support | ✅ Yes | ✅ Yes |
| Redis support | Via add-ons | Via Upstash (free) |
| Scaling | ✅ Paid | ✅ Free (3 VMs) |
| Custom domain | ✅ Yes | ✅ Yes |
| GitHub integration | ✅ Yes | ✅ Yes |

---

## Important Notes for Jules

1. **Docker is required** for Fly.io - it's containerization-based
2. **Health check endpoint** must be added to server.ts before deployment
3. **Test Docker locally first** before deploying to Fly.io
4. **Environment variables** are set via flyctl CLI, not in code
5. **Free tier limitations**: Monitor your app size and traffic
6. **Upstash Redis** is external (not part of Fly.io free tier)
7. **Always deploy from main** - feature branches can be tested locally
8. **HTTPS is automatic** - Fly.io provides free SSL certificates

---

## Files You'll Create/Modify

```
329-Website/
├── Dockerfile                          (NEW)
├── .dockerignore                       (NEW)
├── fly.toml                            (NEW)
├── FLY_IO_DEPLOYMENT.md               (NEW)
├── .env.example                        (UPDATE)
├── .github/
│   └── workflows/
│       └── deploy-fly.yml             (NEW - optional)
├── scripts/
│   └── verify-fly-deployment.sh       (NEW - optional)
└── src/
    └── server.ts                       (MODIFY - add /health endpoint)
```

---

## Testing Checklist Before Final Deployment

- [ ] All previous prompts (1.1-3.2) completed and working
- [ ] Admin authentication working locally
- [ ] Admin dashboard functional locally
- [ ] Email export working
- [ ] Phase management working
- [ ] Docker image builds successfully
- [ ] Docker image runs and app starts on port 3000
- [ ] Health check endpoint works
- [ ] Environment variables set in Fly.io
- [ ] Deployment completes without errors
- [ ] Public site accessible and working
- [ ] Admin login works on deployed version
- [ ] Email export works on deployed version
- [ ] All redirects and links work
