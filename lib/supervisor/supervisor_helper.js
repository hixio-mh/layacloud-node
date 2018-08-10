/**
 * 监督节点相关的工具模块
 */
var SupervisorHelper = {}

/**
 * 发送同步事件
 * @param {*} node 
 * @param {*} type 
 * @param {*} data 
 */
SupvervisorHelper.sendSyncEvent = async function(supNodeList, list) {
  let node = app.layaNode
  let msg = {type: 'logic_sync_event', list: list}
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