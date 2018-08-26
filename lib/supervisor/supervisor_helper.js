/**
 * 监督节点相关的工具模块
 */
var SupervisorHelper = {}

/**
 * 发送用户同步事件
 * @param {*} supNodeList 
 * @param {*} list 
 */
SupervisorHelper.syncLogicEvent = async function (gameId, roomId, list) {
  return this._doSyncEvent(gameId, roomId, list)
}

/**
 * 发送系统同步事件
 * @param {*} userId
 * @param {*} type
 * @param {*} data
 */
SupervisorHelper.syncSysEvent = async function (gameId, userId, type, data) {
  let roomId = app.gameMgr.matchResult.getRoomId(gameId, userId)
  if(!roomId) {
    logger.warn("同步系统事件,无法找到game:%s 玩家:%s 的房间信息", gameId, userId)
    return false
  }

  return await SupervisorHelper._doSyncEvent(gameId, roomId, [[0, type, data]])
}


/**
 * 发送同步事件
 * @param {*} node 
 * @param {*} type
 * @param {*} roomid
 * @param {*} list
 */
SupervisorHelper._doSyncEvent = async function(gameId, roomId, list) {
  if(list.length == 0) return true
  logger.debug("房间:%s 同步事件到监督节点:\n", roomId, list)
  let supNodeList = app.gameMgr.matchResult.getSupNodeList(roomId)
  if(!supNodeList) {
    logger.warn("房间:%s 的监督节点为空:", roomId, supNodeList)
    return false
  }
  let node = app.layaNode
  // FIXME: 这里传递game_id和room_id不安全
  let msg = {type: "sync_logic_event", game_id:gameId, room_id:roomId, list: list}
  let pAll = supNodeList.map((sup) => {
    let p = node.signAndSend(sup, msg)
    return p
  })
  return Promise.all(pAll.map(p => p.catch(e => e)))
  .then(inspects => {
    let ret = true
    inspects.forEach(ins => {
      if (ins instanceof Error) {  // succeed
        logger.info('同步事件到监督节点错误:', ins);
        ret = false
      } 
    })
    return ret
  })
}

module.exports = SupervisorHelper