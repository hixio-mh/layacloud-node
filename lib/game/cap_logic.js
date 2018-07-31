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


module.exports = LogicCapability;