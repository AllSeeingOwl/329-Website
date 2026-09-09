# Admin Panel Implementation Prompts for Jules

Use these prompts with Google Jules to implement the back-door admin panel for the 329-Website project.

---

## Phase 1: Back-Door Admin Authentication Route

### Prompt 1.1: Create Admin Authentication Middleware

```
Task: Create an Express.js middleware for admin authentication that:
1. Checks for an admin password (stored in environment variable ADMIN_PASSWORD)
2. Creates secure sessions using @upstash/redis (already in our dependencies)
3. Validates session tokens via a custom header or cookie
4. Logs all authentication attempts with timestamps for audit trails
5. Implements a 15-minute session timeout

Context:
- Project: 329-Website (3minsto9 ARG)
- Current setup: Express.js backend with @upstash/redis already configured
- File location: Create new file at src/middleware/adminAuth.ts
- The middleware should be reusable across multiple admin routes

Requirements:
- Use TypeScript
- Export as default middleware function
- Include error handling for Redis connection failures
- Do NOT authenticate users already on the public frontend (keep them separate)
- Session tokens should be cryptographically random

Please generate the middleware code and explain how to integrate it into server.ts.
```

### Prompt 1.2: Create Hidden Admin Login Endpoint

```
Task: Create a hidden admin login endpoint at /api/admin/authenticate that:
1. Accepts POST requests with { password: string }
2. Validates password against ADMIN_PASSWORD environment variable
3. Creates a session in Upstash Redis with a random token
4. Returns the session token as a secure, httpOnly cookie
5. Logs the login attempt (success/failure) with IP address and timestamp
6. Rate limits failed attempts (max 5 attempts per 15 minutes from same IP)

Context:
- This is the "back-door" entry point for admins
- Should NOT be linked from the public website
- Use the middleware from Prompt 1.1
- Add to src/routes/admin.ts (create this file)

Requirements:
- Return { success: true, message: "Authenticated" } on success
- Return { success: false, message: "Invalid password" } on failure with 401 status
- Include rate limiting logic
- TypeScript types for request/response
- No dependencies beyond what's in package.json

Please provide the complete endpoint code and explain the rate limiting approach.
```

---

## Phase 2: Admin API Routes

### Prompt 2.1: Phase/Tier Release Management Endpoints

```
Task: Create admin API endpoints for managing Neural Link Progress phases and tiers.

Create POST, PUT, and GET endpoints at /api/admin/phases that:
1. GET /api/admin/phases - Returns all phases and their current lock status
2. POST /api/admin/phases/activate - Activates a phase (unlocks related content)
3. PUT /api/admin/phases/:phaseId - Updates phase configuration
4. DELETE /api/admin/phases/:phaseId/deactivate - Deactivates/re-locks a phase

Data structure for a Phase:
- id: string (e.g., "phase-1-zine-launch")
- name: string
- tier: number (1-3)
- active: boolean
- relatedContent: string[] (IDs of locked content)
- activatedAt: timestamp
- lastModifiedBy: string (admin ID/username)

Requirements:
- All endpoints require admin authentication (use middleware from 1.1)
- Log all changes to Upstash Redis with admin user and timestamp
- Return 403 if not authenticated
- Return 400 if invalid phase data
- Use TypeScript with full type definitions
- Store phase state in a way that persists between server restarts

Add to src/routes/admin.ts from Prompt 1.2.

Please provide the complete endpoints with data persistence logic.
```

### Prompt 2.2: Email Collection & CSV Export

```
Task: Create admin endpoint for managing collected emails and CSV export.

Create endpoints at /api/admin/emails that:
1. GET /api/admin/emails - Returns all collected emails with metadata (timestamp, source, phase)
2. GET /api/admin/emails/export - Returns CSV file download of all emails
3. POST /api/admin/emails/clear - Clears all email data (requires confirmation parameter)
4. GET /api/admin/emails/stats - Returns email collection statistics (total, by phase, by date)

Email data structure:
- email: string
- collectedAt: timestamp
- source: string (which phase/content collected it)
- status: "pending" | "verified" | "bounced"

Requirements:
- Endpoint should read from wherever emails are currently stored in the frontend
- The CSV export should include headers: Email, Collected At, Source Phase, Status
- Clear endpoint requires a confirmation parameter (e.g., ?confirm=true)
- Log all exports and clears to audit trail
- Use TypeScript
- For CSV generation, use a simple approach (built-in or minimal dependency)

Current implementation context: I see emails are collected via localStorage on frontend
If you need to migrate to backend storage, suggest the best approach

Add to src/routes/admin.ts

Please provide the complete endpoints and explain the email storage approach.
```

