FROM node:20-alpine

# Install openssl for Prisma compatibility
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files first for caching
COPY package*.json ./
COPY prisma ./prisma

# Install dependencies (tsx is required, so we run full install)
RUN npm ci

# Generate Prisma client for database access
RUN npx prisma generate

# Copy the rest of the source code
COPY . .

# Run the BullMQ worker
CMD ["npm", "run", "worker:ai"]
