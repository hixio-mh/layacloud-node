const format = require('string-format');
const httpserver = require('./p2p/http_server');
const httpclient = require('./p2p/http_client');
const nodeKey = require('./foundation/node_key');
const storage = require('./storage/cap_storage');
const Supervisor = require('./supervisor/cap_supervisor');
const LogicCapability = require('./game/cap_logic');
const FoundationCap =  require('./foundation/cap_foundation');
const WsServer = require('./ws_server.js');
const packetManager = require('./common/packet_manager.js');
var gameMgr = require('./game/game_mgr.js');
var co = require('co');


function LayaNode() {
    this.caps = new Map();
    this.nodeId = null;
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
 };


/**
 * send p2p message to specified peer. If the response is needed, one should the result of this function.
 * @param peer
 * @param msg
 * @return {Promise}
 */
LayaNode.prototype.send = async function (peer, msg) {
    let url = format('{}/{}', peer.httpurl(), msg.type);
    return httpclient.post(url, packetManager.packet(nodeKey.get_local_private(), msg));
};


LayaNode.prototype.init = function (params,cb) {
    this.params = params;

    co(function*(){
        yield function(done){
            nodeKey.initlize(done);
        }
        logger.info('nodekey load finish',nodeKey.get_local_address());

        this.nodeId = nodeKey.get_local_address();

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

    // 初始化game mgr
    if(!gameMgr.init()) {
        logger.warn("init game mgr failed")
        return false
    }
};


/**
 * stop the layanode
 */
LayaNode.prototype.stop = function () {
    httpserver.stop();

    //TODO:
};


module.exports = new LayaNode();