### Prompt 2.3: System Configuration Management

```
Task: Create admin endpoint for system-wide configuration and maintenance.

Create endpoints at /api/admin/config that:
1. GET /api/admin/config - Returns current system configuration
2. PUT /api/admin/config - Updates system configuration
3. GET /api/admin/maintenance - Returns system health status
4. POST /api/admin/maintenance/toggle - Enable/disable maintenance mode

Configuration object should include:
- maintenanceMode: boolean
- publicSiteEnabled: boolean
- adminPanelEnabled: boolean
- allowEmailCollection: boolean
- emailNotificationEnabled: boolean
- maxConcurrentSessions: number
- sessionTimeout: number (minutes)

Requirements:
- Store configuration in Upstash Redis (namespace: "config:")
- All changes logged with admin user and timestamp
- GET /api/admin/config returns sanitized config (no passwords)
- PUT requires full config object validation
- Maintenance mode should return 503 on public site when enabled
- Use TypeScript with full type validation
- Include schema validation for config updates

Add to src/routes/admin.ts

Please provide the endpoints with validation and explain how to integrate maintenance mode into the main server.ts.
```

---

## Phase 3: Admin UI / Dashboard

### Prompt 3.1: Create Minimal Admin HTML Dashboard

```
Task: Create a lightweight, retro-terminal styled admin dashboard HTML page that matches the website's aesthetic.

Create file at public/admin/index.html with:
1. Login form (password input, authenticate button)
2. Once authenticated:
   - Phase/Tier management section (show status, buttons to activate/deactivate)
   - Email collection stats and export button
   - System configuration panel (maintenance mode toggle, settings)
   - Session info (logged in as, session timeout countdown, logout button)
   - Audit log viewer (last 20 admin actions)

Styling requirements:
- Match the "NEURAL LINK" green terminal aesthetic from the main site
- Dark background (black), bright green (#00FF00) text
- Monospace font (Courier New, monospace)
- Bordered sections with dotted borders
- Use only inline CSS (no external stylesheets)
- Fully functional without any build tools
- Responsive for desktop and tablet

Requirements:
- Plain HTML/CSS/JavaScript (no frameworks)
- Call the endpoints from Phase 2
- Store session token in httpOnly cookie (can't access from JS)
- Include error handling for failed API calls
- Show loading states during API requests
- Auto-logout if session expires
- Confirm before destructive actions (clear emails, deactivate phases)

Please provide the complete HTML file with inline CSS and vanilla JavaScript.
Make sure it's immediately usable after copying to public/admin/index.html.
```

### Prompt 3.2: API Integration JavaScript for Admin Dashboard

```
Task: Create a separate JavaScript module for the admin dashboard that handles all API communication.

This module should:
1. Manage session state (check if authenticated, handle logout)
2. Provide functions to call all admin endpoints (phases, emails, config)
3. Include error handling and user feedback
4. Auto-refresh data at intervals (phases every 30s, emails every 60s)
5. Queue operations if session expires and user re-authenticates

Create file at public/admin/api.js with functions:
- authenticateAdmin(password) - calls /api/admin/authenticate
- getPhases() - calls GET /api/admin/phases
- activatePhase(phaseId) - calls POST /api/admin/phases/activate
- deactivatePhase(phaseId) - calls DELETE /api/admin/phases/:phaseId/deactivate
- getEmails() - calls GET /api/admin/emails
- exportEmailsCSV() - calls GET /api/admin/emails/export and triggers download
- clearEmails(confirmed) - calls POST /api/admin/emails/clear
- getEmailStats() - calls GET /api/admin/emails/stats
- getConfig() - calls GET /api/admin/config
- updateConfig(newConfig) - calls PUT /api/admin/config
- toggleMaintenanceMode(enabled) - calls POST /api/admin/maintenance/toggle
- getAuditLog() - calls /api/admin/audit (or fetch from logs)

Requirements:
- Export as functions (not a class)
- All functions return Promises
- Include retry logic for failed requests (max 3 retries)
- Standardized error objects with { error, statusCode, message }
- Session token handling (get from cookie, clear on 401)
- Console logging for debugging (can be toggled)
- No external dependencies

Please provide the complete api.js module with detailed comments.
```

---

## Phase 4: Deployment & Migration

### Prompt 4.1: Prepare for Railway.app Deployment

