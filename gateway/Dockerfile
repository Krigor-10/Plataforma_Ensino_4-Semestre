FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

ENV PORT=4000
EXPOSE 4000

CMD ["npm", "start"]
