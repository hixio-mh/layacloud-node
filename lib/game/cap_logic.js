const SysInfo = require('../utils/sys_info');
const ConsensusError = require('../consensus/consensus_error');
const Peer = require('../p2p/peer');
const storage = require('../storage/cap_storage');

const BB = require('bluebird');


const WriteTimeout = 30 * 1000; // millis


/**
 *
 * @constructor
 */
function LogicCapability() {
    this.cap = 'logic';
    this.context = null;

    // roomid => [supervisor-peer]
    this.supervisorPeersMap = new Map();

    // userid+gameId => {callback: <cb>, data: <data>, count: <k>, signers: [{account, sig}]
    this.pendingWriteMap = new Map();

}


LogicCapability.prototype.init = function (params) {
    // let ws = new WsServer();
    // ws.start(params);
};


LogicCapability.prototype.enroll = function (node) {
    this.context = node;

    node.handleMessage('on_appointment_logic_node', this.onAppointed);
    node.handleMessage('on_matched', this.on_matched);

    node.handleMessage('message_data_verified', this.onMessageDataVerified);
};


/**
 * 收到任命成为逻辑节点
 * @param {Object} data
 *
 */
LogicCapability.prototype.onAppointed = function (input) {
    logger.info('被任命成为逻辑节点', input);
    let data = input.data;
    let gameId = data.game_id;
    let roomId = data.room_hash;
    let userList = data.player_pubkey_list;

    SysInfo.logic_task_count++;

    // 保存任命结果
    let matchResult = app.gameMgr.matchResult
    let ret = matchResult.storeResult(data.room_hash, data.game_id, data.player_pubkey_list, data.supervison_node_list)
    let role = app.consts.ROOM_WORK_TYPE.LOGIC
    matchResult.setRoomWorkType(data.room_hash, role)
    matchResult.setRoomWorkTypeByUser(data.game_id, data.player_pubkey_list, role)

    // supervisor peer list
    let snl = data.supervison_node_list;
    if (snl) {
        let peers = [];
        snl.forEach(node => {
            peers.push(new Peer(node.node_hash_address, node.ip_address, node.http_port));
        });
        this.supervisorPeersMap.set(roomId, peers);
    }
    logger.debug("逻辑节点任命完成!")
};


/**
 * 收到中心服务器的匹配成功
 * @param {Object} data
 * 数据格式应包含
 * pubkey_list
 * room_node_ip
 * room_node_port
 * room_hash
 */
LogicCapability.prototype.onMessageDataVerified = async function (message) {
    // message:=   {type: 'message_data_verified', userId: '', hash: '', sig: '', signer: ''}
    const userId = message.userId;
    const gameId = message.gameId;
    const key = userId + gameId;

    if (this.pendingWriteMap.has(key)) {

        let pendingWrite = this.pendingWriteMap[key];
        let signers = pendingWrite.signers;
        signers.push({signer: message.signer, sig: message.sig});

        const roomId = app.gameMgr.matchResult.getRoomId(gameId, userId);
        const supervisorNodes = this.supervisorPeersMap.get(roomId);
        const Threshold = Math.floor(supervisorNodes.length * 2 / 3);

        if (signers.length > Threshold) {

            if (pendingWrite.status !== 'writing') {
                pendingWrite.status = 'writing';

                const node = this.context;

                const storagePeers = storage.storagePeersMap.get(userId);
                const N = storagePeers.length;
                const CONSENSUS = Math.floor(N * 2 / 3);

                let respArray = [];
                let rpcAll = storagePeers.map((peer) => {
                    let p = node.signAndSend(peer, {
                        type: 'rpc_storage_write',
                        userId: userId,
                        gameId: gameId,
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

                this.pendingWriteMap.delete(key);

                //succeeded write count
                if (respArray.length > CONSENSUS) {
                    pendingWrite.callback(null, pendingWrite.digest);
                }
                else {
                    pendingWrite.callback(new ConsensusError(), null);
                }
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
 * @param gameId
 * @return Promise
 */
LogicCapability.prototype.read = function (userId, gameId) {
    if (!(userId && gameId)) {
        return BB.reject(new Error('userId or gameId null'));
    }

    const node = this.context;

    const storagePeers = storage.storagePeersMap.get(userId);
    const N = storagePeers.length;
    const CONSENSUS = Math.floor(N * 2 / 3);

    // send RPC request to all assigned peers for data
    //request := {type: 'rpc_storage_read', userId: '', gameId: ''}
    let respArray = [];
    let rpcAll = storagePeers.map((peer) => {
        let p = node.signAndSend(peer, {type: 'rpc_storage_read', userId: userId, gameId: gameId});
        return p.reflect();
    });

    BB.all(rpcAll).then((inspects) => {
        inspects.forEach(ins => {
            if (ins.isFulfilled()) {  // succeed
                //response := {userId: '', gameId: '', data: {}, ts: '', digest: '', sig: '', signer: ''}
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
 * @param gameId
 * @param data
 * @param cb
 */
LogicCapability.prototype.write = function (userId, gameId, data, cb) {

    if (!(userId && gameId)) {
        setImmediate(function () {
            cb(new Error('userId or gameId null'), null);
        });
        return;
    }

    if (!data) {
        setImmediate(function () {
            cb(new Error('data not specified'), null);
        });
        return;
    }

    let pendingWriteMap = this.pendingWriteMap;

    const key = userId + gameId;

    //not allowed to reentry
    if (pendingWriteMap.has(key)) {
        setImmediate(function () {
            cb(new Error('reentry not allowed'), null);
        });
        return;
    }

    const node = this.context;

    const roomId = app.gameMgr.matchResult.getRoomId(gameId, userId);
    const supervisorNodes = this.supervisorPeersMap.get(roomId);

    // send data verification request to all supervisor nodes
    // asynchronously
    // {type: 'message_data_verify', userId: '', gameId: '', digest: '0x...', peer: {ip: '', port: n}}
    let hash = util.keccak(util.toBuffer(JSON.stringify(data)));
    let timestamp = Date.now();
    let verifyReq = {
        type: 'message_data_verify',
        ts: timestamp,
        userId: userId,
        gameId: gameId,
        digest: util.bufferToHexWith0x(hash),
        peer: {ip: app.config.net.wsaddr, port: app.config.net.p2pport}
    };

    supervisorNodes.forEach(s => {
        node.signAndSend(s, verifyReq).catch(err => {
            logger.warn("write: failed to send verification msg to " + s);
        });
    });

    if (cb && typeof cb === 'function') {
        pendingWriteMap[key] = {
            callback: cb,
            data: data,
            digest: util.bufferToHexWith0x(hash),
            ts: timestamp,
            status: 'wait',
            signers: []
        };
    }

    // handle write timeout
    setTimeout(function () {
        let pendingWrite = pendingWriteMap.get(key);
        if (pendingWrite.status === 'wait') {
            pendingWrite.callback(new Error('timeout'), null);
        }
        pendingWriteMap.delete(key);

    }, WriteTimeout);

    //function ends up here
};


LogicCapability.prototype.batchWrite = function (arrayOfData) {
    throw new Error('not impl.');
};

LogicCapability.prototype.on_matched = function(data){
    logger.info('匹配完成',data);
    let gameId = data.params.game_id
    let game = app.gameMgr.getGame(gameId)
    let userList = data.params.player_pubkey_list
    let packet = {}
    for(let u of userList) {
        game.userMgr.send(u, packet)
    }
}

module.exports = LogicCapability;
