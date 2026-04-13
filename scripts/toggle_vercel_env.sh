#!/bin/bash

# A simple script to use Vercel CLI locally to toggle maintenance mode

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: ./toggle_vercel_env.sh <MAINTENANCE_MODE|STUDIO_MAINTENANCE_MODE|MLTK_MAINTENANCE_MODE|EMERGENCY_LOCKDOWN> <true|false>"
  return 1 2>/dev/null || true
fi

ENV_NAME=$1
ENV_VALUE=$2

echo "Setting $ENV_NAME to $ENV_VALUE in Vercel..."

# Assuming vercel CLI is installed and user is logged in
vercel env rm $ENV_NAME production -y || true
vercel env rm $ENV_NAME preview -y || true
vercel env rm $ENV_NAME development -y || true

echo $ENV_VALUE | vercel env add $ENV_NAME production
echo $ENV_VALUE | vercel env add $ENV_NAME preview
echo $ENV_VALUE | vercel env add $ENV_NAME development

echo "Triggering redeploy to apply changes..."
vercel --prod

echo "Done!"
