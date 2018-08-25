/**
 * 负责处理engine运行中的数据
 * 保存在内存，同时进行持久化（文件append或者内嵌数据库）
 */
const moment = require('moment')
var CenterHelper = require('../foundation/center_helper.js')

function EngineData(game) {
  this._game = game
  // 房间数据
  this.roomData = {}      // roomid -> object
  this._roomDataMeta = {}
  // 用户数据
  this.userData = {}      // userid -> object
  this._userDataMeta = {}
}

/**
 * 加载用户数据
 * @param {*} userId 
 */
EngineData.prototype.loadUserFromStorage = async function(userId) {
  let data = this.getUserData(userId)
  if(!data) {
    try{
      let cap = app.layaNode.getCapability('logic')
      let data = await cap.read(userId, this._game.id)
      logger.debug("从storage读取用户:%s 数据:", userId, data)
      return this._initUserData(userId, data)
    } catch(e) {
      logger.warn("读取用户:%s 数据报错:", userId, e)
      return null
    }
  }
  return data
}

/**
 * 保存玩家数据到storage
 * @param {array} userList
 */
EngineData.prototype.saveUserToStorage = async function(gameId, userList) {
  logger.debug("保存游戏:%s 用户的数据到storage:", gameId, userList)
  let signersList = await this._doSaveToStorage(gameId, userList)
  if(signersList.length > 0) {
    CenterHelper.on_battle_over_savedone(this.id, signersList[0][1])
  } else {
    logger.warn("保存用户数据时获取room签名信息失败!")
  }
}

/**
 * 获取用户数据
 * @param {string} userId 
 */
EngineData.prototype.getUserData = function(userId) {
  return this.userData[userId]
}

/**
 * 添加用户数据
 * @param {string} userId 
 * @param {string} idx 
 * @param {string} value 
 */
EngineData.prototype.addUserData = function(userId, idx, value) {
  let data = this.getUserData(userId)
  data[idx] = value
  this._trySync(this.userData, userId)
}

/**
 * 保存用户数据
 * @param {string} userId 
 */
EngineData.prototype.saveUserData = function(userId) {
  this._trySync(this.userData, userId, true)
}

/**
 * 获取本房间所有的用户数据
 */
EngineData.prototype.getAllUserData = function() {
  return this.userData
}

/**
 * 删除用户的数据
 * @param {*} userId 
 */
EngineData.prototype.deleteUserData = function(userId) {
  delete this.userData[userId]
  delete this._userDataMeta[userId]
}

/**
 * 删除房间的数据
 * @param {*} roomId 
 */
EngineData.prototype.deleteRoomData = function(roomId) {
  delete this.roomData[roomId]
  delete this._roomDataMeta[roomId]
}

/**
 * 添加房间数据
 * @param {string} roomId 
 * @param {string} key 
 * @param {string} value 
 */
EngineData.prototype.addRoomData = function(roomId, key, value) {
  let data = null
  if(!(roomId in this.roomData)) {
    data = {}
    data[key] = value
    this.roomData[roomId] = data
    this._roomDataMeta[roomId] = {sync:0}
  } else {
    data = this.roomData[roomId]
    data[key] = value
  }
  this._trySync(this.roomData, roomId)
}

/**
 * 获取房间的所有数据
 * @param {string} roomId 
 */
EngineData.prototype.getRoomData = function(roomId) {
  return this.roomData
}

/*********************
 * internal API
 *********************/

/**
 * 尝试数据持久化
 * @param {object} data 
 * @param {string} id 
 */
EngineData.prototype._trySync = function(data, id, force = false) {
  let meta = null
  logger.debug("持久化数据 id:", id, "| 全部data:", data, "force:", force)
  if(data == this.userData) {
    meta = this._userDataMeta[id]
  } else {
    meta = this._roomDataMeta[id]
  }
  let now = moment().valueOf()
  if(force || now - meta.sync >= 2000) {
    // TODO: sync 持久化数据
    meta.sync = now
  }
}

/**
 * 初始化用户数据
 * @param {string} userId
 * @param {*} data
 */
EngineData.prototype._initUserData = function(userId, dataInit) {
  if(!dataInit) {
    dataInit = {}
  }
  let data = Object.assign({}, dataInit)
  this.userData[userId] = data
  this._userDataMeta[userId] = {sync:0}
  return data
}

/**
 * 存储数据到storage
 * 并返回roomid签名
 */
EngineData.prototype._doSaveToStorage = function(gameId, userList) {
  let cap = app.layaNode.getCapability('logic')
  let pAll = userList.map((userId) => {
    let data = this.getUserData(userId)
    if(!data) {
      return Promise.resolve(null)
    }
    return new Promise((resolve, reject) => {
      cap.write(userId, gameId, data, (err, cbData) => {
        if(err) {
          logger.warn("保存用户:%s 数据失败!", userId, err)
          return reject(null)
        }
        //logger.debug("cbdata:", cbData)
        let roomInfo = cbData.room
        resolve([userId, roomInfo.signers])
      })
    })
  })
  return Promise.all(pAll.map(p => p.catch(e => e)))
  .then(inspects => {
    logger.debug("保存数据到storage返回:", inspects)
    let signersList = []
    inspects.forEach(ins => {
      if (ins != null && !(ins instanceof Error)) {
        signersList.push(ins)
      } 
    })  
    return signersList
  })  
}



module.exports = EngineData
