/**
 * 协议相关的工具类
 */
function ProtocolUtil() {
}

ProtocolUtil.prototype.userJoined = function (code, node_hash_address, ip_address, port, ssl_port) {
  var packet = {};
  packet.url = 'user.logined';
  packet.params = {};
  packet.params.code = code;
  if(code == 0) {
    packet.params.node_hash_address = node_hash_address
    packet.params.ip_address = ip_address;
    packet.params.port = port;
    packet.params.ssl_port = ssl_port;
  }
  return packet
}

/**
 * 加入房间成功
 */
ProtocolUtil.prototype.roomJoined = function (code, room) {
  var packet = {};
  packet.url = 'room.joined';
  packet.params = {};
  packet.params.code = code;
  if(code == 0) {
    packet.params.room = room
  }
  logger.debug('生成roomJoined消息', packet)
  return packet
}

module.exports = new ProtocolUtil