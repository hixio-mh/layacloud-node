/**
 * 关于游戏运行环境
 * 基于nodejs vm实现
 */
const vm = require('vm')

/// 隐藏的私有变量
var _game = null
var _room = null
var _inited = false
var _runUpdateLoop = false

function Engine(game, room, roomName) {
  _game = game
  _room = room
  this._userList = []

  // 沙箱对象
  let engineAdapter = {}
  engineAdapter.getuserid = this.getuserid.bind(this)
  engineAdapter.getuserdata = this.getuserdata.bind(this)
  engineAdapter.saveuserdata = this.saveuserdata.bind(this)
  engineAdapter.broadcast = this.broadcast.bind(this)
  engineAdapter.send = this.send.bind(this)
  engineAdapter.close = this.close.bind(this)
  engineAdapter.startupdate = this.startupdate.bind(this)
  engineAdapter.stopupdate = this.stopupdate.bind(this)

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
    const code = _codeWrap(_game.code[this.roomName])
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
  return this._userList;
}

/**
 * 获取用户数据，参数为用户ID
 */
Engine.prototype.getuserdata = function(id) {
  _game.engineData.getUserData(id)
}

/**
 * 保存用户数据 
 * @param {string} id 
 */
Engine.prototype.saveuserdata = function(id) {
  _game.engineData.saveUserData(id)
}

/**
 * 添加房间数据
 * @param {string} key 
 * @param {string} value 
 */
Engine.prototype.addroomdata = function(key, value) {
  _game.engineData.addRoomData(_room.id, key, value)
}

/**
 * 获取房间的所有数据
 */
Engine.prototype.getroomdata = function() {
  _game.engineData.getRoomData(_room.id)
}

/**
 * 向房间内用户广播一条消息
 * @param {string} data 
 */
Engine.prototype.broadcast = function(data) {
  logger.debug("广播数据给所有的客户端", data)
  _room.send(this._userList, data)
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
  _room.send(userid, msg)
}

/**
 * 主动关闭房间
 */
Engine.prototype.close = function() {
  logger.debug("engine关闭房间")
  _game.roomMgr.closeRoom(_room.id)
}

/**
 * 启动定期update函数
 */
Engine.prototype.startupdate = function() {
  _runUpdateLoop = true
  function ontimeout() {
    logger.debug("startupdate on timeout!")
    if(this.sandbox.engine.onupdate) {
      this.sandbox.engine.onupdate()
    }
    if(_runUpdateLoop) {
      setTimeout(ontimeout.bind(this), 1000)
    }
  }
  setTimeout(ontimeout.bind(this), 1000)
}

/**
 * 结束定期update函数
 */
Engine.prototype.stopupdate = function() {
  _runUpdateLoop = false
}

/**
 * 处理房间关闭的清理工作
 */
Engine.prototype.onclose = function() {
  logger.debug("||||room engine close!")
  this._userList = []
  this.sandbox.engine.usernum = 0
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
  if(this._userList.indexOf(userId) != -1) {
    return false
  }
  this._userList.push(userId)
  this.sandbox.engine.usernum = this._userList.length
  this.sandbox.engine.onuserin(userId, data)
  return true
}

/**
 * 当玩家离开
 */
Engine.prototype.leaveRoom = function(userId) {
  let index = this._userList.indexOf(userId)
  if(index == -1) {
    return false
  }
  this._userList.splice(index, 1)
  this.sandbox.engine.usernum = this._userList.length
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
  this._userList = []
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
engine.onupdate = onupdate
`
  return code + bind
}

module.exports = Engine