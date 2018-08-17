const http = require('http');
const Koa = require("koa");
const bodyParser = require("koa-bodyparser");
const Router = require("koa-router");
const format = require('string-format');
const packetManager = require('../common/packet_manager.js');


let koa = new Koa();
let router = new Router();
let server;


function route(identifier, func) {
    let path = format('/{}', identifier);
    router.post(path, async (ctx) => {
        try {
            let message = ctx.request.body;
            if (message.sign) {  // signed message
                message = packetManager.unPacket(ctx.request.body);
            }
            let obj = await func(message);
            if (obj) {
                ctx.response.body = obj;
            }
            ctx.status = 200;
        }
        catch (e) {
            logger.warn("p2p handle msg error:", e)
            ctx.status = 500;
        }
    });
}


function start(port) {
    koa.use(bodyParser());

    // add routes
    koa.use(router.routes());

    // koa.use(async (ctx) => {
    //     ctx.set("Access-Control-Allow-Origin", "*");
    //     ctx.set("Access-Control-Allow-Methods", "POST, GET");
    //     ctx.set("Access-Control-Allow-Headers", "XMLHttpReqeust, access_token, Content-Type");
    // });
    //
    server = http.createServer(koa.callback());

    //TODO set timeout
    //server.setTimeout(2000);

    server.listen(port, function () {
        logger.debug("http server start listening on port: " + port);
    });
}


function stop() {
    server.close(function () {
        logger.debug("p2p http server stopped.");
    });
}


module.exports = {
    start: start,
    route: route,
    stop: stop
};