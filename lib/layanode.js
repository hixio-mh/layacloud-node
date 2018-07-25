const format = require('string-format');
const httpserver = require('./p2p/http_server');
const httpclient = require('./p2p/http_client');
const nodeKey = require('./middleware/node_key');
const Storage = require('./storage/cap_storage');
const Supervisor = require('./supervisor/cap_supervisor');
const LogicCapability = require('./game/cap_logic');


function LayaNode() {
    this.caps = new Map();
}


LayaNode.prototype.addCapability = function (cap) {
    this.caps.set(cap.cap, cap);
    cap.enroll(this);

};


LayaNode.prototype.getCapabilities = function () {
    return this.caps.keys();
};


/**
 * register p2p message handler
 * @param {String} mid message identifier
 * @param {Function} handler  async function
 */
LayaNode.prototype.handleMessage = function (mid, handler) {
    if (!mid || typeof handler !== 'function')
        return;

    httpserver.route(mid, handler);
};


/**
 * send p2p message to specified peer. If the response is needed, one should the result of this function.
 * @param peer
 * @param msg
 * @return {Promise}
 */
LayaNode.prototype.send = function (peer, msg) {
    let url = format('{}/{}', peer.httpurl(), msg.type);
    //console.log(url);
    return httpclient.post(url, msg);
};


LayaNode.prototype.init = function (params) {
    this.params = params;

    nodeKey.initlize();

    // add foundation capability


    //add game capability
    let logic = new LogicCapability();
    logic.init(params);
    this.addCapability(logic);

    // supervisor
    let supervisor = new Supervisor();
    supervisor.init(params);
    this.addCapability(supervisor);

    // storage
    //if (params.storage) {  // command line option --storage --storage-db <db name>
    let storage = new Storage();
    storage.init(params);
    this.addCapability(storage);

    //TODO


};


/**
 * Start the node
 */
LayaNode.prototype.start = async function () {
    let port = this.params.p2pport || app.config.net.p2pport;
    httpserver.start(port);

    //TODO:
};


/**
 * stop the layanode
 */
LayaNode.prototype.stop = function () {
    httpserver.stop();

    //TODO:
};


module.exports = new LayaNode();


