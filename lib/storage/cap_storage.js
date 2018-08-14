const BB = require('bluebird');

const dbprovider = require('./dbprovider_level');
const ConsensusError = require('../consensus/consensus_error');
const util = require('../common/util');
const nodeKey = require('../foundation/node_key');

/**
 *
 * @constructor
 */
function Storage() {
    this.cap = 'storage';
    this.context = null;

    // {userid: '', ttl: s, rw: set[n1, n2, n3, ..., nk]}
    // only node n1, ..., nk have R/W permission on user's data.
    //TODO: persist this perm in local storage
    this.perm = [];

    // userid => {callback: <cb>, data: <data>, count: <k>, signers: [{account, sig}]
    this.pendingWriteMap = {};


}


Storage.prototype.init = function (params) {
    dbprovider.init(params.storagedb);
};


Storage.prototype.enroll = function (node) {
    this.context = node;


    node.handleMessage('rpc_storage_read', this.handleRpcStorageRead);
    node.handleMessage('rpc_storage_write', this.handleRpcStorageWrite);

    // from trusted node (center)
    node.handleMessage('on_appointment_storage_node', this.on_appointment_storage_node);
    node.handleMessage('message_perm_provision', this.onMessagePermProvision);
    node.handleMessage('message_data_verified', this.onMessageDataVerified);

};


Storage.prototype.on_appointment_storage_node = function (data) {

};


Storage.prototype.permissionGc = function () {


};


Storage.prototype.checkPermission = function (callerId, userId) {
    this.permissionGc();

    let authorized = false;
    for (let i = 0; i < this.perm.length; i++) {
        const p = this.perm[i];
        if (p.userId === userId) {
            if (p.rw.has(callerId)) {
                authorized = true;
                break;
            }
        }
    }

    if (!authorized) {
        throw new Error('denied');
    }
};


Storage.prototype.onMessagePermProvision = function (message) {

};


//request := {sender: '', data: {type: 'rpc_storage_read', userId: ''}}
//response := {status: 0, userId: '', data: {}, ts: '', digest: '', sig: '', signer: ''}
Storage.prototype.handleRpcStorageRead = async function (req) {

    let node = this.context;
    let callerId = req.sender;
    let userId = req.data.userId;

    this.checkPermission(callerId, userId);

    let data = await dbprovider.get(userId);
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

    await dbprovider.put(userId, req.data.data);

    return {
        userId: userId,
        node: node.nodeId
    };
};


const VerificationCount = 11; // supervisor node count
const Threshold = Math.floor(2 * VerificationCount / 3);

const WriteTimeout = 30 * 1000; // millis


Storage.prototype.onMessageDataVerified = async function (message) {
    // message:=   {type: 'message_data_verified', userId: '', hash: '', sig: '', signer: ''}
    let userId = message.userId;

    if (this.pendingWriteMap.has(userId)) {

        let pendingWrite = this.pendingWriteMap[userId];
        let signers = pendingWrite.signers;
        signers.push({signer: message.signer, sig: message.sig});

        if (signers.length > Threshold) {

            if (pendingWrite.status !== 'writing') {
                pendingWrite.status = 'writing';

                let node = this.context;
                //TODO: get peers that store the user data
                let storagePeers = [];

                const N = storagePeers.length;
                const CONSENSUS = Math.floor(N * 2 / 3);

                let respArray = [];
                let rpcAll = storagePeers.map((peer) => {
                    let p = node.signAndSend(peer, {
                        type: 'rpc_storage_write',
                        userId: userId,
                        data: pendingWrite.data,
                        signers: signers
                    });
                    return p.reflect();
                });

                BB.all(rpcAll).then((inspects) => {
                    inspects.forEach(ins => {
                        if (ins.isFulfilled()) {  // succeed
                            //response := {userId: '',  node: '' }
                            let response = inspect.value();
                            respArray.push(response);


                        }
                    });
                });

                //succeeded write count
                if (respArray.length > CONSENSUS) {
                    pendingWrite.callback(null, pendingWrite.digest);
                }
                else {
                    pendingWrite.callback(new ConsensusError(), null);
                }

                this.pendingWriteMap.delete(userId);
            }
        }
        else {
            logger.info("additional message_data_verified can be ignored for already confirmed data");
        }
    }
    else {
        logger.info("ignored message_data_verified message for userId " + userId);
    }
};


