/**
 * 玩家重试登录管理器
 */
const later = require("later")

function EnterManager() {
  this._users = new Map()
  later.date.localTime()
}

/**
 * 添加一个新的重试登录
 * @param {*} socket 
 * @param {*} packet 
 */
EnterManager.prototype.add = function(socket, packet) {
  let gameId = packet.params.gameid
  let userId = packet.params.userid
  logger.debug("玩家:%s 加入重试登录管理器", userId)
  let key = _genKey(gameId, userId)
  if(this._users.has(key)) {
    return true
  }

  let sched = later.parse.recur()
    .every(30).second()
  let timer = later.setInterval(() => {
    this._retryEnter(gameId, userId)
  },  sched)
  let count = 0
  this._users.set(key, {socket, packet, timer, count})
}

/**
 * 删除一个重试
 */
EnterManager.prototype.delete = function(gameId, userId) {
  let key = _genKey(gameId, userId)
  this._users.get(key)
}

/*******************
 * internal API
 *******************/
EnterManager.prototype._retryEnter = async function(gameId, userId) {
  let key = _genKey(gameId, userId)
  logger.debug("游戏:%s 玩家:%s 准备重新尝试登录!", gameId, userId)
  let elem = this._users.get(key) 
  if(elem) {
    let {socket, packet, timer, count} = elem
    let success = await app.gameMgr.onReqRoomJoin(socket, packet)
    count++
    if(success || count >= 3) {
      logger.debug("游戏:%s 玩家:%s 登录成功或超过重试次数清理!", gameId, userId)
      timer.clear()
      this.delete(gameId, userId)
      return
    }
    let elemNew = {socket, packet, timer, count}
    // logger.debug("新的elem:", elemNew)
    this._users.set(key, elemNew)
  }
}

/**
 * 生成key
 * @param {*} gameId 
 * @param {*} userId 
 */
function _genKey(gameId, userId) {
  return gameId + ":" + userId
}

module.exports = EnterManager