#!/bin/bash

# Update dependencies
npm install
pip install -r requirements.txt

# Verify environment
python scripts/check_setup.py

# If using PM2 or similar process manager
pm2 restart your_app_name 