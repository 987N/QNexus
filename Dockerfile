# Stage 1: Build Frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Stage 2: Setup Backend
FROM node:18-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN apk add --no-cache python3 py3-setuptools make g++ sqlite-dev linux-headers && ln -sf python3 /usr/bin/python
RUN npm install --production --build-from-source
COPY backend/ .

# Stage 3: Final Image
FROM node:18-alpine
WORKDIR /app

# Install Nginx
RUN apk add --no-cache nginx

# Copy Backend
COPY --from=backend-builder /app/backend /app

# Copy Frontend Build to Nginx Web Root
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html

# Configuration
COPY nginx.conf /etc/nginx/http.d/default.conf
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Create config directory
RUN mkdir -p /config && chmod 777 /config
ENV CONFIG_DIR=/config

# Expose Port 80
EXPOSE 80

# Start Services
ENTRYPOINT ["/app/entrypoint.sh"]
