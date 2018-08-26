const BB = require('bluebird');
const format = require('string-format');
const SysInfo = require('../utils/sys_info');
const ConsensusError = require('../consensus/consensus_error');
const Peer = require('../p2p/peer');
const util = require('../common/util');
const sysinfo = require('../utils/sys_info');
const PUtil = require('./protocol_util.js')


const WriteTimeout = 30 * 1000; // millis


/**
 *
 * @constructor
 */
function LogicCapability() {
    this.cap = 'logic';
    this.context = null;

    // userid => [storage-peer]
    this.storagePeersMap = new Map();

    // userid+gameId => {callback: <cb>, data: <data>, count: <k>, signers: [{account, sig}]
    this.pendingWriteMap = new Map();
}


LogicCapability.prototype.init = function (params) {
    // let ws = new WsServer();
    // ws.start(params);
};


LogicCapability.prototype.enroll = function (node) {
    this.context = node;

    node.handleMessage('on_appointment_logic_node', this.onAppointed.bind(this));
    node.handleMessage('on_matched', this.on_matched.bind(this));
    node.handleMessage('on_provision_storage_nodes', this.onStorageNodeProvision.bind(this));

    node.handleMessage('message_data_verified', this.onMessageDataVerified.bind(this));

    node.handleMessage('test_write_data', this.onMessageTestWriteData.bind(this));
    node.handleMessage('test_read_data', this.onMessageTestReadData.bind(this));
};


/**
 * 收到任命成为逻辑节点
 * @param {Object} data
 *
 */
LogicCapability.prototype.onAppointed = function (input) {
    let data = input.data;
    logger.info('任命为【逻辑节点】, 房间:%s 用户列表:', data.room_hash, data.player_pubkey_list);
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
    let snl = data.supervison_node_list.map((node) => new Peer(node.node_hash_address, node.ip_address, node.http_port))
    matchResult.setRoomSupervisor(data.game_id, data.room_hash, snl)
    // logger.debug("逻辑节点任命完成!")
};


/**
 *  分配存储节点
 * @param message
 */
LogicCapability.prototype.onStorageNodeProvision = function (message) {
    logger.debug('分配存储节点消息:', message);
    const userId = message.data.player_pubkey;
    const snl = message.data.storage_list;

    if (snl) {
        let peers = [];
        snl.forEach(node => {
            peers.push(new Peer(node.node_hash_address, node.ip_address, node.http_port));
            logger.debug('add peer for user :', userId, node.ip_address);
        });

        this.storagePeersMap.set(userId, peers);
    }
};


