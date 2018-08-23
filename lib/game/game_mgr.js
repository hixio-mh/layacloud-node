/**
 * 游戏管理器
 * 负责：
 *  本节点运行游戏的管理
 *  游戏房间管理
 *  游戏玩家管理
 */
var co = require('co')
const url = require('url')
const cp = require('../common/cpcode2');
const requestAsync = require("../utils/http_util.js");
const Game = require('./game.js')
const matchResut = require('./match_result.js')
const SupervisorHelper = require('../supervisor/supervisor_helper.js')
const PUtil = require("./protocol_util.js")

function GameMgr() {
  this._games = new Map()
  this._codeLoader =  new cp.CodeLoader()
  this.matchResult = matchResut

}

/**
 * 初始化mgr
 */
GameMgr.prototype.init = async function() {
  // 注册ws消息
  app.layaNode.handleWsMessage('room.join',this.onReqRoomJoin.bind(this));
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
  if(!app.gameMgr.matchResult.isLogicRoomByUser(gameId, userId)) {
    logger.warn("非逻辑节点，不能接受玩家的进入请求!")
    return
  }

  await this._doEnter(socket, packet)
  await SupervisorHelper.syncSysEvent(gameId, userId, "enter", packet)
}

/**
 * 监督节点玩家进入房间
 * @param {*} packet 
 */
GameMgr.prototype.onSyncRoomJoin = async function(packet) {
  this._doEnter(null, packet)
}

/**
 * 执行进入游戏逻辑
 * @param {*} socket 
 * @param {*} packet 
 */
GameMgr.prototype._doEnter = async function (socket, packet) {
  let gameId = packet.params.gameid
  let userId = packet.params.userid
  // 加载代码
  if(!this.isGameLoaded(gameId)) {
    if(!await this._loadGame(gameId)) {
      logger.warn("load game %s failed!", gameId)
      return false
    }
  }

  let game = this.getGame(gameId)
  let packetRet = null
  if(await game.enter(userId, packet, socket)) {
    let userList = game.userMgr.getRoomUserList(userId)
    packetRet = PUtil.roomJoined(0, userList)
  } else {
    packetRet = PUtil.roomJoined(-1)
  }
  game.userMgr.send(userId, packetRet)
}

/**
 * 加载代码
 * @param {string} gameId
 */
GameMgr.prototype._loadGame = async function(gameId) {
  try {
    // load latest code
    let code = await this._codeLoader.load(gameId);
    if(!(code && code.config && code.config["default_room"])) {
      logger.error("game %s config file invalid", gameId)
      return false
    }
    let defaultRoom = code.config["default_room"]
    if(!code[defaultRoom]) {
      logger.error("can't find game %s default room code", gameId, defaultRoom)
      return false
    }
    let game = new Game(gameId, code.descriptor.version, code.config, code)
    if(!game.init()){
      return false;
    }
    this._games.set(gameId, game)
    return true
  } catch (error) {
    logger.error("load game js :%s error! %s ", url, error, error.stack)
    return false
  }
}

GameMgr.prototype.requestFile = async function(url) {
  try {
    let reqeustOpts = {
      url: url,
      timeout: 50000,
      headers: {
        'Accept-Language': 'en,zh-CN;q=0.8,zh;q=0.6',
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.104 Safari/537.36'
      }
    };
    return requestAsync(reqeustOpts)
  } catch (error) {
    logger.error("request url :%s error! %s ", url, error.stack)
    return null
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

module.exports = new GameMgr()