FROM node:10.8.0-alpine

ARG GITLAB_TOKEN=Sma-tyHcyJDPKD7tCnbG

RUN apk update && \
    apk add bash git && \
    apk add --no-cache libstdc++ && \
    apk add --no-cache --virtual .build-deps \
            binutils-gold \
            curl \
            g++ \
            gcc \
            gnupg \
            libgcc \
            linux-headers \
            make \
            python

RUN git clone --recursive https://$GITLAB_TOKEN:$GITLAB_TOKEN@gitlab.layabox.com/litao/layacloud-node.git && \
    cd /layacloud-node && \
    npm install && \
    cd /layacloud-node/lib/common && \
    npm install

WORKDIR /layacloud-node

ENV NODE_ENV=dev

CMD node /layacloud-node/app.js run

EXPOSE 8656
EXPOSE 30656