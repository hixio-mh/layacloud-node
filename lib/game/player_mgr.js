/**
 * 关于玩家的管理
 */
const Player = require('player.js')

function PlayerMgr() {
  this.players = new Map()
}

PlayerMgr.prototype.count = function() {
  return this.players.size
}

PlayerMgr.prototype.addPlayer = function(playerId, player) {
  this.players.set(playerId, player)
}

PlayerMgr.prototype.getPlayer = function(userId) {
  return this.players.get(userId)
}

module.exports = PlayerMgr