/**
 * 关于游戏运行环境
 * 基于nodejs vm实现
 */
const vm = require('vm')

/// 隐藏的私有变量
var _game = null
var _room = null
var _userList = []
var _inited = false

function Engine(game, room) {
  _game = game
  _room = room
  

  // 沙箱对象
  let engineAdapter = {}
  engineAdapter.getuserid = this.getuserid.bind(this)
  engineAdapter.getuserdata = this.getuserdata.bind(this)
  engineAdapter.saveuserdata = this.saveuserdata.bind(this)
  engineAdapter.broadcast = this.broadcast.bind(this)
  engineAdapter.send = this.send.bind(this)
  engineAdapter.close = this.close.bind(this)

  this.sandbox = {Print: logger.log, engine:engineAdapter}
}

/**
 * 初始化engine
 */
Engine.prototype.init = function() {
  if(_inited) return true
  if(!_initProperty(_game.id, _game.config)) {
    return false
  }
  vm.createContext(this.sandbox)
  try {
    const code = _codeWrap(_game.jsCode)
    vm.runInContext(code, this.sandbox)
  } catch(e) {
    logger.error("run vm error:", e)
  }

  _inited = true
  return true
}

/**
 * 获取所有的user id 列表
 * @returns array
 */
Engine.prototype.getuserid = function() {
  return _userList;
}

/**
 * 获取用户数据，参数为用户ID
 */
Engine.prototype.getuserdata = function(id) {
  _game.engineData.getuserdata(id)
}

/**
 * 保存用户数据 
 * @param {string} id 
 */
Engine.prototype.saveuserdata = function(id) {
  _game.engineData.saveuserdata(id)
}

/**
 * 向房间内用户广播一条消息
 * @param {string} data 
 */
Engine.prototype.broadcast = function(data) {
  logger.debug("广播数据给所有的客户端", data)
  _game.userMgr.send(_userList, data)
}

/**
 * 向指定用户发送一条事件
 * @param {string} userid 接收事件的用户ID
 * @param {string} key 
 * @param {string} value 
 */
Engine.prototype.send = function(userid, key, value) {
  logger.debug("向客户端:%s 发送数据%s : %s", userid, key, value)
  let msg = {"key": key, "value": value}
  _game.userMgr.send(userid, msg)
}

/**
 * 主动关闭房间
 */
Engine.prototype.close = function() {
  logger.debug("关闭房间")
  _game.roomMgr.closeRoom(_room.id)
}

/**
 * 处理房间关闭的清理工作
 */
Engine.prototype.doclose = function() {
  for(let v of _userList) {
    // TODO
    let user = _game.userMgr.getUser(v)
    user._logout()
  }
}

/**
 * 当收到client消息
 */
Engine.prototype.onClientMsg = function(userId, key, value) {
  // same as this.onuserevent
  this.sandbox.engine.onuserevent(userId, key, value)
}

/**
 * 当玩家进入
 * TODO 如何防止不被engine内开发者调用
 * @param {string} userId 
 * @param {object} data 
 */
Engine.prototype.enterRoom = function(userId, data) {
  if(_userList.indexOf(userId) != -1) {
    return false
  }
  _userList.push(userId)
  this.sandbox.engine.usernum = _userList.length
  this.sandbox.engine.onuserin(userId, data)
  return true
}

/**
 * 当玩家离开
 * TODO 如何防止不被engine内开发者调用
 */
Engine.prototype.leaveRoom = function(userId) {
  let index = _userList.indexOf(userId)
  if(index == -1) {
    return false
  }
  _userList.splice(index, 1)
  this.sandbox.engine.usernum = _userList.length
  this.sandbox.engine.onuserout(userId)
  return true
}

/**
 * 获取房间的用户数
 */
Engine.prototype.getUserCount = function() {
  return this.sandbox.engine.usernum
}

/*******************************
 * internal API
 *******************************/

/**
 * 初始化成员变量
 */
function _initProperty(gameId, config) {
  if(!(config && config.room_define && config.room_define.common)) {
    logger.error("game %s config.json defined invalid!", gameId)
    return false
  }
  if(gameId != config.game_id) {
    logger.warn("gameId mismatch game_id in config!")
    return false
  }
  let engine = this.sandbox.engine
  let roomDefine = config.room_define.common

  engine.name = _room.id
  engine.master = _room.ownerId
  engine.fps = roomDefine.fps
  engine.duration = roomDefine.duration
  engine.userlimit = roomDefine.user_limit
  engine.matchfieldname = roomDefine.match_field_name
  engine.matchrule = roomDefine.match_rule
  engine.usernum = 0

  _userList = []
  return true
}

/**
 * 对代码进行封装
 */
function _codeWrap(code) {
  let bind = 
`
engine.oncreated = oncreated
engine.onstart = onstart
engine.onclose = onclose
engine.onuserin = onuserin
engine.onuserout = onuserout
engine.onuserevent = onuserevent
`
  return code + bind
}

module.exports = Engine