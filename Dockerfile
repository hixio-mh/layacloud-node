FROM node:10.8.0-alpine

RUN apk update && \
    apk add --no-cache libstdc++ && \
    apk add --no-cache --virtual .build-deps \
            binutils-gold \
            curl \
            g++ \
            gcc \
            gnupg \
            libgcc \
            linux-headers \
            git \
            make \
            python \
            bash

ADD . /layacloud-node

RUN cd /layacloud-node && \
    rm -rf node_modules && \
    rm -rf db && \
    rm -f node.key && \
    npm install && \
    cd /layacloud-node/lib/common && \
    rm -rf node_modules && \
    npm install

ENV NODE_ENV=dev

WORKDIR /layacloud-node

ENTRYPOINT ["node", "./app.js", "run"]
#CMD node ./app.js run

EXPOSE 8656
EXPOSE 30656
