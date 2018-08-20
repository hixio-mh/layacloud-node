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
}

/**
 * 执行循环逻辑
 * frameCount增加
 */
EngineSupervisor.prototype.onLoop = function() {
  let frameCount = this._engine.getFrameCount()
  while(this._eventList.length > 0) {
    let [evframeCount, evType, evData] = this._eventList.shift()
    if(frameCount < evframeCount) {
      while(frameCount < evframeCount) {
        this._engine.incFrameCount(1)
      }
    } else if(frameCount > evframeCount) {
      logger.warn("监督节点虚拟机运行速度:%d 超过逻辑节点:%d", frameCount, evframeCount)
    }
    this._engine[evType].apply(this, evData)
    frameCount = this._engine.getFrameCount()
  }
}

module.exports = EngineSupervisor