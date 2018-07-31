const WsServer = require('../ws_server.js');

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
    let ws = new WsServer();
    ws.start(params);

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
LogicCapability.prototype.onAppointed = function(data) {
    //TODO
    logger.info('被任命成为逻辑节点',data);
    SysInfo.logic_task_count++;


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