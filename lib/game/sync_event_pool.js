/**
 * 事件同步数据池
 */
const later = require("later")
const SupvervisorHelper = require('../supervisor/supervisor_helper.js')

function SyncEventPool(roomId) {
  this._roomId = roomId
  this._list = []
  this._running = false
}

/**
 * 开始同步
 */
SyncEventPool.prototype.start = function() {
  if(this._running) {
    return true
  }
  later.date.localTime()
  let sched = later.parse.recur()
    .every(10).second()
  this._syncTimer = later.setInterval(this._onSyncTimeout.bind(this),  sched)
  this._running = true
}

/**
 * 停止运行
 */
SyncEventPool.prototype.stop = function() {
  if(!this._running) {
    return
  }
  this._syncTimer.clear()
  if(this._list.length > 0) {
    this._doSyncEvent()
  }
  this._running = false
}

/**
 * 添加数据到同步池中
 * @param {*} type 
 * @param {*} data 
 */
SyncEventPool.prototype.addEvent = function(frameCount, type, data) {
  this._list.push([frameCount, type, data])
}

/***************************
 * internal API
 ***************************/

/**
 * 触发事件同步
 */
SyncEventPool.prototype._onSyncTimeout = async function() {
  await this._doSyncEvent()
  this._list = []
}

SyncEventPool.prototype._doSyncEvent = async function() {
  let supNodeList = app.gameMgr.matchResult.getSupNodeList(this._roomId)
  if(!supNodeList) {
    logger.warn("房间:%s 的监督节点为空:", this._roomId, supNodeList)
    return false
  }
  return await SupvervisorHelper.syncEvent(supNodeList, this._roomId, this._list)
}

module.exports = SyncEventPool