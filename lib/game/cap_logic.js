const gameMgr = require("./game_mgr.js")
// const WsServer = require('../ws_server.js');
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
    this.supervisorPeersMap = {};

    // userid => {callback: <cb>, data: <data>, count: <k>, signers: [{account, sig}]
    this.pendingWriteMap = {};

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

    let ret = gameMgr.matchResult.store(roomId, userList);
    if (ret) {
        let role = app.consts.ROOM_ROLE.LOGIC;
        gameMgr.matchResult.setRoomRole(roomId, role);
        gameMgr.matchResult.setRoomRoleByUser(gameId, userList, role);
    }

    // supervisor peer list
    let snl = data.supervison_node_list;
    if (snl) {
        let peers = [];
        snl.forEach(node => {
            peers.add(new Peer(node.node_hash_address, node.ip_address, node.http_port));
        });
        this.supervisorPeersMap.set(roomId, peers);
    }
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
LogicCapability.prototype.on_matched = function (data) {
    logger.info('匹配完成', data);
};


LogicCapability.prototype.onMessageDataVerified = async function (message) {
    // message:=   {type: 'message_data_verified', userId: '', hash: '', sig: '', signer: ''}
    let userId = message.userId;

    if (this.pendingWriteMap.has(userId)) {

        let pendingWrite = this.pendingWriteMap[userId];
        let signers = pendingWrite.signers;
        signers.push({signer: message.signer, sig: message.sig});

        let roomId = gameMgr.matchResult.getRoomId(userId);
        let supervisorNodes = this.supervisorPeersMap.get(roomId);
        const Threshold = Math.floor(supervisorNodes.length * 2 / 3);

        if (signers.length > Threshold) {

            if (pendingWrite.status !== 'writing') {
                pendingWrite.status = 'writing';

                let node = this.context;
                let storagePeers = storage.storagePeersMap.get(userId);

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
LogicCapability.prototype.read = function (userId) {
    let node = this.context;

    let storagePeers = storage.storagePeersMap.get(userId);

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
 * @param cb
 */
LogicCapability.prototype.write = function (userId, data, cb) {
    let node = this.context;
    let pendingWriteMap = this.pendingWriteMap;

    let roomId = gameMgr.matchResult.getRoomId(userId);
    let supervisorNodes = this.supervisorPeersMap.get(roomId);

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
        pendingWriteMap[userId] = {
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
        let pendingWrite = pendingWriteMap.get(userId);
        if (pendingWrite.status === 'wait') {
            pendingWrite.callback(new Error('timeout'), null);
        }
        pendingWriteMap.delete(userId);

    }, WriteTimeout);

    //function ends up here
};


LogicCapability.prototype.batchWrite = function (arrayOfData) {
    throw new Error('not impl.');
};


module.exports = LogicCapability;