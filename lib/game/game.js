/**
 * 游戏实体
 * 负责：
 *  游戏代码管理
 *  游戏房间管理
 *  游戏玩家管理
 */
const RoomMgr = require('./room_mgr.js')
const PlayerMgr = require('./player_mgr.js')

function Game(gameId, version, JsCode) {
  this.id = gameId
  this.version = version
  this.jsCode = JsCode
  this.roomMgr = new RoomMgr(gameId)
  this.playerMgr = new PlayerMgr(gameId)
}

Game.prototype.init = function() {
  if(!this.roomMgr.init()) {
    logger.error("room mgr init error!")
    return false
  }
  if(!this.playerMgr.init()) {
    logger.error("player mgr init error!")
    return false
  }
  return true
}

/**
 * 玩家进入游戏
 * 
 * @param {*} userId 
 */
Game.prototype.enter = function(userId) {

}
