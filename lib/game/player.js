/**
 * 关于玩家
 */
function Player(socket, request) {
  this.id = ''
  this.roomId = 0
  this.socket = socket
  this.game = 
}

/**
 * 设置room id
 * @param {*} roomId 
 */
Player.prototype.setRoomId = function(roomId) {
  this.roomId = roomId
}

module.exports = Player