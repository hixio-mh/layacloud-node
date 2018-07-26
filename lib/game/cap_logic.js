const WsServer = require('../ws_server.js');


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


LogicCapability.prototype.onAppointed = function(data) {
    //TODO
};


module.exports = LogicCapability;