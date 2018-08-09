/**
 * 游戏实体
 * 负责：
 *  游戏代码管理
 *  游戏房间管理
 *  游戏玩家管理
 */
const RoomMgr = require('./room_mgr.js')
const UserMgr = require('./user_mgr.js')
const User = require('./user.js')
const EngineData = require('../engine/engine_data.js')

function Game(mgr, gameId, version, config, code) {
  this._gameMgr = mgr
  this.id = gameId
  this.version = version
  this.config = config
  this.code = code
  this.roomMgr = new RoomMgr(this)
  this.userMgr = new UserMgr(this)
  this.engineData = new EngineData()
  logger.debug("构造game: %s version: %s config:", gameId, version, config)
}

/**
 * 初始化
 */
Game.prototype.init = function() {
  if(!this.roomMgr.init()) {
    logger.error("room mgr init error!")
    return false
  }
  if(!this.userMgr.init()) {
    logger.error("user mgr init error!")
    return false
  }
  return true
}

/**
 * 玩家进入游戏
 * @param {*} userId 
 */
Game.prototype.enter = function(userId, packet, socket) {
  logger.debug("玩家:%s 进入游戏", userId)
  let user = this.userMgr.getUser(userId)
  if(!user) {
    user = new User(this, userId, socket)
    this.userMgr.addUser(userId, user)
  }

  let roomId = this._gameMgr.matchResult.getRoomId(userId)
  if(!roomId) {
    logger.warn("can't find user's room info! userId:", userId)
    return false
  }

  let room = this.roomMgr.getRoom(roomId)
  if(!room) {
    // 新房间
    if(this.roomMgr.isOwnedRoom(userId)) {
      logger.warn("user", userId, "has already owned room!")
      return false
    }
    if(user.roomId != 0) {
      logger.warn("user", userId, "has entered other room!", user.roomId)
      return false
    }
    if(!this.roomMgr.createRoom(roomId, userId, packet.params.roomname)) {
      logger.warn("user", userId, "create room", roomId, "fialed")
      return false
    }
    return this.roomMgr.enterRoom(roomId, userId)
  } else {
    // 房间已经存在，加入
    return this.roomMgr.enterRoom(roomId, userId)
  }
}

module.exports = Game