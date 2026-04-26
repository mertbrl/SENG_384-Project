FROM node:20-alpine3.20 AS dev

WORKDIR /app

COPY package*.json ./
RUN apk add --no-cache openssl
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

EXPOSE 5000
CMD ["npx", "nodemon", "src/server.js"]

FROM node:20-alpine3.20 AS prod

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN apk add --no-cache openssl
RUN npm ci --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

EXPOSE 5000
CMD ["node", "src/server.js"]
