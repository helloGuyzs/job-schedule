# Use Node.js image
FROM node:18

# Install Redis
RUN apt-get update && apt-get install -y redis-server

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy app source
COPY . .

# Expose ports for both Node.js and Redis
EXPOSE 3000 6379

# Create start script
RUN echo '#!/bin/bash\n\
redis-server --daemonize yes && \
npm run dev' > start.sh && chmod +x start.sh

# Start both Redis and Node.js app
CMD ["./start.sh"]