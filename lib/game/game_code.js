/**
 * game code 管理器
 * 
 */
const later = require('later')
const moment = require('moment')
const cp = require('../common/cpcode2');

// 刷新间隔(ms)
const REFRESH_TIME = 30 * 1000

class GameCode {
  constructor() {
    this._games = new Map()
    this._codeLoader =  new cp.CodeLoader()
    this._refreshTimer = null
  }

  /**
   * 初始化
   */
  init() {
    let sched = later.parse.recur()
      .every(5).second()
    // 定期刷新code timer
    this._refreshTimer = later.setInterval(() => {
      this._refreshCode()
    },  sched)
    return true
  }

  /**
   * 停止
   */
  stop() {
    if(this._refreshTimer) {
      this._refreshTimer.clear()
      this._refreshTimer = null
    }
  }

  /**
   * 获取game 代码
   * @param {*} gameId
   */
  async getGame(gameId) {
    if(this.isGameLoaded(gameId)) {
      return this._games.get(gameId)
    }
    if(!await this._retryLoadGame(gameId, 2)) {
      logger.error("多次加载game:%s 资源失败!", gameId)
      return null
    }
    return this._games.get(gameId)
  }

  /**
   * 判断游戏代码是否加载
   * @param {*} gameI
   */
  isGameLoaded(gameId) {
    return this._games.has(gameId)
  }

  /**
   * 重复加载代码
   * @param {string} gameId
   */
  async _retryLoadGame(gameId) {
    let retry = 0
    while(retry < 2) {
      if(await this._loadGame(gameId)) {
        return true
      }
      retry++
    }
    return false
  }

  /**
   * 加载代码
   * @param {string} gameId
   */
  async _loadGame(gameId) {
    try {
      // load latest code
      let code = await this._codeLoader.load(gameId);
      if(!(code && code.config && code.config["default_room"])) {
        logger.error("游戏:%s config不合法", gameId)
        return false
      }
      let defaultRoom = code.config["default_room"]
      if(!code[defaultRoom]) {
        logger.error("游戏:%s 无法找到默认房间:%s 代码", gameId, defaultRoom)
        return false
      }
      let version = code.descriptor.version
      let config = code.config
      let time = moment().valueOf()
      let game = {id:gameId, version, config, code, time}
      this._games.set(gameId, game)
      logger.debug("加载游戏:%s 代码成功!", gameId)
      return true
    } catch (error) {
      logger.error("加载游戏游戏代码:%s 出错! %s ", url, error, error.stack)
      return false
    }
  }

  async requestFile(url) {
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
   * 刷新代码
   */
  async _refreshCode() {
    for(let [key, val] of this._games.entries()) {
      let now = moment().valueOf()
      if(now - val.time > REFRESH_TIME) {
        logger.debug("游戏:%s 的代码缓存超过%d，需重新加载", key, REFRESH_TIME/1000)
        await this._retryLoadGame(key, 2)
      }
    }
  }
}

module.exports = GameCode