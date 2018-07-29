const format = require('string-format');
const httpserver = require('./p2p/http_server');
const httpclient = require('./p2p/http_client');
const nodeKey = require('./foundation/node_key');
const Storage = require('./storage/cap_storage');
const Supervisor = require('./supervisor/cap_supervisor');
const LogicCapability = require('./game/cap_logic');
const FoundationCap =  require('./foundation/cap_foundation');
const WsServer = require('./ws_server.js');

var co = require('co');

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
 * register ws message handler
 * @param {String} cmd message CloudSDK cmd
 * @param {Function} handler
 */

 LayaNode.prototype.handleWsMessage = function(cmd , handler){
    if(!cmd || typeof handler !== 'function'){
        return;
    }
    this.ws.regist_callback(cmd,handler);
 }




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


LayaNode.prototype.init = function (params,cb) {
    this.params = params;

    co(function*(){
        yield function(done){
            nodeKey.initlize(done);
        }
        logger.info('nodekey load finish',nodeKey.get_local_address());


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

        cb(null,{});

        //TODO
    }.bind(this))

};


/**
 * Start the node
 */
LayaNode.prototype.start = async function () {
    let port = this.params.p2pport || app.config.net.p2pport;
    httpserver.start(port);

    //将ws server挪到node层，因为有多个cap需要handle ws的message 
    this.ws = new WsServer();
    this.ws.start(this.params);

    //Foundation来处理基本的 ws登录流程，放在ws开启之后enroll

    let foundation = new FoundationCap();
    foundation.init(this.params);
    this.addCapability(foundation);


};


/**
 * stop the layanode
 */
LayaNode.prototype.stop = function () {
    httpserver.stop();

    //TODO:
};


module.exports = new LayaNode();

