/**
 * 关于游戏运行环境
 * 基于nodejs vm实现
 */
const vm = require('vm')

var _gameId = ''
var _config = config
var _jsCode = jsCode
var _userList = []
var _inited = false

function Engine(gameId, roomId, ownerId, config, jsCode) {
  _gameId = gameId
  _config = config
  _jsCode = jsCode
  
  this.name = roomId
  this.master = ownerId
  this.fps = 0
  this.duration = 0
  this.usernum = 0
  this.userlimit = 0
  this.matchfieldname = ''
  this.matchrule = ''

  // 沙箱对象
  this.sandbox = {Print: logger.log, room:this}
}

/**
 * 初始化engine
 */
Engine.prototype.init = function() {
  if(_inited) return true
  if(!_initProperty(_gameId, _config)) {
    return false
  }
  vm.createContext(this.sandbox)
  try {
    const code = _codeWrap(_jsCode)
    vm.runInContext(code, this.sandbox)
  } catch(e) {
    logger.error("run vm error:", e)
  }

  _inited = true
  return true
}

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
  let roomDefine = config.room_define.common
  this.fps = roomDefine.fps
  this.duration = roomDefine.duration
  this.userlimit = roomDefine.user_limit
  this.matchfieldname = roomDefine.match_field_name
  this.matchrule = roomDefine.match_rule
  this.usernum = 0
  _userList = []
  return true
}

/**
 * 对代码进行封装
 */
function _codeWrap(code) {
  let bind = 
`
room.oncreated = oncreated
room.onstart = onstart
room.onclose = onclose
room.onuserin = onuserin
room.onuserout = onuserout
room.onuserevent = onuserevent
`
  return code + bind
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
}

/**
 * 向指定用户发送一条事件
 * @param {string} userid 接收事件的用户ID
 * @param {string} key 
 * @param {string} value 
 */
Engine.prototype.send = function(userid, key, value) {
  logger.debug("向客户端:%s 发送数据%s : %s", userid, key, value)
}

/**
 * 关闭房间
 */
Engine.prototype.close = function() {
  logger.debug("关闭房间")
}