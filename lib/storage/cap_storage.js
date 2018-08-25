const dbProvider = require('./dbprovider_level');
const ConsensusError = require('../consensus/consensus_error');
const util = require('../common/util');
const eth = require("../common/eth");
const nodeKey = require('../foundation/node_key');
const dateOp = require('../common/date_op');
const CenterHelper = require('../foundation/center_helper');
const co = require("co");


/**
 *
 * @constructor
 */
function Storage() {
    this.cap = 'storage';
    this.context = null;
    this.stop = false;

    // userid => {ttl: s, rw: set[n1, n2, n3, ..., nk]}
    // only node n1, ..., nk have R/W permission on user's data.
    //TODO: persist this permissionMap in local storage
    this.permissionMap = new Map();

    //store write2chain request to center	userid
    this.write2ChainMap = new Map();
}


Storage.prototype.init = function (params) {
    dbProvider.init(params.storagedb);
};


Storage.prototype.enroll = function (node) {
    this.context = node;

    node.handleMessage('rpc_storage_read', this.handleRpcStorageRead.bind(this));
    node.handleMessage('rpc_storage_write', this.handleRpcStorageWrite.bind(this));

    // from trusted node (center)
    node.handleMessage('on_appointment_storage_node', this.onAppointed.bind(this));

    this.startWrite2ChainJob();
};


Storage.prototype.onAppointed = async function (data) {
    this.onMessagePermProvision(data);
    this.addWrite2ChainRequest(data);

    const userId = data.data.single_plyaer_key;
    const gameId = data.data.game_id;
    const roomId = data.data.room_hash;

    await this.readFromETH(userId, gameId);

    logger.debug('存储节点<-用户：' + userId);
};


Storage.prototype.readFromETH = async function (userId, gameId) {
    var node_contract = require("../blockchain/node_contract");
    //var ret = yield node_contract.get_user_data("0xcB54eB7Da7696b18D42AfC68fE41e30079822F2b");
    //return (user.data, user.hash_of_data, user.ts);
    //ret[0] == data, ret[1] == hash_data;
    //node主进程 给子进程发起一个send，主进程异步等待，当子进程查询数据完毕，触发主进程promise，ret出数据
    //剩下处理各种数据相关工作

    try {
        let data = await node_contract.get_user_data(gameId, userId);
        logger.debug("raw data from eth: ", data);

        if (!data || !data[0] || data[0] === '0x') {
            // no data. new comer
            logger.debug("empty data: ");
            return;
        }
        let hex = data[0];

        // decode to string
        let buf = util.hexToBuffer(hex);
        let str = buf.toString('utf8');

        // Parse data to an object or a string as fallback
        let d = str;
        try {
            d = JSON.parse(str);
        }
        catch (e) {
            // ignore
        }

        await dbProvider.put(userId + gameId, d);
        logger.debug('read ETH for user %s, got data: %s', userId, data);

    }
    catch (e) {
        logger.warn('Failed to read from ETH', e);
    }
};


Storage.prototype.permissionGc = function () {
    for (let [userId, perm] of this.permissionMap.entries()) {
        if (perm.expiresAt < Math.floor(Date.now() / 1000)) {
            logger.debug('invalidate permission for userId %s', userId);
            this.permissionMap.delete(userId);
        }
    }
};


Storage.prototype.checkPermission = function (callerId, userId) {
    this.permissionGc();

    logger.debug('check permission: callerId=%s userId=%s',
        callerId, userId);
    logger.debug('permission: ', this.permissionMap);

    let authorized = false;
    const perm = this.permissionMap.get(userId);
    if (perm) {
        if (perm.rw.has(callerId)) {
            authorized = true;
        }
    }

    if (!authorized) {
        throw new Error('denied');
    }
};


Storage.prototype.onMessagePermProvision = function (message) {
    const userId = message.data.single_plyaer_key;
    if (this.permissionMap.has(userId)) {
        this.permissionMap.delete(userId);
    }
    let perm = {};
    let ttl = message.data.ttl || 24 * 60 * 60;
    perm.expiresAt = Math.floor(Date.now() / 1000) + ttl;

    let nodeList = Array.from([message.data.logic_node.node_hash_address]);
    if (message.data.sup_node_list) {
        let slist = message.data.sup_node_list.map((node) => {
            return node.node_hash_address;
        });
        nodeList = nodeList.concat(slist);
    }

    logger.debug('create permission: user %s ----> nodes[%s]', userId, nodeList);
    perm.rw = new Set(nodeList);
    this.permissionMap.set(userId, perm);
    //logger.debug('permission: ', JSON.stringify(this.permissionMap, null, 4));
};


