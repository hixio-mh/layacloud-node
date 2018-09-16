/**
 * 检测协议的顺序
 */
function ProtocolOrder() {
  this._userHash = new Map()
}

ProtocolOrder.prototype.setInitHash = function(userId, hash) {
  this._userHash.set(userId, hash)
}

ProtocolOrder.prototype.checkPacket = function(packet) {
  let userId = packet.params.userId
  let hash = packet.packet_hash
  if(!userId || !hash) {
    return false
  }
  let hashExpect = this._userHash.get(userId)
  if(!hashExpect){
    return false
  }
  return hashExpect == hash
}

ProtocolOrder.prototype.updatePacketHash = function(userId, hash) {
  if(!this._userHash.has(userId)) {
    return
  }
  this._userHash.set(userId, hash)
}

ProtocolOrder.prototype.clearPacketHash = function(userId) {
  this._this._userHash.delete(userId)
}

module.exports = new ProtocolOrder()