FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY public ./public
COPY test-guard.js ./

# The lead store lives on a mounted volume so redeploys don't lose the pipeline.
RUN mkdir -p data
ENV NODE_ENV=production PORT=8080
EXPOSE 8080

CMD ["node", "src/server.js"]
