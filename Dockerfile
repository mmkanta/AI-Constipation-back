FROM node:14.15.0
WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5000

CMD [ "npm", "start" ]