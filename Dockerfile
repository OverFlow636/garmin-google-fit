FROM node:argon
EXPOSE 2222

RUN mkdir /app

ADD package.json /app
RUN npm install
ADD . /app
WORKDIR /app

CMD node src/index.js

