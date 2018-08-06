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
    node.handleMessage('on_matched',this.on_matched);

};


/**
 * 收到任命成为逻辑节点
 * @param {Object} data 
 * 
 */
LogicCapability.prototype.onAppointed = function(input) {
    logger.info('被任命成为逻辑节点',input);
    let data = input.data
    SysInfo.logic_task_count++;
    let ret = gameMgr.matchResult.store(data.room_hash, data.player_pubkey_list)
    if(ret) {
        let role = app.consts.ROOM_ROLE.LOGIC
        gameMgr.matchResult.setRoomRole(data.room_hash, role)
        // gameMgr.matchResult.setRoomRoleByUser(data.game_id, data.player_pubkey_list, role)
    }
};


/**
 * 收到中心服务器的匹配成功
 * @param {Object} data 
 * 数据格式应包含
 * pubkey_list
 * room_node_ip
 * room_node_port
 * room_hash
 */
LogicCapability.prototype.on_matched = function(data){
    logger.info('匹配完成',data);
}

module.exports = LogicCapability;