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
   logger.debug("玩家:%s 进入游戏", userId)
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
    console.log('[Game:Enter]更新用户的socket');
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
    if(user.roomId) {
      logger.warn("玩家:", userId, "has entered other room!", user.roomId)
      return [false]
    }
    let ownerId = matchResult.getRoomMaster(roomId)
    // TODO: 匹配成功后，客户端提交的room.join协议中roomname为room id，先通过一些拙劣的判断解决
    roomName = this._convertRoomName(roomName)
    logger.debug("玩家:%s 创建房间:%s roomName:%s 设置master为:%s", userId, roomId, roomName, ownerId)
    if(!this.roomMgr.createRoom(roomId, ownerId, roomName)) {
      logger.warn("玩家:%s 创建房间:%s 失败!", userId, roomId)
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

/**
 * 转化room name
 * @param {string} roomName
 */
Game.prototype._convertRoomName = function(roomName) {
  if(roomName.length == "04f721fc4cd7725ac92ac2d35c495047".length) {
    let [name] = Object.keys(this.config["room_define"])
    return name
  } else {
    return roomName
  }
}

module.exports = Game