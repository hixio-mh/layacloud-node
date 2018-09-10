/**
 * 某款游戏的房间管理器
 */
const Room = require('./room.js')

function RoomMgr(game) {
  this._game = game
  this.rooms = new Map()        // roomId -> room
}

RoomMgr.prototype.init = function() {
  return true
}

/**
 *  创建房间
 */
RoomMgr.prototype.createRoom = function(roomId, ownerId, roomName) {
  if(this.getRoom(roomId)) {
    logger.warn("房间:%s 已经存在!", roomId)
    return null
  }
  if(!(roomName in this._game.code)) {
    logger.warn("房间:%s 代码:%s 不存在!", roomId, roomName)
    return null
  }
  let isLogicRoom = app.gameMgr.matchResult.isLogicRoom(roomId)
  var room = new Room(this, roomId, ownerId, roomName, !isLogicRoom)
  if(!room.init()) {
    logger.warn("房间:%s 初始化失败!", roomId)
    return null
  }
  this.rooms.set(roomId, room)
  return room
}

/**
 * 关闭房间
 */
RoomMgr.prototype.closeRoom = function(roomId) {
  // logger.debug("roomMgr关闭房间:%s", roomId)
  let room = this.getRoom(roomId)
  if(!room) {
    logger.debug("roomMgr 房间:%s 已不存在!", roomId)
    return true
  }
  if(!room.closeRoom()) {
    logger.warn("roomMgr关闭房间失败!")
    return false
  }
  this.rooms.delete(roomId)
  return true;
}

/**
 * 玩家进入房间
 */
RoomMgr.prototype.enterRoom = async function(roomId, userId) {
  logger.debug("roomMgr 玩家:%s 进入房间:%s", userId, roomId)
  let room = this.getRoom(roomId)
  if(!room) {
    logger.warn("roomMgr 房间不存在!")
    return false
  }
  let user = this._game.userMgr.getUser(userId)
  if(user.roomId && user.roomId != roomId) {
    logger.warn("玩家:%s 已经进入房间:%s!", userId, user.roomId)
    return false
  }

  if(!await room.enterRoom(userId)) {
    logger.warn("玩家:%s 进入房间:%s 内部逻辑报错!", userId, roomId)
    return false
  }
  user.setRoomId(roomId)
  user.setState(app.consts.USER_STATE.ENTERED)
  return true;
}

/**
 * 玩家离开房间
 * 最 起始 的离开房间调用入口
 */
RoomMgr.prototype.leaveRoom = function(roomId, userId, reason = 0) {
  if(!roomId) return false
  logger.debug("roomMgr 玩家:%s 离开房间:%s", userId, roomId)
  let room = this.getRoom(roomId)
  if(!room) {
    logger.info("roomMgr 房间:%s 不存在!", roomId)
    return false
  }
  if(!room.leaveRoom(userId, reason)) {
    logger.info("roomMgr 离开房间失败!")
    return false
  }
  let user = this._game.userMgr.getUser(userId)
  if(!user) {
    logger.info("roomMgr 离开房间失败，user:%s不存在!", userId)
    return false
  }
  user.setRoomId()
  return true
}

/**
 * 获取房间
 */
RoomMgr.prototype.getRoom = function(roomId) {
  return this.rooms.get(roomId)
}

RoomMgr.prototype.isOwnedRoom = function(playerId) {
  return this..has(playerId)
}

/**
 * 输出内部状态
 */
RoomMgr.prototype.inspect2 = function() {
  let result = ''
  result += '\n= room ='
  for(let room of this.rooms.values()) {
    result += '\n' + room.inspect2()
  }
  return result
}

module.exports = RoomMgr