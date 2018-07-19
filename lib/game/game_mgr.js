/**
 * 游戏管理器
 * 负责：
 *  本节点运行游戏的管理
 *  游戏房间管理
 *  游戏玩家管理
 */
const url = require('url')
const requestAsync = require("../utils/http_util.js");
const Game = require('game.js')

function GameMgr() {
  this.games = new Map()
}

/**
 * 玩家进入游戏
 * @param {*} socket 
 * @param {*} request 
 */
GameMgr.prototype.enter = async function(socket, request) {
  let [valid, gameId, userId] = this.parseEnterUrl(request.url)
  if(!valid) {
    logger.warn("player enter with bad url!")
    return false
  }
  // load game code
  if(!this.isGameLoaded(gameId)) {
    if(!await this.loadGame(gameId)) {
      logger.warn("load game failed!")
      return false
    }
  }
  let game = this.getName(gameId)
  game.enter(userId)
}

GameMgr.prototype.parseEnterUrl = function(url) {
  let q = url.parse(url)
  let parts = q.path.split("/")
  if(parts.length < 3) {
    return [false]
  }
  let [, gameId, userId] = parts
  // TODO 检测game Id是否合法
  // TODO 判断user签名
  return [true, gameId, userId]
}

GameMgr.prototype.isGameLoaded = function(gameId) {
  return this.games.has(gameId)
}

GameMgr.prototype.getName = function(gameId) {
  return this.games.get(gameId)
}

GameMgr.prototype.loadGame = async function(gameId) {
  // TODO
  let url = "http://localhost/" + gameId + "-latest.js"
  try {
    let reqeustOpts = {
      url: url,
      timeout: 50000,
      headers: {
        'Accept-Language': 'en,zh-CN;q=0.8,zh;q=0.6',
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.104 Safari/537.36'
      }
    };
    let js = await requestAsync(reqeustOpts)
    let [valid, version, jsCode] = this.parseGameJs(js)
    if(!valid) {
      logger.error("check game js error!")
      return false
    }
    let game = new Game(gameId, version, jsCode)
    if(!game.init()){
      return false;
    }
    this.games.set(gameId, game)
    return true
  } catch (error) {
    logger.error("load game js :%s error! %s ", url, error, error.stack)
    return false
  }
}

GameMgr.prototype.parseGameJs = function(js) {
  // TODO
  return [true, "0.1", js]
}
