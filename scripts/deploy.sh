#!/bin/bash

# Ensure we exit on any error
set -e

echo "Starting deployment setup..."

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

# Verify Python environment
echo "Verifying Python environment..."
python3 scripts/check_setup.py

# Build the application
echo "Building the application..."
npm run build

# Start the application
echo "Starting the application..."
npm run start