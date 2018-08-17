/**
 * 监督节点相关的工具模块
 */
var SupervisorHelper = {}

/**
 * 发送用户同步事件
 * @param {*} supNodeList 
 * @param {*} list 
 */
SupervisorHelper.syncEvent = async function (supNodeList, roomId, list) {
  return this._doSyncEvent(supNodeList, "sync_logic_event", roomId, list)
}

/**
 * 发送系统同步事件
 * @param {*} userId
 * @param {*} type
 * @param {*} data
 */
SupervisorHelper.syncSysEvent = async function (userId, type, data) {
  let roomId = app.gameMgr.matchResult.getRoomId(userId)
  if(!roomId) {
    logger.warn("无法找到玩家:%s 的房间信息:", userId)
    return false
  }

  let supNodeList = app.gameMgr.matchResult.getSupNodeList(roomId)
  if(!supNodeList) {
    logger.warn("房间:%s 的监督节点为空:", roomId, supNodeList)
    return false
  }
  return await SupervisorHelper._doSyncEvent(supNodeList, "sync_sys_event", roomId, [type, data])
}


/**
 * 发送同步事件
 * @param {*} node 
 * @param {*} type
 * @param {*} roomid
 * @param {*} list
 */
SupervisorHelper._doSyncEvent = async function(supNodeList, type, roomId, list) {
  let node = app.layaNode
  let msg = {type: type, room_id:roomId, list: list}
  let pAll = supNodeList.map((sup) => {
    let p = node.send(sup, msg)
    return p.reflect()
  })
  return Promise.all(pAll).then(inspects => {
    let ret = true
    inspects.forEach(ins => {
      if (ins.isFulfilled()) {  // succeed
      } else {
        logger.info('同步事件到监督节点错误:', inspects);
        ret = false
      }
    })
    return ret
  })
}

module.exports = SupervisorHelper