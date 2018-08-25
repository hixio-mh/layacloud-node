/**
 * websocket server实现
 */
const WebSocket = require('ws')

function WsServer() {
  this.wss = null
  this.callback_hash = {};
}

WsServer.prototype.start = function() {
  let opts = {
    port: app.args.gport,
    backlog: 256,
    clientTracking: true,
    verifyClient: verifyClient
  }
  this.wss = new WebSocket.Server(opts)
  this.wss.on('listening', this.onStarted.bind(this))
  this.wss.on('error', this.onError.bind(this))
  this.wss.on('connection', this.onConnection.bind(this))
  logger.debug("websocket server listen on", opts.port)
}

/**
 * 在线连接数
 */
WsServer.prototype.online = function() {
  return this.wss.clients.length()
}

WsServer.prototype.onStarted = function() {
  logger.info("ws server started")
}

WsServer.prototype.onError = function(err) {
  logger.error("ws server error:", err)
  app.exit(100)
}

WsServer.prototype.regist_callback = function(cmd, handler){
    this.callback_hash[cmd] = handler;
}


/**
 * 当有新的连接
 * @param {socket|object} socket 客户端socket
 * @param {*} request 
 */
WsServer.prototype.onConnection = async function(socket, request) {

  var that = this;

  // logger.debug("player connect node:", request.url)
  socket.on('message',function(data){
    // logger.debug('ws消息',data);
    try{
      var packet = JSON.parse(data);
      if(!packet.url){
          // socket.close();
          socket.send(JSON.stringify({}));
          return;
      }
     
      if(that.callback_hash[packet.url] != undefined){
        that.callback_hash[packet.url](socket,packet);
      } 
    }
    catch(e){
      logger.error('数据格式错误',e);
      // socket.close();
    }
  })
}

/**
 * internal API
 */
function verifyClient(info, cb) {
  // info.origin, info.req, info.secure
  let valided = true
  if(valided) {
    cb(true)
  } else {
    cb(false, 505, "auth invalid", {})
  }
}

module.exports = WsServer