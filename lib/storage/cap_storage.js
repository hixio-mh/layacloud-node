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

    this.perm = [];

    this.writeCallbackMap = {};
    this.verifiedMap = {};


}


Storage.prototype.init = function (params) {
    dbprovider.init(params.storagedb);
};


Storage.prototype.enroll = function (node) {
    this.context = node;
    node.handleMessage('rpc_storage_read', this.handleRpcStorageRead);
    node.handleMessage('rpc_storage_write', this.handleRpcStorageWrite);

    // from trusted node (center)
    node.handleMessage('message_storage_perm_provision', this.onMessagePermProvision);
    node.handleMessage('message_data_verified', this.onMessageDataVerified);

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
        status: 0,  // OK
        snode: node.nodeId
    };
};


const VerificationCount = 11;
const Threadshold = Math.floor(2 * VerificationCount / 3);


Storage.prototype.onMessageDataVerified = function (message) {

    // message:=   {sender: '', data: { type: 'message_data_verified', userId: '', hash: '', sig: '' }

    let userId = message.data.userId;

    if (this.verifiedMap.has(userId)) {

        let info = this.verifiedMap[userId];
        info.count++;
        let signers = info.signers;
        signers.push({signer: message.sender, sig: message.data.sig});

        if (signers.length > Threadshold) {
            let node = this.context;
            //TODO: get peers that store the user data
            let storagePeers = [];

            const N = storagePeers.length;
            const CONSENSUS = Math.floor(N * 2 / 3);

            let respArray = [];
            let rpcAll = storagePeers.map((peer) => {
                let p = node.send(peer, {type: 'rpc_storage_write', userId: userId, data: {}, signers: []});
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



        }


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
        let p = node.send(peer, {type: 'rpc_storage_read', userId: userId});
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
    let supervisorNodes = [];

    // send data verification request to all supervisor nodes
    // asynchronously
    let verifyReq = {
        type: 'message_data_verify',
        ts: Date.now(),
        userId: userId,
        data: data,
    };

    supervisorNodes.forEach(s => {
        node.send(s, verifyReq);
    });

    if (cb && typeof cb === 'function') {
        this.writeCallbackMap[userId] = cb;
    }

    //end up here

};


Storage.prototype.batchWrite = function (arrayOfData) {
};


const instance = new Storage();


module.exports = instance;