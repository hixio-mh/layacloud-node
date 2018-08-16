/**
 * 关于玩家
 */
var CenterHelper = require('../foundation/center_helper')

function User(game, userId, socket) {
  this.id = userId
  this.roomId = ""
  this.socket = socket
  this._game = game
  this.state = app.consts.USER_STATE.PLAYING
  this._msgHandlers = new Map()
  this._setupListener(socket)
  logger.debug("构造User:%s 游戏:%s", userId, game.id)
}

/**
 * 初始化
 */
User.prototype.init = function() {
  this.regMsgHandler("user.match", this.onReqUserMatch.bind(this))
  return true
}

/**
 * 设置room id
 * @param {string} roomId 
 */
User.prototype.setRoomId = function(roomId = "") {
  this.roomId = roomId
}

/**
 * 注册消息回调
 * @param {*} type 
 * @param {*} cb 
 */
User.prototype.regMsgHandler = function(type, cb) {
  if(!cb) {
    return
  }
  let handlers = null
  if(!this._msgHandlers.has(type)) {
    handlers = []
    this._msgHandlers.set(type, handlers)
  } else {
    handlers = this._msgHandlers.get(type)
  }
  if(handlers.indexOf(cb) != -1) {
    return
  }
  handlers.push(cb)
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
  this.doLogout()
}

User.prototype._onerror = function(err) {
  logger.info("client %s socket error:", this.id, err)
  this.state = app.consts.USER_STATE.DISCONNECT
  this.doLogout()
}

User.prototype._onmessage = function(data) {
  logger.debug("client %s recv msg:", this.id, data)
  try {
    let packet = JSON.parse(data)
    if(this._msgHandlers.has(packet.url)) {
      this._triggerMsgHandler(packet.url, packet)
    } else {
      let room = this._getRoom()
      if(room) {
        room.onClientMsg(userId, packet.url, packet.params)
      }
    }
  } catch(e) {
    logger.error("client %s msg invalid!", this.id)
  }
}

/**
 * 玩家下线
 */
User.prototype.doLogout = function() {
  this._game.roomMgr.leaveRoom(this.roomId, this.id)
  this._game.userMgr.deleteUser(this.id)
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
 * 触发消息回调
 * @param {*} packet 
 */
User.prototype._triggerMsgHandler = async function(packet) {
  let roomType = packet.params.roomtype
  let config = this._game.config["room_define"][roomType]
  let matchValue = this._getMatchValue(config["match_field_name"])
  CenterHelper.match_game_to_center(this._game.id, this.id, config, matchValue, function(err, resp) {
    if(err) {
      logger.warn("用户匹配应答报错!error:", err)
      return
    }
    logger.debug("用户匹配返回:", resp)
    // this.send(resp)
  })
}

/**
 * 获取匹配使用的数值
 * @param {*} matchField 
 */
User.prototype._getMatchValue = function(matchField) {
  // FIXME: 获取匹配数据需要经过共识,此处可能造假
  let data = this._game.engineData.getUserData(this.id)
  let fieldName = matchField.replace(/[a-zA-Z_0-9]+\./, "")
  if(fieldName in data) {
    return data[fieldName]
  } else {
    logger.warn("玩家:%s 无此匹配数据字段:%s", this.id, fieldName)
    return 0
  }
}


module.exports = User