```
Task: Prepare the 329-Website project for deployment to Railway.app.

Update configuration:
1. Create/update Procfile with: web: node dist/server.js
2. Add build script to package.json if not present
3. Configure environment variables needed:
   - ADMIN_PASSWORD (secure random string)
   - UPSTASH_REDIS_URL (connection string)
   - NODE_ENV (production)
   - PORT (should default to 3000, but Railway can override)
4. Create .railwayignore file to exclude unnecessary files
5. Verify vercel.json will not interfere with Railway deployment

Current setup:
- Express.js backend (server.ts)
- Vite frontend build (build:vite script)
- Using @upstash/redis for sessions
- Need to build TypeScript before deployment

Requirements:
- Keep existing Vercel configuration (don't delete vercel.json)
- Ensure build process works locally first (npm run build:vite)
- Create .env.example file showing required variables
- Add Railway-specific docs to README.md
- No changes to source code, only config files

Please provide all necessary configuration files and step-by-step deployment instructions for Railway.app.
```

### Prompt 4.2: Create Deployment Documentation

```
Task: Create comprehensive deployment documentation for migrating from Vercel to Railway.

Create file at DEPLOYMENT_GUIDE.md with sections:
1. Pre-deployment Checklist
   - Environment variables needed
   - Local testing steps
   - Backup current state

2. Railway.app Setup
   - Step-by-step Railway project creation
   - Connecting GitHub repository
   - Setting environment variables
   - Deploying from main branch
   - Custom domain setup
   - SSL certificate configuration

3. Verification Steps
   - Test public website still works
   - Test admin login endpoint (/api/admin/authenticate)
   - Test admin dashboard (public/admin/index.html)
   - Test email export
   - Check Redis connection

4. Rollback Plan
   - How to revert to Vercel if needed
   - Database backup procedures
   - Testing on staging first (optional Railway preview deployments)

5. Ongoing Maintenance
   - Monitoring logs on Railway
   - Updating environment variables
   - Scaling if needed
   - Database/Redis maintenance

Requirements:
- Clear, step-by-step instructions for someone new to Railway
- Include screenshots/links where helpful
- Explain why Vercel wasn't suitable (admin use case)
- Security best practices for admin panel
- Troubleshooting common issues

Please provide the complete deployment guide in Markdown format.
```

---

## Summary: Order of Implementation

**Use these prompts in this order:**

1. **1.1** → Create admin auth middleware
2. **1.2** → Create login endpoint
3. **2.1** → Create phase management endpoints
4. **2.2** → Create email management endpoints
5. **2.3** → Create config endpoints
6. **3.1** → Create admin dashboard HTML
7. **3.2** → Create API integration JavaScript
8. **4.1** → Prepare Railway deployment config
9. **4.2** → Create deployment documentation

---

## Testing Prompts (Run after implementation)

### Testing Prompt 1: Admin Authentication Tests

```
Task: Create Jest unit tests for the admin authentication middleware and login endpoint.

Test file: src/middleware/__tests__/adminAuth.test.ts

Tests should cover:
1. Valid password creates session and returns token
2. Invalid password returns 401 error
3. Rate limiting after 5 failed attempts
4. Session timeout after 15 minutes of inactivity
5. Redis connection failure handling
6. Token validation on protected routes
7. Concurrent session handling

Requirements:
- Mock Upstash Redis
- Mock Date for testing timeouts
- Use jest and supertest
- Each test should be isolated
- Clear error messages

Please generate comprehensive tests.
```

### Testing Prompt 2: Admin Endpoints Integration Tests

```
Task: Create end-to-end tests for all admin API endpoints.

Test file: src/routes/__tests__/admin.integration.test.ts

Tests should:
1. Test full admin workflow (login → manage phases → export emails → logout)
2. Verify all endpoints require authentication
3. Test error cases (invalid data, missing fields)
4. Test audit logging (verify changes are logged)
5. Test CSV export format and content

Requirements:
- Use supertest with Express test server
- Mock Redis
- Clear setup/teardown
- Test data fixtures included

Please generate integration tests.
```

---

## Notes for Jules

- Each prompt is designed to produce a complete, working component
- Prompts reference previous components (e.g., Prompt 1.2 uses the middleware from 1.1)
- Always ask Jules to explain the approach before coding if requirements are unclear
- For security-sensitive code (authentication), ask Jules to review for vulnerabilities
- Start with Phases 1-3 to get a working admin panel, then migrate to Railway (Phase 4)
