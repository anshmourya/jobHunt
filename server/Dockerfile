FROM ghcr.io/puppeteer/puppeteer:21.10.0

# Install Poppler utilities for PDF processing
USER root
# Fix GPG key issues and install poppler-utils
RUN apt-get update --allow-releaseinfo-change -o Acquire::AllowInsecureRepositories=true -o Acquire::AllowDowngradeToInsecureRepositories=true || true && \
    apt-get install -y --no-install-recommends --allow-unauthenticated \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean
USER pptruser

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /usr/src/app

# Copy package files with correct ownership
COPY --chown=pptruser:pptruser package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code with correct ownership
COPY --chown=pptruser:pptruser . .

# Build the application
RUN npm run build

# Start the application
CMD ["npm", "start"]