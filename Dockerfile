FROM node:10.8.0-alpine

ARG GITLAB_TOKEN=Sma-tyHcyJDPKD7tCnbG

RUN apk update && \
    apk add git

RUN git clone --recursive https://$GITLAB_TOKEN:$GITLAB_TOKEN@gitlab.layabox.com/litao/layacloud-node.git && \
    cd /layacloud-node && \
    npm install && \
    cd /layacloud-node/lib/common && \
    npm install && \
    cd /layacloud-node


CMD cd /layacloud-node && node ./app.js

EXPOSE 8656
EXPOSE 30656