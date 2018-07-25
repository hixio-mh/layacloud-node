/**
 * 关于玩家的管理
 */
const User = require('./user.js')

function UserMgr(game) {
  this.users = new Map()
  this._game = game
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
 * 获取user
 */
UserMgr.prototype.getUser = function(userId) {
  return this.users.get(userId)
}

/**
 * 发送消息
 * @param {string} userId 
 * @param {object} data
 */
UserMgr.prototype.send = function(user, data) {
  let msg = JSON.stringify(data)
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