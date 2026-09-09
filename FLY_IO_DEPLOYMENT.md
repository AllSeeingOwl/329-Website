# Comprehensive Fly.io Deployment Guide

This guide provides a step-by-step walkthrough for deploying the 329-Website application (including the Node.js / Express backend, static frontend, retro-terminal admin dashboard, and Upstash Redis connection) to [Fly.io](https://fly.io).

---

## 1. Prerequisites

Before starting, make sure you have the required accounts and software tools installed.

- **Fly.io Account**: Sign up for a free account at [https://fly.io](https://fly.io).
- **Fly CLI (`flyctl`) Installation**:
  - **macOS**: `brew install flyctl`
  - **Linux**: `curl -L https://fly.io/install.sh | sh`
  - **Windows (PowerShell)**: `pwsh -c "iwr https://fly.io/install.ps1 -useb | iex"`
- **Verify Fly CLI Installation**:
  ```bash
  flyctl version
  ```
  _Why_: Ensures that the Fly CLI tool is installed and accessible in your shell environment.
- **GitHub Repository**: Ensure you have local access to the repository code containing the Dockerfile, `fly.toml`, and source code.

---

## 2. Local Testing (Important!)

Testing the Docker container locally ensures that all build steps, environment variables, static file compilation, and server start routines work properly before pushing to Fly.io.

1. **Build the Docker Image Locally**:

   ```bash
   docker build -t 329-website:latest .
   ```

   _Why_: Compiles the TypeScript backend and Vite assets inside a multi-stage Docker build mirroring the production environment.

2. **Run and Test the Docker Container**:

   ```bash
   docker run -p 3000:3000 329-website:latest
   ```

   _Why_: Starts the application container locally on port 3000.

3. **Verify Local Web Application**:
   - Open your browser and navigate to `http://localhost:3000` to confirm the site renders correctly.

4. **Test the Health Check Endpoint**:

   ```bash
   curl http://localhost:3000/health
   ```

   _Expected Output_: `{"status":"ok"}`
   _Why_: Fly.io relies on this endpoint to verify container health before routing live traffic.

5. **Stop and Clean Up Local Container**:
   - Press `Ctrl+C` in your terminal to stop the container.
   - Remove the local docker image:
     ```bash
     docker rmi 329-website:latest
     ```

---

## 3. Initial Fly.io Setup

1. **Log in to Fly.io CLI**:

   ```bash
   flyctl auth login
   ```

   _Why_: Authenticates your command line with your Fly.io account via a browser session.

2. **Launch Application Configuration**:
   Run the `launch` command with `--no-deploy` to initialize the app without triggering an immediate build:
   ```bash
   flyctl launch --no-deploy
   ```
   Follow the interactive prompts:
   - **App Name**: `allseeingowl-329-website` (or select a custom name)
   - **Primary Region**: `iad` (US East - Ashburn, VA) or choose the region closest to your traffic.
   - **Would you like Fly to modify fly.toml?**: Yes (or use the existing `fly.toml` in your repository).
   - **Would you like to set up PostgreSQL?**: No (the application uses Redis).
   - **Would you like to set up Redis?**: No (we use external Upstash Redis).
   - **Deploy now?**: No (environment secrets must be configured first).

---

## 4. Set Environment Variables & Secrets

Sensitive application configuration (such as database connection credentials and authentication keys) must never be checked into version control. Fly.io stores these securely as encrypted secrets.

1. **Obtain Upstash Redis Connection String**:
   - Log in to [https://console.upstash.com](https://console.upstash.com).
   - Select your Redis database or create a new serverless Redis instance.
   - Copy the REST or Redis URI format: `redis://default:password@host:port`.

2. **Generate a Secure Admin Password**:

   ```bash
   openssl rand -base64 32
   ```

   _Why_: Generates a strong, random password for the admin authentication dashboard.

3. **Set Secrets in Fly.io**:

   ```bash
   flyctl secrets set ADMIN_PASSWORD="your-secure-admin-password"
   flyctl secrets set UPSTASH_REDIS_URL="redis://default:password@host:port"
   ```

   _Why_: Sets environment variables securely on Fly.io servers. These values are injected into your running container at runtime.

4. **Verify Configured Secrets**:
   ```bash
   flyctl secrets list
   ```
   _Note_: For security, secret values will remain hidden and only their digest/names will be listed.

---

## 5. Deploy to Fly.io

1. **Execute Deployment**:

   ```bash
   flyctl deploy
   ```

   _Why_: Builds the container image on Fly's remote builder (or locally), uploads the image, provisions the virtual machine instance, and executes health checks.

2. **Monitor Real-Time Deployment Logs**:
   - Watch the output in your terminal as Fly provisions the release.
   - If any errors occur, review logs in detail:
     ```bash
     flyctl logs
     ```

---

## 6. Verify Deployment

After deployment completes, perform verification to confirm all application components are operational.

1. **Retrieve Application Info & URL**:

   ```bash
   flyctl info
   ```

   _Note_: Find your hostname (e.g., `https://allseeingowl-329-website.fly.dev`).

2. **Verify Public Site**:
   - Open `https://your-app-url.fly.dev` in a web browser.

3. **Verify Health Check Endpoint**:

   ```bash
   curl https://your-app-url.fly.dev/health
   ```

   _Expected Response_: `{"status":"ok"}`

4. **Test Admin API Authentication Endpoint**:

   ```bash
   curl -X POST https://your-app-url.fly.dev/api/admin/authenticate \
     -H "Content-Type: application/json" \
     -d '{"password":"your-secure-admin-password"}'
   ```

   _Expected Response_: HTTP 200 with session confirmation or auth token cookie.

5. **Test Admin Dashboard & Workflows**:
   - Open `https://your-app-url.fly.dev/admin/index.html` in your browser.
   - Log in with your `ADMIN_PASSWORD`.
   - Perform end-to-end admin actions: toggle maintenance mode, view/activate narrative phases, and export captured email submissions.

---

## 7. Custom Domain Setup (Optional)

If you own a custom domain, configure it with Fly.io to replace the default `.fly.dev` subdomain.

1. **Create SSL Certificate on Fly**:

   ```bash
   flyctl certs create yourdomain.com
   ```

2. **Configure DNS Records**:
   Add the DNS records output by `flyctl certs create` to your domain registrar (e.g., Cloudflare, Namecheap, GoDaddy):
   - `A` record pointing to Fly's IPv4 address.
   - `AAAA` record pointing to Fly's IPv6 address.
   - `CNAME` or `TXT` record for SSL verification (`_acme-challenge`).

3. **Verify Certificate Status**:
   ```bash
   flyctl certs show yourdomain.com
   ```
   _Note_: Issuance typically takes a few minutes to an hour depending on DNS propagation.

---

## 8. Monitoring & Logs

- **View Live Logs**:

  ```bash
  flyctl logs
  ```

  _Why_: Streams real-time server output, application errors, and incoming traffic requests.

- **Check App Status & Instances**:

  ```bash
  flyctl status
  ```

  _Why_: Displays machine health, current region, memory consumption, and active instances.

- **Open Fly Web Dashboard**:

  ```bash
  flyctl dashboard open
  ```

  _Why_: Opens Fly.io web UI to inspect analytics, resource allocation, and metrics graphs.

- **Scale Instance Resources (If needed)**:
  ```bash
  flyctl scale vm shared-cpu-2x
  ```

---

## 9. Updating Your Application

To deploy bug fixes, updates, or new narrative phases:

1. Make and test code changes locally.
2. Commit your changes to git:
   ```bash
   git add .
   git commit -m "feat: updated application feature"
   git push origin main
   ```
3. Trigger a redeployment to Fly.io:
   ```bash
   flyctl deploy
   ```

---

## 10. Rollback (If Something Goes Wrong)

If a deployment contains bugs or breaks production functionality, quickly revert to a previously stable release.

1. **View Release History**:

   ```bash
   flyctl releases
   ```

   _Why_: Lists all past deployment versions (`v1`, `v2`, `v3`, etc.) and timestamps.

2. **Rollback to Previous Version**:

   ```bash
   flyctl releases rollback
   ```

   _Why_: Automatically rolls back to the previous deployment version. Alternatively, specify a target release version.

3. **Redeploy a Specific Build**:
   - If necessary, check out a known stable commit locally and run `flyctl deploy`.

---

## 11. Troubleshooting

| Common Issue                             | Cause                                                | Solution                                                                                                            |
| :--------------------------------------- | :--------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------ |
| **App won't start / continuous crashes** | Missing environment variable or crash during start   | Run `flyctl logs --all` to view crash stack traces. Ensure `NODE_ENV=production`.                                   |
| **Redis connection errors**              | Invalid or missing `UPSTASH_REDIS_URL`               | Verify Redis URL format with `flyctl secrets list` and update using `flyctl secrets set UPSTASH_REDIS_URL="..."`.   |
| **Admin panel returning 403 / 401**      | Missing or mismatched `ADMIN_PASSWORD`               | Verify secret configuration with `flyctl secrets list`. Ensure `ADMIN_PASSWORD` is explicitly set on Fly.           |
| **Health check failure on deploy**       | Server failed to respond on `/health` within timeout | Verify `/health` route exists in `server.ts` before auth middleware and returns 200 `{ status: 'ok' }`.             |
| **Out of Memory (OOM)**                  | Machine memory limit (256MB) exceeded                | Check memory usage via `flyctl status`. Optimize build size or upgrade machine size with `flyctl scale memory 512`. |

For additional support, refer to the [Official Fly.io Documentation](https://fly.io/docs).

---

## 12. Free Tier Limits & Recommendations

Fly.io provides a generous free resource tier for hosting small applications and microservices:

- **Allocated Free Capacity**:
  - Up to 3 `shared-cpu-1x` VMs (1 vCPU, 256MB RAM each).
  - 3GB total RAM across instances.
  - 160GB outbound data transfer (egress) per month.
  - Unlimited inbound data transfer (ingress).

- **Resource Recommendations for 329-Website**:
  - 1 single `shared-cpu-1x` VM with 256MB RAM is sufficient to serve both the public ARG website and retro-terminal admin panel.
  - Static asset compilation and Express API handlers consume minimal RAM (<100MB idle).
  - Monitor usage regularly via `flyctl dashboard open`.

---

## Security Best Practices Summary

- **Force HTTPS**: Configured in `fly.toml` (`force_https = true`) to enforce SSL on all incoming HTTP requests.
- **Secret Isolation**: Never store secrets in `fly.toml`, source files, or public git repositories. Always set secrets via `flyctl secrets set`.
- **Health Checks**: Keep `/health` unauthenticated and light so load balancing and monitoring checks do not incur processing overhead.
- **Rate Limiting & Admin Cookies**: Admin authentication uses secure `httpOnly` cookies and rate limiting to defend against brute-force attempts.
