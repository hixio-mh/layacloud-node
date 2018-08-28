/**
 * socket重用记录
 * 因为从对局房间回到大厅socket没有关闭
 */
const uniqid = require('uniqid');
function SocketReuse() {
  this._socketMap = new Map()
}

/**
 * 添加socket进入重用记录
 */
SocketReuse.prototype.add = function(socket) {
  if(!socket) return false
  if(!socket.id) {
    socket.id = uniqid()
  }
  logger.debug("socket id:%s 添加到重用记录", socket.id)
  this._socketMap.set(socket.id, socket)
  return true
}

/**
 * 判断socket是否存在重用
 * @param {*} socket 
 */
SocketReuse.prototype.isExists = function(socket) {
  if(!socket.id) return false
  return this._socketMap.has(socket.id)
}

/**
 * 删除记录
 * @param {*} socket
 */
SocketReuse.prototype.delete = function(socket) {
  if(!socket || !socket.id) return
  logger.debug("socket id:%s 从重用记录删除", socket.id)
  this._socketMap.delete(socket.id)
}

module.exports = new SocketReuse