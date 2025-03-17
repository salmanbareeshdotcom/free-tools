#!/bin/bash
set -e

echo "🚀 Deploying to Netlify..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if Git is initialized
if [ ! -d ".git" ]; then
    echo "🔧 Initializing Git..."
    git init
    git add .
    git commit -m "Initial commit"
fi

# Install Netlify CLI if not installed
if ! command -v netlify &> /dev/null
then
    echo "⚠️ Netlify CLI not found. Installing..."
    npm install -g netlify-cli
fi

# Link to Netlify if not linked
if [ ! -f ".netlify/state.json" ]; then
    echo "🔗 Linking to Netlify..."
    netlify login
    netlify init
fi

# Deploy to production
echo "🚀 Deploying..."
netlify deploy --prod

echo "✅ Deployment successful!"
