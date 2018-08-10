/**
 * 记录用户和房间的匹配映射关系
 */
function MatchResult() {
  this._userMap = new Map()   // userid -> room_hash
  this._roomMap = new Map()   // room_hash -> [userid]
  this._roomRole = new Map()  // room_hash -> consts.ROOM_ROLE
  this._roomRoleByUser = new Map()   // 节点房间职责：{gameid, userid} -> consts.ROOM_ROLE
}

/**
 * 保存映射结果
 * @param {*} roomHash 
 * @param {*} userIdList 
 */
MatchResult.prototype.storeResult = function(roomHash, userIdList, supNodeList) {
  if(!roomHash || !userIdList || !Array.isArray(userIdList)) {
    logger.warn("match result store args bad! roomHash", roomHash, "userIdList", userIdList)
    return false
  }

  this._roomMap.set(roomHash, {userIdList, supNodeList})
  for(let u of userIdList) {
    this._userMap.set(u, roomHash)
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
  let {userIdList} = this._roomMap.get(roomHash)
  if(!userIdList) {
    return false
  }
  this._roomMap.delete(roomHash)
  for(let u of userIdList) {
    this._userMap.delete(u)
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
MatchResult.prototype.getRoomId = function(userId) {
  return this._userMap.get(userId)
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
 * @param {string} role 
 */
MatchResult.prototype.setRoomRole = function(roomId, role) {
  if(!roomId || !role) {
    return false
  }
  this._roomRole.set(roomId, role)
  return true
}

/**
 * 删除房间的角色信息
 * @param {*} roomId 
 */
MatchResult.prototype.deleteRoomRole = function(roomId) {
  this._roomRole.delete(roomId)
}

/**
 * 获取房间的角色
 * @param {*} roomId 
 */
MatchResult.prototype.getRoomRole = function(roomId) {
  return this._roomRole.get(roomId)
}

/**
 * 判断是否为逻辑房间 (另一种为监督房间)
 * @param {*} roomId 
 */
MatchResult.prototype.isLogicRoom = function(roomId) {
  return this.getRoomRole(roomId) == app.consts.ROOM_ROLE.LOGIC
}

/**
 * 根据用户设置room role信息
 * @param {*} gameId 
 * @param {*} userId 
 * @param {*} role 
 */
MatchResult.prototype.setRoomRoleByUser = function(gameId, users, role) {
  for(let u of users) {
    let key = _genRoomRoleByUserKey(gameId, u)
    this._roomRoleByUser.set(key, role)
    logger.debug("设置游戏玩家role类型，key:%s role info:", key, role)
  }
}

/**
 * 根据用户获取room的role信息
 * @param {*} gameId 
 * @param {*} userId 
 */
MatchResult.prototype.getRoomRoleByUser = function(gameId, userId) {
  let key = _genRoomRoleByUserKey(gameId, userId)
  logger.debug("获取游戏玩家role类型，key:%s", key)
  return this._roomRoleByUser.get(key)
}

/**
 * 判断房间是否为逻辑房间
 * @param {*} gameId 
 * @param {*} userId 
 */
MatchResult.prototype.isLogicRoomByUser = function(gameId, userId) {
  let role = this.getRoomRoleByUser(gameId, userId)
  return role == app.consts.ROOM_ROLE.LOGIC
}

/**
 * 删除房间的角色信息
 * @param {*} roomId 
 */
MatchResult.prototype.deleteRoomRoleByUser = function(gameId, userId) {
  let key = _genRoomRoleByUserKey(gameId, userId)
  this._roomRoleByUser.delete(key)
}

function _genRoomRoleByUserKey (gameId, userId) {
  return gameId + ":" + userId
}

module.exports = new MatchResult