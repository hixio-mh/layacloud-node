const BB = require('bluebird');

const CenterHepler = require('../foundation/center_helper');


/**
 * handle RPC
 * @constructor
 */
function Rpc() {
    this.cap = 'rpc';
    this.context = null;
}


Rpc.prototype.init = function (params) {
};


Rpc.prototype.enroll = function (node) {
    this.context = node;

    //registry
    // NOTE: now we reuse layanode peer communication channel. We may setup a new channel in the future.
    node.handleMessage('rpc_account_checkNodePow', this.account_checkNodePow.bind(this));
};


Rpc.prototype.account_checkNodePow = async function (req) {
    const checkPayoffFn = BB.promisify(CenterHepler.query_node_pow);
    let res = await checkPayoffFn();
    return res;
};


module.exports = Rpc;