/**
 * 定义程序需要的一些常量
 */
exports = module.exports = { 
  // 房间结束类型
  ROOM_END_TYPE: {
    DURATION: 0,    // 时长
    INFINITY: 1,    // 无限
    CONDITION: 2    // 条件性
  },

  // 玩家状态
  USER_STATE: {
    INIT: "init",             // 初始状态
    ENTERED: "entered",       // 已进入房间(数据已经加载)
    PLAYING: "playing",       // 游戏中
    DISCONNECT: "disconnect"  // 断线中
  },

  // 房间职责
  ROOM_WORK_TYPE: {
    LOGIC: "logic",         // 逻辑节点
    SUPERVISOR: "supervisor"// 监督节点
  },

  // LEAVE ROOM类型
  LEAVEROOM_REASON: {
    SOCKET_CLOSE: 0,      // socket关闭
    ROUND_FINISH: 2       // 回合结束
  },

  // room状态
  ROOM_STATE: {
    INIT: 0,            // 初始状态
    START: 1            // 开始状态(玩家已经到齐)
  }
};