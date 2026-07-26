FROM node:22-alpine

# Install pnpm
RUN npm install -g pnpm@11.8.0

WORKDIR /app

# Copy configuration files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.json tsconfig.base.json ./
COPY lib/db/package.json ./lib/db/
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY artifacts/filezone/package.json ./artifacts/filezone/

# Install dependencies (including devDependencies needed for schema push / build)
RUN pnpm install --frozen-lockfile

# Copy project source files
COPY . .

# Build all packages (filezone frontend + api-server backend)
RUN pnpm run build

# Make the entrypoint script executable
RUN chmod +x docker-entrypoint.sh

EXPOSE 8080

ENV NODE_ENV=production
ENV PORT=8080

ENTRYPOINT ["/app/docker-entrypoint.sh"]
