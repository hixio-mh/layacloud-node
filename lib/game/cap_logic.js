const gameMgr = require("./game_mgr.js") 
// const WsServer = require('../ws_server.js');
 

var SysInfo = require('../utils/sys_info');
/**
 *
 * @constructor
 */
function LogicCapability() {
    this.cap = 'logic';
    this.context = null;

}


LogicCapability.prototype.init = function (params) {
    // let ws = new WsServer();
    // ws.start(params);

};


LogicCapability.prototype.enroll = function (node) {
    this.context = node;

    node.handleMessage('on_appointment_logic_node', this.onAppointed);
};


/**
 * 收到任命成为逻辑节点
 * @param {Object} data 
 * 
 */
LogicCapability.prototype.onAppointed = function(data) {
    logger.info('被任命成为逻辑节点',data);
    SysInfo.logic_task_count++;
    let ret = gameMgr.matchResult.store(data.room_hash, data.player_pubkey_list)
    if(ret) {
        gameMgr.matchResult.setRoomRole(data.room_hash, app.consts.ROOM_ROLE.LOGIC)
    }
};


module.exports = LogicCapability;