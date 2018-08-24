/**
 * 某款游戏的房间管理器
 */
const Room = require('./room.js')

function RoomMgr(game) {
  this._game = game
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
  // TODO: 匹配成功后，客户端提交的room.join协议中roomname为room id，先通过一些拙劣的判断解决
  roomName = this._convertRoomName(roomName)
  if(!(roomName in this._game.code)) {
    logger.warn("房间:%s 代码:%s 不存在!", roomId, roomName)
    return null
  }
  let isLogicRoom = app.gameMgr.matchResult.isLogicRoom(roomId)
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
  logger.debug("roomMgr关闭房间:%s", roomId)
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
  this.roomsOwner.delete(room.ownerId)
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
  return true;
}

/**
 * 玩家离开房间
 * 最 起始 的离开房间调用入口
 */
RoomMgr.prototype.leaveRoom = function(roomId, userId, reason = 0) {
  logger.debug("roomMgr 玩家:%s 离开房间:%s", userId, roomId)
  let room = this.getRoom(roomId)
  if(!room) {
    logger.warn("roomMgr 房间:%s 不存在!", roomId)
    return false
  }
  if(!room.leaveRoom(userId, reason)) {
    logger.warn("roomMgr 离开房间失败!")
    return false
  }
  let user = this._game.userMgr.getUser(userId)
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

/**
 * 转化room name
 * @param {string} roomName
 */
RoomMgr.prototype._convertRoomName = function(roomName) {
  if(roomName.length == "04f721fc4cd7725ac92ac2d35c495047".length) {
    let [name] = Object.keys(this._game.config["room_define"])
    return name
  } else {
    return roomName
  }
}

module.exports = RoomMgr