/**
 * read user data from distributed storage nodes
 * @param userId
 * @return Promise
 */
Storage.prototype.read = function (userId) {

    let node = this.context;

    //TODO: get peers that store the user data
    let storagePeers = [];

    const N = storagePeers.length;
    const CONSENSUS = Math.floor(N * 2 / 3);

    // send RPC request to all assigned peers for data
    //request := {type: 'rpc_storage_read', userId: ''}
    let respArray = [];
    let rpcAll = storagePeers.map((peer) => {
        let p = node.signAndSend(peer, {type: 'rpc_storage_read', userId: userId});
        return p.reflect();
    });

    BB.all(rpcAll).then((inspects) => {
        inspects.forEach(ins => {
            if (ins.isFulfilled()) {  // succeed
                //response := {userId: '', data: {}, ts: '', digest: '', sig: '', signer: ''}
                let resp = inspect.value();

                let verified = false;
                let hash = util.keccak(util.toBuffer(JSON.stringify(resp.data)));
                if (util.bufferToHexWith0x(hash) === resp.digest) {
                    if (util.verifySignatureUsingAddress(resp.digest, resp.sig, resp.signer)) {
                        verified = true;
                    }
                    else {
                        logger.info('failed to verify signature of rpc_storage_read_resp');
                    }
                }
                else {
                    logger.info('failed to verify digest of rpc_storage_read_resp');
                }

                if (verified)
                    respArray.push(resp);
                else
                    logger.info('ignore this response');
            }
        });

        if (respArray.length <= CONSENSUS) {
            // TODO:  use additional replica node
            return BB.reject(new ConsensusError());
        }

        // consensus made on > 2N/3 nodes
        let mapCnt = {};
        let mapData = {};
        respArray.forEach((resp) => {
            if (mapCnt.hasOwnProperty(resp.digest)) {
                mapCnt[resp.digest]++;
            }
            else {
                mapCnt[resp.digest] = 1;
                mapData[resp.digest] = resp.data.d;
            }
        });

        let k = 0;
        let D = null;
        for (const d in mapCnt) {
            if (k < mapCnt[d]) {
                k = mapCnt[d];
                D = d;
            }
        }

        if (k > CONSENSUS) {
            return BB.resolve(mapData[D]);
        }
        else {
            return BB.reject(new ConsensusError());
        }
    });
};


/**
 * store user data onto distributed storage node
 * @param userId
 * @param data
 * @return Promise
 */
Storage.prototype.write = function (userId, data, cb) {
    let node = this.context;
    let pendingWriteMap = this.pendingWriteMap;
    let supervisorNodes = [];

    // send data verification request to all supervisor nodes
    // asynchronously
    // {type: 'message_data_verify', userId: '', digest: '0x...', peer: {ip: '', port: n}}

    let hash = util.keccak(util.toBuffer(JSON.stringify(data)));
    let timestamp = Date.now();
    let verifyReq = {
        type: 'message_data_verify',
        ts: timestamp,
        userId: userId,
        digest: util.bufferToHexWith0x(hash),
        peer: {ip: app.config.net.wsaddr, port: app.config.net.p2pport}
    };

    supervisorNodes.forEach(s => {
        node.signAndSend(s, verifyReq).catch(err => {
            logger.warn("write: failed to send verification msg to " + s);
        });
    });

    if (cb && typeof cb === 'function') {
        pendingWriteMap[userId] = { callback: cb,
            data: data,
            digest: util.bufferToHexWith0x(hash),
            ts: timestamp,
            status: 'wait',
            signers: [] };
    }

    // handle write timeout
    setTimeout(function () {

        let pendingWrite = pendingWriteMap.get(userId);
        if (pendingWrite.status === 'wait') {
            pendingWrite.callback(new Error('timeout'), null);
        }

        pendingWriteMap.delete(userId);

    }, WriteTimeout);

    //function ends up here
};


Storage.prototype.batchWrite = function (arrayOfData) {
    throw new Error('not impl.');
};


const instance = new Storage();


module.exports = instance;