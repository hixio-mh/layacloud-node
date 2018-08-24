/**
 * 关于玩家的管理
 */
const User = require('./user.js')

function UserMgr(game) {
  this.users = new Map()
  this._game = game
}

/**
 * 初始化
 */
UserMgr.prototype.init = function() {
  return true
}

/**
 * 返回玩家总数
 */
UserMgr.prototype.count = function() {
  return this.users.size
}

/**
 * 添加User
 * @param {string} userId 
 * @param {object} user 
 */
UserMgr.prototype.addUser = function(userId, user) {
  this.users.set(userId, user)
}

/**
 * 删除User
 */
UserMgr.prototype.deleteUser = function(userId) {
  logger.debug("||userMgr 删除用户:%s users:", userId, this.users.keys())
  this.users.delete(userId)
}

/**
 * 获取user
 */
UserMgr.prototype.getUser = function(userId) {
  return this.users.get(userId)
}

/**
 * 获取玩家房间的user id 列表
 */
UserMgr.prototype.getRoomUserList = function(userId) {
  let user = this.getUser(userId)
  if(!user) return []
  let game = user.getGame()
  let roomId = user.roomId
  let room = game.roomMgr.getRoom(roomId)
  return room.getUserList()
}



/**
 * 发送消息
 * @param {string} userId 
 * @param {object} data
 */
UserMgr.prototype.send = function(user, data) {
  let msg = JSON.stringify(data)
  // logger.debug("向玩家:", user, "发送数据:", msg)
  if(typeof user == "string") {
    this._sendSingle(user, msg)
  } else {
    // array
    for(let v of user) {
      this._sendSingle(v, msg)
    }
  }
}

/**
 * 向单个用户发送消息
 */
UserMgr.prototype._sendSingle = function(userId, msg) {
  let user = this.getUser(userId)
  if(!user) {
    logger.warn("send msg but user %s not exists", userId)
    return false
  }
  return user.send(msg)
}



module.exports = UserMgr