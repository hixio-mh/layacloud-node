/**
 * 某款游戏的房间管理器
 */
const Room = require('./room.js')

function RoomMgr(game) {
  this._game = game
  this._gameMgr = game._gameMgr
  this.rooms = new Map()        // roomId -> room
  this.roomsOwner = new Map()   // ownerId -> roomId
}

RoomMgr.prototype.init = function() {
  return true
}

/**
 *  创建房间
 */
RoomMgr.prototype.createRoom = function(roomId, ownerId, roomName) {
  logger.debug("玩家:%s 创建房间:%s 类型:%s", ownerId, roomId, roomName)
  if(this.getRoom(roomId)) {
    logger.warn("房间:%s 已经存在!", roomId)
    return null
  }
  if(!(roomName in this._game.code)) {
    logger.warn("房间:%s 代码:%s 不存在!", roomId, roomName)
    return null
  }
  let isLogicRoom = this._gameMgr.matchResult.isLogicRoom(roomId)
  let room = new Room(this, roomId, ownerId, roomName, !isLogicRoom)
  if(!room.init()) {
    logger.warn("房间:%s 初始化失败!", roomId)
    return null
  }
  this.rooms.set(roomId, room)
  this.roomsOwner.set(ownerId, roomId)
  return room
}

/**
 * 关闭房间
 */
RoomMgr.prototype.closeRoom = function(roomId) {
  let room = this.getRoom(roomId)
  if(!room) {
    logger.warn("the room is not exist!")
    return false
  }
  if(!room.close()) {
    logger.warn("the room close failed!")
    return false
  }
  this.rooms.delete(roomId)
  this.roomsOwner.delete(room.ownerId)
  return true;
}

/**
 * 玩家进入房间
 */
RoomMgr.prototype.enterRoom = function(roomId, userId) {
  logger.debug("玩家:%s 进入房间:%s", userId, roomId)
  let room = this.getRoom(roomId)
  if(!room) {
    logger.warn("the room is not exist!")
    return false
  }
  let user = this._game.userMgr.getUser(userId)
  if(user.roomId && user.roomId != roomId) {
    logger.warn("玩家:%s 已经进入房间:%s!", userId, user.roomId)
    return false
  }

  if(!room.enterRoom(userId)) {
    logger.warn("玩家:%s 进入房间:%s 内部逻辑报错!", userId, roomId)
    return false
  }
  user.setRoomId(roomId)
  return true;
}

/**
 * 玩家离开房间
 */
RoomMgr.prototype.leaveRoom = function(roomId, userId) {
  let room = this.getRoom(roomId)
  if(!room) {
    logger.warn("the room is not exist!")
    return false
  }
  if(!room.leaveRoom(userId)) {
    logger.warn("leave room failed!")
    return false
  }
  let user= this._game.userMgr.getUser(userId)
  user.setRoomId()
  if(userId == room.ownerId) {
    this.roomsOwner.delete(userId)
  }
  return true
}

/**
 * 获取房间
 */
RoomMgr.prototype.getRoom = function(roomId) {
  return this.rooms.get(roomId)
}

RoomMgr.prototype.isOwnedRoom = function(playerId) {
  return this.roomsOwner.has(playerId)
}

module.exports = RoomMgr