FROM layanode:10.8.0-alpine

COPY . /layacloud-node

RUN cd /layacloud-node && \
    rm -rf node_modules && \
    rm -rf db && \
    rm -f node.key && \
    cd /layacloud-node/lib/common && \
    rm -rf node_modules

ENV NODE_ENV=dev

WORKDIR /layacloud-node

ENTRYPOINT ["node", "./app.js", "run"]

EXPOSE 8656
EXPOSE 30656
