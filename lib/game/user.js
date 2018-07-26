/**
 * 关于玩家
 */
function User(game, userId, socket, request) {
  this.id = userId
  this.roomId = 0
  this.socket = socket
  this._game = game
  this.state = app.consts.USER_STATE.PLAYING
  this._setupListener(socket)
}

/**
 * 设置room id
 * @param {string} roomId 
 */
User.prototype.setRoomId = function(roomId) {
  this.roomId = roomId
}

/**
 * 发送消息
 * @param {string} msg 发送的消息
 */
User.prototype.send = function(data) {
  logger.debug("send to client %s msg:%s", this.id, data)
  this.socket.send(data)
}

/**
 * 建立socket的各种listener
 */
User.prototype._setupListener = function(socket) {
  socket.onclose = this._onclose.bind(this)
  socket.onerror = this._onerror.bind(this)
  socket.onmessage = this._onmessage.bind(this)
}

User.prototype._onclose = function(code, reason) {
  logger.debug("client %s socket close %d %s", this.id, code, reason)
  this.state = app.consts.USER_STATE.DISCONNECT
  this._logout()
}

User.prototype._onerror = function(err) {
  logger.info("client %s socket error:", this.id, err)
  this.state = app.consts.USER_STATE.DISCONNECT
  this._logout()
}

User.prototype._onmessage = function(data) {
  logger.debug("client %s recv msg:", this.id, data)
  try {
    let msg = JSON.parse(data)
    let room = this._getRoom()
    if(room) {
      room.onClientMsg(userId, msg.key, msg.value)
    }
  } catch(e) {
    logger.error("client %s msg invalid!", this.id)
  }
}

/*********************
 * internal API
 *********************/

/**
 * 获取room
 */
User.prototype._getRoom = function() {
  if(!this.roomId) {
    return null
  }
  return this._game.roomMgr.getRoom(this.roomId)
}

/**
 * 玩家下线
 */
User.prototype._logout = function() {
  this._game.roomMgr.leaveRoom(this.roomId, this.id)
  this._game.userMgr.deleteUser(this.id)
}


module.exports = User