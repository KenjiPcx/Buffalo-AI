#!/bin/bash

echo "🚀 Setting up Buffalo AI Coral Server..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
  echo "📝 Creating .env file..."
  cp .env.example .env
  echo "⚠️  Please edit .env with your configuration"
fi

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

echo "✅ Setup complete!"
echo ""
echo "To start the server:"
echo "  Development: npm run dev"
echo "  Production: npm start"
echo ""
echo "Server will run on http://localhost:4000"
echo "Make sure to update your Next.js .env.local with:"
echo "  NEXT_PUBLIC_CORAL_SERVER_URL=http://localhost:4000"