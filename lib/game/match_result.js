/**
 * 记录用户和房间的匹配映射关系
 */
function MatchResult() {
  this._user2room = new Map()       // gameid+userid -> room_hash
  this._roomMap = new Map()         // room_hash -> {"gameId", "userIdList": [userid], "supNodeList": []}
  this._room2type = new Map()       // room_hash -> consts.ROOM_WORK_TYPE
  this._user2workType = new Map()   // +userid -> consts.ROOM_WORK_TYPE
}

/**
 * 保存映射结果
 * @param {*} roomHash 
 * @param {*} gameId
 * @param {*} userIdList 
 * @param {*} supNodeList
 */
MatchResult.prototype.storeResult = function(roomHash, gameId, userIdList, supNodeList) {
  if(!roomHash || !userIdList || !Array.isArray(userIdList)) {
    logger.warn("match result store args bad! roomHash", roomHash, "userIdList", userIdList)
    return false
  }

  this._roomMap.set(roomHash, {gameId, userIdList, supNodeList})
  for(let u of userIdList) {
    this._user2room.set(_genGameUserKey(gameId, u), roomHash)
  }
  return true
}

/**
 * 当房间结束时，删除对应的房间映射关系
 * @param {*} roomHash 
 */
MatchResult.prototype.deleteResult = function(roomHash) {
  if(this._roomMap.has(roomHash)) {
    return false;
  }
  let {gameId, userIdList} = this._roomMap.get(roomHash)
  if(!userIdList) {
    return false
  }
  this._roomMap.delete(roomHash)
  for(let u of userIdList) {
    this._user2room.delete(_genGameUserKey(gameId, u))
  }
  return true
}

/**
 * 获取监督节点列表
 * @param {*} roomHash 
 */
MatchResult.prototype.getSupNodeList = function(roomHash) {
  if(!this._roomMap.has(roomHash)) {
    return null;
  }
  let {supNodeList} = this._roomMap.get(roomHash)
  return supNodeList
}

/**
 * 获取用户的room id
 * @param {*} userId 
 */
MatchResult.prototype.getRoomId = function(gameId, userId) {
  return this._user2room.get(_genGameUserKey(gameId, userId))
}

/**
 * 获取房间的userid list
 */
MatchResult.prototype.getUserIdList = function(roomId) {
  return this._roomMap.get(roomId)
}

/**
 * 设置房间的角色
 * @param {string} roomId 
 * @param {string} workType 
 */
MatchResult.prototype.setRoomWorkType = function(roomId, workType) {
  if(!roomId || !workType) {
    return false
  }
  this._room2type.set(roomId, workType)
  return true
}

/**
 * 删除房间的角色信息
 * @param {*} roomId 
 */
MatchResult.prototype.deleteRoomWorkType = function(roomId) {
  this._room2type.delete(roomId)
}

/**
 * 获取房间的角色
 * @param {*} roomId 
 */
MatchResult.prototype.getRoomWorkType = function(roomId) {
  return this._room2type.get(roomId)
}

/**
 * 判断是否为逻辑房间 (另一种为监督房间)
 * @param {*} roomId 
 */
MatchResult.prototype.isLogicRoom = function(roomId) {
  return this.getRoomWorkType(roomId) == app.consts.ROOM_WORK_TYPE.LOGIC
}

/*******************
 * 关于节点的角色分配
 *******************/

/**
 * 根据用户设置room work type信息
 * @param {*} userId 
 * @param {*} workType
 */
MatchResult.prototype.setRoomWorkTypeByUser = function(gameId, users, workType) {
  for(let u of users) {
    let key = _genGameUserKey(gameId, u)
    this._user2workType.set(key, workType)
    logger.debug("设置游戏玩家work类型，key:%s work info:", key, workType)
  }
}

/**
 * 根据用户获取room的work type信息
 * @param {*} gameId 
 * @param {*} userId 
 */
MatchResult.prototype.getRoomWorkTypeByUser = function(gameId, userId) {
  let key = _genGameUserKey(gameId, userId)
  logger.debug("获取游戏玩家work类型，key:%s", key)
  return this._user2workType.get(key)
}

/**
 * 判断房间是否为逻辑房间
 * @param {*} gameId 
 * @param {*} userId 
 */
MatchResult.prototype.isLogicRoomByUser = function(gameId, userId) {
  let workType = this.getRoomWorkTypeByUser(gameId, userId)
  return workType == app.consts.ROOM_WORK_TYPE.LOGIC
}

/**
 * 删除房间的角色信息
 * @param {*} roomId 
 */
MatchResult.prototype.deleteRoomWorkTypeByUser = function(gameId, userId) {
  let key = _genGameUserKey(gameId, userId)
  this._user2workType.delete(key)
}

/**
 * 生成game+user唯一key
 * @param {*} gameId 
 * @param {*} userId 
 */
function _genGameUserKey (gameId, userId) {
  return gameId + ":" + userId
}


module.exports = new MatchResult