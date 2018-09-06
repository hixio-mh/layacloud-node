/**
 * 游戏管理器
 * 负责：
 *  本节点运行游戏的管理
 *  游戏房间管理
 *  游戏玩家管理
 */
var co = require('co')
const url = require('url')
const GameCode = require('./game_code.js')
const Game = require('./game.js')
const matchResut = require('./match_result.js')
const EnterManager = require('./enter_manager.js')
const SupervisorHelper = require('../supervisor/supervisor_helper.js')
const socketReuse = require('./socket_reuse.js')
const PUtil = require("./protocol_util.js")

function GameMgr() {
  this._games = new Map()
  this._gameCode = new GameCode()
  this.matchResult = matchResut
  this.socketReuse = socketReuse
  this.tryEnterMgr = new EnterManager()
}

/**
 * 初始化mgr
 */
GameMgr.prototype.init = async function() {
  // 注册ws消息
  app.layaNode.handleWsMessage('room.join',this.onReqRoomJoin.bind(this));
  if(!this._gameCode.init()) {
    logger.wanr("game code 对象初始化失败!")
    return false
  }
  return true
}

/**
 * 判断游戏是否已经加载
 * @param {*} gameId 
 */
GameMgr.prototype.isGameLoaded = function(gameId) {
  return this._games.has(gameId)
}

/**
 * 获取game对象
 * @param {*} gameId 
 */
GameMgr.prototype.getGame = function(gameId) {
  return this._games.get(gameId)
}

/**
 * 调试的时候检测数据状态
 * @param {*} gameId 
 */
GameMgr.prototype.inspect2 = function(gameId) {
  let game = this._games.get(gameId)
  if(!game) {
    logger.debug("游戏:%s 不存在！", gameId)
    return
  }

  let result = '\n= game ='
  result += '\n ' + gameId
  result += '\n' + game.userMgr.inspect2()
  result += '\n' + game.roomMgr.inspect2()
  result += '\n' + this.matchResult.inspect2()
  return result
}

/*******************************
 * internal API
 *******************************/

/**
 * 玩家进入房间
 * @param {*} socket 
 * @param {*} request 
 */
GameMgr.prototype.onReqRoomJoin = async function(socket, packet) {
  if(!this._checkPacket(packet)) {
    logger.warn("player enter room packet error!")
    return false
  }

  let gameId = packet.params.gameid
  let userId = packet.params.userid
  logger.debug("收到玩家:%s room.join请求", userId)
  if(!app.gameMgr.matchResult.isLogicRoomByUser(gameId, userId)) {
    logger.warn("非逻辑节点，不能接受玩家的进入请求!")
    return false
  }

  // 进入游戏，回调中添加事件，通知监督节点
  return await this._doEnter(socket, packet, async (err, room) => {
    if(err) {
      logger.info("玩家:%s 进入游戏失败!", userId)
      return
    }
    if(room == "retry") {
      // 稍后自动尝试重新enter
      this.tryEnterMgr.add(socket, packet)
    } else {
      this._trySendRoomJoined(room)
      SupervisorHelper.syncSysEvent(gameId, userId, "sys_enter", packet)
    }
  })
}

/**
 * 监督节点玩家进入房间
 * @param {*} packet 
 */
GameMgr.prototype.onSyncRoomJoin = async function(packet) {
  return this._doEnter(null, packet)
}

/**
 * 执行进入游戏逻辑
 * @param {*} socket 
 * @param {*} packet 
 */
GameMgr.prototype._doEnter = async function (socket, packet, cb) {
  let gameId = packet.params.gameid
  let userId = packet.params.userid
  // 加载代码
  let gameInfo = this._gameCode.getGame(gameId)
  if(!gameInfo) {
    logger.error("加载game:%s 资源失败!", gameId)
    return false
  }
  // 创建game
  let game = this.getGame(gameId)
  if(!game) {
    game = new Game(gameId, gameInfo.version, gameInfo.config, gameInfo.code)
    if(!game.init()){
      logger.warn("游戏:%s 初始化失败!", gameId)
      return false;
    }   
    this._games.set(gameId, game)
  }

  let enterRet = await game.enter(userId, packet, socket)
  let [success] = enterRet
  if(success) {
    let [,room] = enterRet
    if(cb) {
      await cb(null, room)
    }
    return true
  } else {
    if(cb) {
      await cb('enter_failed', null)
    }
    packetRet = PUtil.roomJoined(-1)
    game.userMgr.send(userId, packetRet)
    return false
  }
}

/**
 * 检测packet
 * @param {*} packet 
 */
GameMgr.prototype._checkPacket = function(packet) {
  // logger.debug("enter packet:", packet)
  let params = packet.params
  if(!params.userid) {
    return false
  }
  // FIXME: 先临时设置params.token
  if(!params.token) {
    params.token = "fixme"
  }
  let st = params.gameid && params.roomname && params.userid && params.token
  return !!st
}

/**
 * 等待房间人员到齐时发送room.joined消息
 */
GameMgr.prototype._trySendRoomJoined = function(room) {
  let list = room.getUserList()
  let listExpect = app.gameMgr.matchResult.getUserIdList(room.id)
  // logger.debug("房间:%s \n当前用户列表:", room.id, list, "\n期待用户列表:", listExpect)
  let set = new Set(list)
  let setExpect = new Set(listExpect)
  if(eqSet(set, setExpect)) {
    let packetRet = PUtil.roomJoined(0, list)
    logger.debug("人员到齐向用户:", list, "发送room.joined消息:\n", app.inspect(packetRet))
    room.send(list, packetRet)
  }
}

/**
 * 判断set是否相等
 * @param {*} as 
 * @param {*} bs 
 */
function eqSet(as, bs) {
  if (as.size !== bs.size) return false;
  for (var a of as) if (!bs.has(a)) return false;
  return true;
}

module.exports = new GameMgr()