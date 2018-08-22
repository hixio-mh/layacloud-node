const dbProvider = require('./dbprovider_level');
const ConsensusError = require('../consensus/consensus_error');
const util = require('../common/util');
const eth = require("../common/eth");
const nodeKey = require('../foundation/node_key');
const Peer = require('../p2p/peer');
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

    // userid => [storage-peer]
	this.storagePeersMap = new Map();
	
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



/**
 * @param {String}userId
 * @param {Array}snl storage node list
 */
Storage.prototype.setStorageNodeMapping = function(userId, snl) {
    if (snl) {
        let peers = [];
        snl.forEach(node => {
            peers.push(new Peer(node.node_hash_address, node.ip_address, node.http_port));
        });
        this.storagePeersMap.set(userId, peers);
    }
};


Storage.prototype.onAppointed = function (data) {
	this.onMessagePermProvision(data);
	this.addWrite2ChainRequest(data);
};


Storage.prototype.permissionGc = function () {
    for (let [userId, perm] of this.permissionMap.entries()) {
        if (perm.expiresAt >= Math.floor(Date.now() / 1000)) {
            this.permissionMap.delete(userId);
        }
    }
};


Storage.prototype.checkPermission = function (callerId, userId) {
    this.permissionGc();

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
    let ttl =  message.data.ttl || 24 * 60 * 60;
    perm.expiresAt = Math.floor(Date.now() / 1000) + ttl;

    let nodeList = Array.from([message.data.logic_node]);
    nodeList.concat(message.data.sup_node_list);

    perm.rw = new Set(nodeList);

    this.permissionMap.set(userId, perm);
};


//request := {sender: '', data: {type: 'rpc_storage_read', userId: ''}}
//response := {status: 0, userId: '', data: {}, ts: '', digest: '', sig: '', signer: ''}
Storage.prototype.handleRpcStorageRead = async function (req) {
    const node = this.context;
    const callerId = req.sender;
    const userId = req.data.userId;
    const gameId = req.data.gameId;

    this.checkPermission(callerId, userId);

    const key = userId + gameId;

    let data = await dbProvider.get(key);
    // sign data
    let hash = util.keccak(util.toBuffer(JSON.stringify(data)));
    let sig = util.sign(hash, nodeKey.get_local_private());

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

    const node = this.context;
    const callerId = req.sender;
    const userId = req.data.userId;
    const gameId = req.data.gameId;

    this.checkPermission(callerId, userId);

    let witnesses = req.data.signers;

    witnesses.forEach(w => {
        this.checkPermission(w.account, userId);
    });

    let verified = true;
    let hash = util.keccak(util.toBuffer(JSON.stringify(req.data.data)));
    witnesses.forEach(w => {
        if (!util.verifySignatureUsingAddress(hash, w.sig, w.account)) {
            verified = false;
            logger.info('failed to verify signature of rpc_storage_write');
        }
    });

    if (!verified) throw new ConsensusError('failed to verify signature of witness');

    let key = userId + gameId;
    await dbProvider.put(key, req.data.data);

    return {
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
	
	this.write2ChainMap.set(data.room_hash, {
		"player_pubkey": data.single_plyaer_key,
		"game_id": data.game_id,
		"expires_at": dateOp.now_seconds() + 2 * 60,
		"retry_times" : 0
	});
}

/**
 * Loop for requesting player's data on chain
 */
Storage.prototype.startWrite2ChainJob = function () {
    let that = this;
    let run = async function () {
        try {
			let now = dateOp.now_seconds();
			
			for (let [room_hash, info] of that.write2ChainMap.entries()) {
				if(now >= info.expires_at){
					console.log("进入上链流程");
					//that.checkPermission(callerId, userId);
					
					//let data = await dbProvider.get(info.player_pubkey + info.game_id);
					let data = "abc";
					let sig = eth.sign(util.sha3(data), "0x" + nodeKey.get_local_private());
					
					co(function*(){
						var request_done = yield function(done){
							CenterHelper.write2chain_request_to_center(room_hash, info.game_id, info.player_pubkey, data, sig, done);
						}
						console.log("request_done ", request_done);
						if(request_done == false){
							info.retry_times++;

							if(info.retry_times >= 60){
								that.write2ChainMap.delete(room_hash);
							}
						}
					});
				}
			}
		}
		catch(err){
			console.log(err);
		}
        finally {
            if (!that.stop)
                setTimeout(run, 20 * 1000);
        }
	};
	
    setTimeout(run, 1000);
};

const instance = new Storage();


module.exports = instance;