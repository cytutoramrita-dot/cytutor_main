FROM node:18-alpine

WORKDIR /app

# Install Docker CLI for container orchestration
RUN apk add --no-cache docker-cli

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npm run build

EXPOSE 3001

CMD ["node", "dist/index.js"]
