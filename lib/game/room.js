/**
 * 房间定义
 * 下划线开头的成员变量及函数不建议直接使用
 */
const Engine = require("../engine/engine.js")

function Room(game, roomId, ownerId, roomName) {
  this._game = game
  this.id = roomId
  this.gameId = game.id
  this.ownerId = ownerId
  this.roomName = roomName

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
  this._engine.doclose()
}

/**
 * 玩家进入room
 * @param {string} userId
 */
Room.prototype.enterRoom = function(userId) {
  // TODO data为用户数据
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

module.exports = Room