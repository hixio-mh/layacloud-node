/**
 * 房间定义
 */
const Engine = require("../engine/engine.js")

function Room(mgr, roomId, ownerId, roomName, isSupervisor) {
  this._game = mgr._game
  this._roomMgr = mgr
  this.id = roomId
  this.gameId = game.id
  this.ownerId = ownerId
  this.roomName = roomName
  this.isSupervisor = isSupervisor    // 是否为监督节点room

  // 房间对应的engine
  this._engine = new Engine(game, this, roomName)
}

/**
 * room 初始化
 */
Room.prototype.init = function() {
  return this._engine.init()
}

/**
 * room 关闭
 */
Room.prototype.close = function() {
  let userList = this._engine.getuserid()
  for(let v of userList) {
    let user = this._game.userMgr.getUser(v)
    user.doLogout()
  }
  this._engine.onclose()
}

/**
 * 玩家进入room
 * @param {string} userId
 */
Room.prototype.enterRoom = function(userId) {
  // TODO: data为用户数据
  let data = {}
  return this._engine.enterRoom(userId, data)
}

/**
 * 玩家离开room
 * @param {string} userId
 */
Room.prototype.leaveRoom = function(userId) {
  let ret = this._engine.leaveRoom(userId)
  if(!ret) {
    return ret
  }
  if(this._engine.getUserCount() == 0) {
    this._engine.close()
  }
}

/**
 * 当收到client的数据
 * @param {string} userId 
 * @param {string} key 
 * @param {string} value 
 */
Room.prototype.onClientMsg = function(userId, key, value) {
  return this._engine.onClientMsg(userId, key, value)
}

/**
 * 向client发送消息
 * @param {*} user 
 * @param {*} data 
 */
Room.prototype.send = function(user, data) {
  if(!this.isSupervisor) {
    this._game.userMgr.send(user, data)
  } else {
    logger.debug("supervisor room send data to user, do nothing")
  }
}

module.exports = Room