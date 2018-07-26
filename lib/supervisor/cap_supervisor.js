function Supervisor() {
    this.cap = 'supervisor';
    this.context = null;
}


/**
 * initialize supervisor capability
 * @param {Object} params
 */
Supervisor.prototype.init = function (params) {
};


/**
 * register this capability to the layanode
 * @param {LayaNode} node
 */
Supervisor.prototype.enroll = function (node) {
    this.context = node;

    node.handleMessage('on_appointment_sup_node', this.onAppointed);
};


Supervisor.prototype.onAppointed = function(data) {
    //TODO
};


module.exports = Supervisor;