//request := {sender: '', data: {type: 'rpc_storage_read', userId: ''}}
//response := {status: 0, userId: '', data: {}, ts: '', digest: '', sig: '', signer: ''}
Storage.prototype.handleRpcStorageRead = async function (req) {

    // logger.debug('storage node receive read request', JSON.stringify(req, null, 2));
    const node = this.context;
    const callerId = req.sender;
    const userId = req.data.userId;
    const gameId = req.data.gameId;

    logger.debug("callerNode: %s, userId: %s", callerId, userId);
    this.checkPermission(callerId, userId);

    const key = userId + gameId;

    let data = await dbProvider.get(key);

    // sign data
    let hash = util.keccak(util.toBuffer(JSON.stringify(data.d)));
    let privKey = util.hexToBuffer(nodeKey.get_local_private());
    let sig = util.sign(hash, privKey);

    return {
        status: 0,
        userId: userId,
        gameId: gameId,
        data: data,
        digest: util.bufferToHexWith0x(hash),
        sig: util.toSignatureString(sig.r, sig.s, sig.v),
        signer: node.nodeId
    };

};


// rpc_storage_write:  {sender: '', data: {type: 'rpc_storage_write', userId: '', data: {}, signers: [{sig: '', account: ''}, ] }
// rpc_storage_write_resp: {status: 0, userId, ''}
Storage.prototype.handleRpcStorageWrite = async function (req) {

    // logger.debug('storage node receive write request', JSON.stringify(req, null, 2));
    const node = this.context;
    const callerId = req.sender;
    const userId = req.data.userId;
    const gameId = req.data.gameId;

    logger.debug("callerNode: %s, userId: %s", callerId, userId);
    this.checkPermission(callerId, userId);

    let witnesses = req.data.signers;

    for (let i = 0; i < witnesses.length; i++) {
        let w = witnesses[i];
        this.checkPermission(w.signer, userId);
    }

    let verified = true;
    let hash = util.keccak(util.toBuffer(JSON.stringify(req.data.data)));
    witnesses.forEach(w => {
        if (!util.verifySignatureUsingAddress(hash, w.sig, w.signer)) {
            verified = false;
            logger.info('failed to verify signature of rpc_storage_write');
        }
    });

    if (!verified) throw new ConsensusError('failed to verify signature of witness');

    let key = userId + gameId;
    await dbProvider.put(key, req.data.data);

    return {
        status: 0,
        userId: userId,
        gameId: gameId,
        storageNode: node.nodeId
    };
};

/**
 * add room info to write2chain map
 * @param {*} logic_node
 * @param {*} sup_node_list
 * @param {*} room_hash
 * @param {*} single_plyaer_key
 * @param {*} game_id
 */
/*
	var packet = {};
	packet.logic_node = logic_node;
	packet.sup_node_list = sup_node_list;
	packet.room_hash = room_hash;
	packet.single_plyaer_key = single_plyaer_key;
	packet.game_id = game_id;
*/
Storage.prototype.addWrite2ChainRequest = function(message){
	let data = message.data;
	
	this.write2ChainMap.set(data.room_hash + data.single_plyaer_key, {
		"room_hash": data.room_hash,
		"player_pubkey": data.single_plyaer_key,
		"game_id": data.game_id,
		"expires_at": dateOp.now_seconds() + 2 * 60,
		"retry_times" : 0
	});
};


/**
 * Loop for requesting player's data on chain
 */
Storage.prototype.startWrite2ChainJob = function () {
    let that = this;
    let run = function () {
        try {
            let now = dateOp.now_seconds();

            for (let [key, info] of that.write2ChainMap.entries()) {
                if (now >= info.expires_at) {
                    console.log("进入上链流程");
                    //that.checkPermission(callerId, userId);

                    // if(!data.d){
                    // 	//failed
                    // 	retry_times < 60
                    // 	that.write2ChainMap.delete(key);
                    // }

                    co(function* () {
                        var request_done = yield function (done) {
                            CenterHelper.query_player_online(info.player_pubkey, info.game_id, done);
                        }

                        console.log("online", request_done);

                        if (!request_done.online) {
                            let data = yield dbProvider.get(info.player_pubkey + info.game_id);

                            if (data.d) {
                                console.log("data:", data);
                                data = JSON.stringify(data.d);
                                let sig = eth.sign(util.sha3(data), nodeKey.get_local_private());

                                var request_done = yield function (done) {
                                    CenterHelper.write2chain_request_to_center(info.room_hash, info.game_id, info.player_pubkey, data, sig, done);
                                }

                                console.log("request_done ", request_done);

                                that.write2ChainMap.delete(key);
                                /*
                                if(request_done == false){
                                    info.retry_times++;

                                    if(info.retry_times >= 60){
                                        that.write2ChainMap.delete(room_hash);
                                    }
                                }
                                */
                            } else {
                                console.log("no user data found:", info.player_pubkey + info.game_id);
                            }

                        }
                    });
                }
            }
        }
        catch (err) {
            console.log(err);
        }
        finally {
            if (!that.stop)
                setTimeout(run, 60 * 1000);
        }
    };

    setTimeout(run, 1000);
};

// setTimeout(function(){
// 	var co = require("co");
// 	co(function*(){
// 		var node_contract = require("../blockchain/node_contract");

// 		var ret = yield node_contract.get_user_data("cloud_8042", "0x7486719c9561b017763bef9a5e50a40a9330399a");
// 		console.timeEnd("get_user_data");
// 		console.log(ret);

// 	});
// }, 2000)

module.exports = Storage;