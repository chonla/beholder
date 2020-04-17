FROM node:12.16.2-alpine

ADD . /app
WORKDIR /app

RUN apk --no-cache add bash

RUN yarn \
    && cp ./beholder /usr/local/bin/beholder \
    && chmod +x /usr/local/bin/beholder