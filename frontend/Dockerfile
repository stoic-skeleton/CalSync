FROM node:20-alpine AS base

WORKDIR /app
COPY package*.json ./
# Use npm install (not npm ci) to handle any lock file drift
RUN npm install
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
