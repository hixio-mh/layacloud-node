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
  this.roomMgr = new RoomMgr(this)
  this.playerMgr = new PlayerMgr(this)
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
Game.prototype.enter = function(userId, socket, request, args) {
  let player = this.playerMgr.getPlayer(userId)
  if(!player) {
    player = new Player(userId, socket, request)
    this.playerMgr.addPlayer(userId, player)
  }

  if(!(args && args.length > 0)) {
    logger.warn("player login ws url don't has room info")
    return false
  }
  let [roomId] = args
  let room = this.roomMgr.getRoom(roomId)
  if(!room) {
    // 新房间
    if(this.roomMgr.isOwnedRoom(userId)) {
      logger.warn("player", userId, "has already owned room!")
      return false
    }
    if(player.roomId != 0) {
      logger.warn("player", userId, "has entered other room!", player.roomId)
      return false
    }
    if(!this.roomMgr.createRoom(roomId, userId)) {
      logger.warn("player", userId, "create room", roomId, "fialed")
      return false
    }
    return this.roomMgr.enterRoom(roomId, userId)
  } else {
    // 房间已经存在，加入
    return this.roomMgr.enterRoom(roomId, userId)
  }
}
