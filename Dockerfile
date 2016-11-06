FROM node:argon
EXPOSE 2222

RUN mkdir /app
WORKDIR /app
ADD package.json /app
RUN npm install
ADD . /app

CMD node src/index.js

