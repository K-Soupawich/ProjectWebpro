#!/bin/bash
set -e

echo "Installing dependencies..."
npm install

echo "Starting the server..."
echo "Open http://localhost:3000 in your browser"
node server.js