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
};


module.exports = Supervisor;