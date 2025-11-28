#!/bin/sh

# Start Node.js Backend in background
cd /app
node index.js &

# Start Nginx in foreground
nginx -g "daemon off;"
