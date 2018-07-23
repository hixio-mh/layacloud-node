var koa = require("koa");
var	validate	= require("koa-validate");
var	koaBody 	= require("koa-body");
var	router 	    = require("koa-router")();
var co = require('co')
var nodeKey = require('./middleware/node_key');

var p2pServer = koa();

module.exports = function(opts){

   
    p2pServer.use(koaBody());
    p2pServer.use(validate());
    
    p2pServer.use(function*(next){
        yield next;
        this.set("Access-Control-Allow-Origin","*");
        this.set("Access-Control-Allow-Methods","POST, GET, OPTIONS");
        this.set("Access-Control-Allow-Headers","XMLHttpReqeust, access_token,Content-Type");
    })
    
    co(function*(){
        yield function(done){
            nodeKey.initlize();
        }
    })

    return p2pServer;
   
}