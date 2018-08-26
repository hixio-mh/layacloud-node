/**
 * 监督节点对应的engine
 */
function EngineSupervisor(engine) {
  this._engine = engine
  this._eventList = []  // 事件列表
}

/**
 * 添加同步事件
 * @param {*} type 
 * @param {*} data 
 */
EngineSupervisor.prototype.addSyncEvent = function(frameCount, type, data) {
  this._eventList.push([frameCount, type, data])
  this._triggerLoop()
}

/**
 * 执行循环逻辑
 * frameCount增加
 */
EngineSupervisor.prototype.doLoop = function() {
  let frameCount = this._engine.getFrameCount()
  // logger.debug("supervisor onLoop, frameCount:", frameCount, "eventList:", this._eventList)
  while(this._eventList.length > 0) {
    let eventItem = this._eventList.shift()
    let [evframeCount, evType, evData] = eventItem
    if(frameCount < evframeCount) {
      while(frameCount < evframeCount) {
        frameCount = this._engine.incFrameCount(1)
      }
    } else if(frameCount > evframeCount) {
      logger.warn("监督节点虚拟机运行速度:%d 超过逻辑节点:%d", frameCount, evframeCount)
    }
    logger.debug("监督节点房间:%s engine执行逻辑 engine.%s 参数:", this._engine._room.id, evType, evData)
    // room 事件
    if(evType == "engine_close") {
      this._engine.close.apply(this._engine, evData)
    } else if(evType == "leave_room") {
      let roomMgr = this._engine._game.roomMgr
      roomMgr.leaveRoom.apply(roomMgr, evData)
    } else if(evType == "on_client_msg") {
      let [userId, key] = evData
      let user = this._engine._game.userMgr.getUser(userId)
      if(!user) {
        logger.info("监督节点处理同步事件，玩家:%s 已不存在", userId)
        return
      }
      if(user.isDataLoaded()) {
        this._engine.onClientMsg.apply(this._engine, evData)
      } else {
        logger.debug("执行同步事件:%s 时，用户:%s 的数据还未加载，稍后重试!", key, userId)
        this._eventList.unshift(eventItem)
        return
      }
    } else {
      this._engine[evType].apply(this._engine, evData)
    }
    frameCount = this._engine.getFrameCount()
  }
}

/********************
 * internal API 
 ********************/

/**
 * 触发loop
 * 参考 room.syncEventToSup 函数
 */
EngineSupervisor.prototype._triggerLoop = function() {
  this.doLoop()
}

module.exports = EngineSupervisor