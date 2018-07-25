/**
 * 房间定义
 * 下划线开头的成员变量及函数不建议直接使用
 */
const Engine = require("../engine/engine.js")

function Room(game, roomId, ownerId) {
  this._game = game
  this.id = roomId
  this.gameId = game.id
  this.ownerId = ownerId

  // 房间对应的engine
  this._engine = new Engine(game, roomId, ownerId)
}

/**
 * room 初始化
 */
Room.prototype.init = function() {
  return this._engine.init()
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