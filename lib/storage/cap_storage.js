const dbProvider = require('./dbprovider_level');
const ConsensusError = require('../consensus/consensus_error');
const util = require('../common/util');
const nodeKey = require('../foundation/node_key');
const Peer = require('../p2p/peer');


/**
 *
 * @constructor
 */
function Storage() {
    this.cap = 'storage';
    this.context = null;

    // userid => {ttl: s, rw: set[n1, n2, n3, ..., nk]}
    // only node n1, ..., nk have R/W permission on user's data.
    //TODO: persist this permissionMap in local storage
    this.permissionMap = {};

    // userid => [storage-peer]
    this.storagePeersMap = {};
}


Storage.prototype.init = function (params) {
    dbProvider.init(params.storagedb);
};


Storage.prototype.enroll = function (node) {
    this.context = node;

    node.handleMessage('rpc_storage_read', this.handleRpcStorageRead);
    node.handleMessage('rpc_storage_write', this.handleRpcStorageWrite);

    // from trusted node (center)
    node.handleMessage('on_appointment_storage_node', this.onAppointed);
};



/**
 * @param {String}userId
 * @param {Array}snl storage node list
 */
Storage.prototype.setStorageMapping = function(userId, snl) {
    if (snl) {
        let peers = [];
        snl.forEach(node => {
            peers.add(new Peer(node.node_hash_address, node.ip_address, node.http_port));
        });
        this.storagePeersMap.set(userId, peers);
    }
};


Storage.prototype.onAppointed = function (data) {
    this.onMessagePermProvision(data);
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
/*
 packet.logic_node = logic_node;
                packet.sup_node_list = sup_node_list;
                packet.room_hash = room_hash;
                packet.player_pubkey_list = player_pubkey_list;
                packet.game_id = game_id;
 */

    let userId = message.data.single_plyaer_key;
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
    let node = this.context;
    let callerId = req.sender;
    let userId = req.data.userId;

    this.checkPermission(callerId, userId);

    let data = await dbProvider.get(userId);
    // sign data
    let hash = util.keccak(util.toBuffer(JSON.stringify(data)));
    let sig = util.sign(hash, nodeKey.get_local_private());

    return {
        status: 0,
        userId: userId,
        data: data,
        digest: util.bufferToHexWith0x(hash),
        sig: util.toSignatureString(sig.r, sig.s, sig.v),
        signer: node.nodeId
    };
};


// rpc_storage_write:  {sender: '', data: {type: 'rpc_storage_write', userId: '', data: {}, signers: [{sig: '', account: ''}, ] }
// rpc_storage_write_resp: {status: 0, userId, ''}
Storage.prototype.handleRpcStorageWrite = async function (req) {

    let node = this.context;
    let callerId = req.sender;
    let userId = req.data.userId;

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

    await dbProvider.put(userId, req.data.data);

    return {
        userId: userId,
        node: node.nodeId
    };
};


const instance = new Storage();


module.exports = instance;