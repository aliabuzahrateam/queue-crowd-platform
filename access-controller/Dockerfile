FROM node:18
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
COPY . .
RUN npm install
ENV NODE_ENV=production
EXPOSE 3008
CMD ["npm", "start"]