LogicCapability.prototype.onMessageDataVerified = function (message) {
    // message:=   {type: 'message_data_verified', userId: '', hash: '', sig: '', signer: ''}
    const node = this.context;
    const userId = message.userId;
    const gameId = message.gameId;
    const roomId = message.roomId;

    const key = userId + gameId;

    if (!this.pendingWriteMap.has(key)) {
        logger.info("ignored message_data_verified message for userId " + userId);
        return;
    }

    let pendingWrite = this.pendingWriteMap.get(key);
    let signers = pendingWrite.signers;
    signers.push({signer: message.signer, sig: message.sig});

    let roomSigners = pendingWrite.roomSigners;
    roomSigners.push({signer: message.signer, sig: message.roomSig});

    let matchResult = app.gameMgr.matchResult
    const supervisorNodes = matchResult.getRoomSupervisor(gameId, roomId);
    const Threshold = Math.floor(supervisorNodes.length * 2 / 3);

    if (signers.length > Threshold) {
        if (pendingWrite.status !== 'writing') {
            pendingWrite.status = 'writing';

            const storagePeers = this.storagePeersMap.get(userId);
            const N = storagePeers.length;
            const CONSENSUS = Math.floor(N * 2 / 3);

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

                let respArray = [];
                inspects.forEach(ins => {
                    if (ins.isFulfilled()) {  // succeed
                        //response := {userId: '',  node: '' }
                        let response = ins.value();
                        logger.debug('write got ', response);
                        respArray.push(response);
                    }
                });

                this.pendingWriteMap.delete(key);

                //succeeded write count
                if (respArray.length > CONSENSUS) {
                    pendingWrite.callback(null, {digest: pendingWrite.digest, room: {id: roomId, signers: roomSigners}});
                }
                else {
                    pendingWrite.callback(
                        new ConsensusError(format('response count {}, consensus count {}.', respArray.length, CONSENSUS)),
                        null);
                }
            });
        }
        else {
            logger.info("additional message_data_verified can be ignored for already confirmed data");
        }
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
    logger.debug("cap_logic 读取用户:%s 的存储节点信息:", userId, this.storagePeersMap.keys())
    const storagePeers = this.storagePeersMap.get(userId);
    logger.debug(storagePeers);
    const N = storagePeers.length;
    const CONSENSUS = Math.floor(N * 2 / 3);

    // send RPC request to all assigned peers for data
    //request := {type: 'rpc_storage_read', userId: '', gameId: ''}
    let respArray = [];
    let rpcAll = storagePeers.map((peer) => {
        let p = node.signAndSend(peer, {type: 'rpc_storage_read', userId: userId, gameId: gameId});
        return p.reflect();
    });

    return BB.all(rpcAll).then((inspects) => {
        inspects.forEach(ins => {
            if (ins.isFulfilled()) {  // succeed
                //response := {userId: '', gameId: '', data: {}, ts: '', digest: '', sig: '', signer: ''}
                let resp = ins.value();
                // logger.debug('read got ', resp);

                let verified = false;

                let hash = util.keccak(util.toBuffer(JSON.stringify(resp.data.d)));
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
            return BB.reject(
                new ConsensusError(format('response count {}, consensus count {}.', respArray.length, CONSENSUS))
            );
        }

        // consensus made on > 2N/3 nodes
        let mapCnt = new Map();
        let mapData = new Map();
        respArray.forEach((resp) => {
            const k = resp.digest;
            if (mapCnt.has(k)) {
                mapCnt.set(k, mapCnt.get(k) + 1);
            }
            else {
                mapCnt.set(k, 1);
                mapData.set(k, resp.data);
            }
        });

        let k = 0;
        let D = null;
        for (let [d, c] of mapCnt) {
            if (k < c) {
                k = c;
                D = d;
            }
        }

        if (k > CONSENSUS) {
            return BB.resolve(mapData.get(D).d);
        }
        else {
            return BB.reject(new ConsensusError());
        }
    });
};


/**
 * store user data onto distributed storage node
 * @param gameId
 * @param roomId
 * @param userId
 * @param data
 * @param cb
 */
LogicCapability.prototype.write = function (gameId, roomId, userId, data, cb) {

    if (!(userId && gameId && roomId)) {
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

    logger.debug('pending write', pendingWriteMap);

    const key = userId + gameId;

    //not allowed to reentry
    if (pendingWriteMap.has(key)) {
        setImmediate(function () {
            cb(new Error('reentry not allowed'), null);
        });
        return;
    }

    const node = this.context;
    let game = app.gameMgr.getGame(gameId)
    if(!game) {
        logger.warn("cap_logic write写入时，game:%s 为空!", gameId)
        return
    }
    let matchResult = app.gameMgr.matchResult
    const supervisorNodes = matchResult.getRoomSupervisor(gameId, roomId)

    logger.debug("cap_logic 准备写入存储, room:%s \n数据:", roomId, data, "\n监督节点列表:", supervisorNodes);
    // send data verification request to all supervisor nodes
    // asynchronously
    // {type: 'message_data_verify', userId: '', gameId: '', digest: '0x...', peer: {ip: '', port: n}}
    let hash = util.keccak(util.toBuffer(JSON.stringify(data)));
    let timestamp = Date.now();

    let nodeIp = app.args.addr;
    if (nodeIp === '0.0.0.0') { // try to get ip from local interface
        nodeIp = sysinfo.get_local_ip4();
    }
    let verifyReq = {
        type: 'message_data_verify',
        ts: timestamp,
        userId: userId,
        gameId: gameId,
        roomId: roomId,
        digest: util.bufferToHexWith0x(hash),
        peer: {ip: nodeIp, port: app.args.pport}
    };

    supervisorNodes.forEach(s => {
        logger.debug("broadcast data verification to: ", s.ip);
        node.signAndSend(s, verifyReq).catch(err => {
            logger.warn("write: failed to send verification msg to " + s);
        });
    });

    if (cb && typeof cb === 'function') {
        pendingWriteMap.set(key, {
            callback: cb,
            data: data,
            digest: util.bufferToHexWith0x(hash),
            ts: timestamp,
            status: 'wait',
            signers: [],
            roomSigners: []
        });
    }

    // handle write timeout
    setTimeout(function () {
        let pendingWrite = pendingWriteMap.get(key);
        if (pendingWrite) {
            if (pendingWrite.status === 'wait') {
                pendingWrite.callback(new Error('timeout'), null);
            }
            pendingWriteMap.delete(key);
        }
    }, WriteTimeout);

    //function ends up here
    logger.debug('wait...');
};


LogicCapability.prototype.batchWrite = function (arrayOfData) {
    throw new Error('not impl.');
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
LogicCapability.prototype.on_matched = function (input) {
    let data = input.data
    logger.info('on_matched 匹配完成，通知玩家:%s 玩家列表:', data.notify_target_player, data.player_pubkey_list);
    let gameId = data.game_id
    let userId = data.notify_target_player
    // let userList = data.player_pubkey_list
    let game = app.gameMgr.getGame(gameId)
    let user = game.userMgr.getUser(userId)
    if(!user) {
        logger.debug("匹配成功时，玩家:%s 不再本节点中，忽略", userId)
        return
    }
    // 玩家离开原有房间
    game.roomMgr.leaveRoom(user.roomId, userId)

    // FIXME: low b方案
    setTimeout(() => {
        let packet = PUtil.userMatched(data)
        //logger.debug("向玩家:%s 发送user matched消息:", userId, packet)
        user.send(packet)
    }, 2000)

}


LogicCapability.prototype.onMessageTestReadData = async function (message) {
    const userId = message.userId;
    const gameId = message.gameId;

    try {
        let data = await this.read(userId, gameId);
        return {error: null, user: userId, game: gameId, data: data};
    }
    catch (e) {
        return {error: e.message};
    }
};


LogicCapability.prototype.onMessageTestWriteData = async function (message) {
    const userId = message.userId;
    const gameId = message.gameId;
    const data = message.data;

    const writeFn = BB.promisify(this.write).bind(this);
    try {
        return await writeFn(userId, gameId, data);
    }
    catch (e) {
        logger.debug(e);
        return {error: e.message};
    }

};

module.exports = LogicCapability;
