/**
 * 负责处理engine运行中的数据
 * 保存在内存，同时进行持久化（文件append或者内嵌数据库）
 */
const moment = require('moment')

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
EngineData.prototype.saveUserToStorage = async function(userList) {
  let cap = app.layaNode.getCapability('logic')
  for(let u of userList) {
    let data = this.gateUserData(userId)
    if(data) {
      let ret = await cap.write(u, gameId, data, (err) => {
        if(err) {
          logger.warn("保存用户数据失败!", err)
        }
      })
    }
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
  let data = Object.assign({}, dataInit)
  this.userData[userId] = data
  this._userDataMeta[userId] = {sync:0}
  return data
}



module.exports = EngineData