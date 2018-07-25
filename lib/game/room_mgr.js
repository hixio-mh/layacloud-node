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
RoomMgr.prototype.createRoom = function(roomId, ownerId) {
  if(this.getRoom(roomId)) {
    logger.warn("the room with this roomId is exist!")
    return null
  }
  let room = new Room(this._game, roomId, ownerId)
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
  let room = this.getRoom(roomId)
  if(!room) {
    logger.warn("the room is not exist!")
    return false
  }
  let player = this.game.playerMgr.getPlayer(userId)
  if(player.roomId != roomId) {
    logger.warn("the player has entered other room!", player.roomId)
    return false
  }

  if(!room.enterRoom(userId)) {
    logger.warn("enter room failed!")
    return false
  }
  player.setRoomId(roomId)
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
  player.setRoomId(0)
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