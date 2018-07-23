/**
 * 房间定义
 * 下划线开头的成员变量及函数不建议直接使用
 */
const Engine = require("../engine/engine.js")

function Room(game, roomId, ownerId) {
  this.game = game
  this.id = roomId
  this.gameId = game.id
  this.ownerId = ownerId

  // 房间对应的engine
  this.engine = new Engine(gameId, roomId, ownerId, this.game.config, this.game.jsCode)
}

Room.prototype.init = function() {
  return this.engine.init()
}

module.exports = Room