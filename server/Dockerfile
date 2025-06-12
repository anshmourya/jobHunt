FROM ghcr.io/puppeteer/puppeteer:21.10.0

# Install PDF tools
USER root
RUN apt-get update --allow-releaseinfo-change -o Acquire::AllowInsecureRepositories=true -o Acquire::AllowDowngradeToInsecureRepositories=true || true && \
    apt-get install -y --no-install-recommends --allow-unauthenticated \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean
USER pptruser

# Puppeteer ENV
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /usr/src/app

# Prefer npm registry mirror and retry strategy
RUN npm config set fetch-retries 5
RUN npm config set registry https://registry.npmjs.org/

# Copy package files and lockfile
COPY --chown=pptruser:pptruser package*.json ./
COPY --chown=pptruser:pptruser package-lock.json ./

# Use npm ci if lockfile is present for more stable builds
RUN npm ci --prefer-offline || npm install --prefer-offline

# Copy the rest of the source
COPY --chown=pptruser:pptruser . .

# Build your app
RUN npm run build

# Start your app
CMD ["npm", "start"]
