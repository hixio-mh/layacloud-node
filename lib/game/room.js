/**
 * 房间定义
 */
function Room(roomId, gameId, ownerId) {
  this.id = roomId
  this.gameId = gameId
  this.ownerId = ownerId

  this.fps = 10
  this.userLimit = 2
  this.matchFieldName = ''
  this.match_rule = ''

  // 房间结束类型
  this.endType = app.consts.ROOM_END_TYPE.DURATION
  this.endData = 20
}