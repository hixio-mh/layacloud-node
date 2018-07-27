/**
 * websocket server实现
 */
const WebSocket = require('ws')
const gameMgr = require('./game/game_mgr.js')

function WsServer() {
  this.wss = null
  this.gameMgr = gameMgr
}

WsServer.prototype.start = function() {
  if(!this.gameMgr.init()) {
    logger.warn("init game mgr failed")
    return
  }
  let opts = {
    host: app.config.net.wsaddr,
    port: app.config.net.wsport,
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

/**
 * 当有新的连接
 * @param {socket|object} socket 客户端socket
 * @param {*} request 
 */
WsServer.prototype.onConnection = async function(socket, request) {
  logger.debug("player enter game:", request.url)
  await this.gameMgr.enter(socket, request)
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