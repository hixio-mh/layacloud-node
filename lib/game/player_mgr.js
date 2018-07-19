/**
 * 关于玩家的管理
 */
const Player = require('player.js')

function PlayerMgr() {
  this.clients = new Map()
}

PlayerMgr.prototype.count = function() {
  return this.clients.size
}

PlayerMgr.prototype.addPlayer = function(socket, request) {
  let player = new Player(socket, request)
  this.clients.set()
}