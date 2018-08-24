/**
 * 监督节点对应的engine
 */
function EngineSupervisor(engine) {
  this._engine = engine
  this._eventList = []  // 事件列表
}

/**
 * 添加事件
 * @param {*} type 
 * @param {*} data 
 */
EngineSupervisor.prototype.addEvent = function(frameCount, type, data) {
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
    let [evframeCount, evType, evData] = this._eventList.shift()
    if(frameCount < evframeCount) {
      while(frameCount < evframeCount) {
        frameCount = this._engine.incFrameCount(1)
      }
    } else if(frameCount > evframeCount) {
      logger.warn("监督节点虚拟机运行速度:%d 超过逻辑节点:%d", frameCount, evframeCount)
    }
    logger.debug("监督节点房间:%s engine执行逻辑 engine.%s 参数:", this._engine._room.id, evType, evData)
    this._engine[evType].apply(this._engine, evData)
    frameCount = this._engine.getFrameCount()
  }
}

/********************
 * internal API 
 ********************/

/**
 * 触发loop
 */
EngineSupervisor.prototype._triggerLoop = function() {
  this.doLoop()
}

module.exports = EngineSupervisor