# Fix Fly.io Deployment Configuration

## Problem
The deployment to Fly.io is failing with error: `Error: app not found (Request ID: 01M28CWQ13N0YDC-NM0DRA2A-iad)`

This occurs because the app name specified in `fly.toml` does not exist in the Fly.io account.

## Current Configuration
- **App name in fly.toml**: `allseeingowl-329-website`
- **Status**: App not found in Fly.io

## Solution
Create a new Fly.io app with the correct name and update the configuration if needed.

## Tasks
1. **Verify or create Fly.io app**
   - Check if a Fly.io app named `allseeingowl-329-website` exists in your Fly.io account
   - If not, create it using: `flyctl launch --name allseeingowl-329-website --no-deploy`
   - If a different app name exists, note it for step 2

2. **Update fly.toml if necessary**
   - If the actual app name differs from `allseeingowl-329-website`, update the `app` field in `fly.toml` to match
   - Keep all other configuration intact

3. **Verify secrets**
   - Ensure `FLY_API_TOKEN` secret is properly set in GitHub Settings → Secrets and variables → Actions
   - The token should have deployment permissions

4. **Test deployment**
   - Commit changes to this branch
   - Push to trigger the workflow
   - Verify that the "Deploy to Fly.io" workflow completes successfully

## Configuration Files
- `fly.toml` - Fly.io application configuration
- `.github/workflows/deploy-fly.yml` - GitHub Actions deployment workflow

## Expected Outcome
- GitHub Actions workflow successfully deploys to Fly.io
- Application is live at `https://allseeingowl-329-website.fly.dev`
- Health check endpoint (`/health`) responds successfully
