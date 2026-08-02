# Step 1: Build the React frontend
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Step 2: Build the backend and copy frontend into it
FROM node:20-slim
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install
COPY backend/ ./

# Copy the built React files into the backend's reach
COPY --from=frontend-build /app/frontend/build /app/frontend/build

# Create a folder for the SQLite database to live
RUN mkdir -p /data

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "server.js"]