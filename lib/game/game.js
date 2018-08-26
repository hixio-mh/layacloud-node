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

function Game(gameId, version, config, code) {
  this.id = gameId
  this.version = version
  this.config = config
  this.code = code
  this.roomMgr = new RoomMgr(this)
  this.userMgr = new UserMgr(this)
  this.engineData = new EngineData(this)
  logger.debug("构造game: %s version: %s", gameId, version)
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
Game.prototype.enter = async function(userId, packet, socket) {
  // logger.debug("玩家:%s 进入游戏", userId)
  let roomName = packet.params.roomname
  let user = this.userMgr.getUser(userId)
  if(!user) {
    user = new User(this, userId, socket)
    if(user.init()) {
      this.userMgr.addUser(userId, user)
    } else {
      logger.warn("玩家:%s 初始化失败!", userId)
    }
  } else {
    user.updateSocket(socket)
  }
 
  let matchResult = app.gameMgr.matchResult
  let roomId = matchResult.getRoomId(this.id, userId)
  if(!roomId) {
    logger.warn("can't find user's room info! userId:", userId)
    return [false]
  }
  // 判断roomName是否一致
  let roomNameSaved = matchResult.getRoomName(roomId)
  if(roomNameSaved != undefined && roomName != roomNameSaved) {
    logger.warn("用户请求进入房间类型:%s 而此时房间:%s 的类型为:%s，稍后重试...", roomName, roomId, roomNameSaved)
    return [true, "retry"]
  }

  let room = this.roomMgr.getRoom(roomId)
  if(!room) {
    // 新房间
    if(this.roomMgr.isOwnedRoom(userId)) {
      logger.warn("玩家:", userId, "has already owned room!")
      return [false]
    }
    if(user.roomId) {
      logger.warn("玩家:", userId, "has entered other room!", user.roomId)
      return [false]
    }
    if(!this.roomMgr.createRoom(roomId, userId, roomName)) {
      logger.warn("玩家:", userId, "create room", roomId, "fialed")
      return [false]
    }
    let ret = await this.roomMgr.enterRoom(roomId, userId)
    matchResult.setRoomName(roomId, roomName)
    room = this.roomMgr.getRoom(roomId)
    return [ret, room]
  } else {
    // 房间已经存在，加入
    let ret = await this.roomMgr.enterRoom(roomId, userId)
    return [ret, room]
  }
}

module.exports = Game