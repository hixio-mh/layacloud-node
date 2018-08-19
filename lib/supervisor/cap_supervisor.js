const gameMgr = require("../game/game_mgr.js");
const util = require('../common/util');
const nodeKey = require('../foundation/node_key');
const Peer = require('../p2p/peer');


function Supervisor() {
    this.cap = 'supervisor';
    this.context = null;

    this.stop = false;
    this.verifyRequestQueue = [];
}

/**
 * initialize supervisor capability
 * @param {Object} params
 */
Supervisor.prototype.init = function (params) {
};


/**
 * register this capability to the layanode
 * @param {LayaNode} node
 */
Supervisor.prototype.enroll = function (node) {
    this.context = node;

    node.handleMessage('on_appointment_sup_node', this.onAppointed.bind(this));
    node.handleMessage('message_data_verify', this.onMessageVerifyData.bind(this));
    node.handleMessage('sync_logic_event', this.onSyncLogicEvent.bind(this));
    node.handleMessage('sync_sys_event', this.onSyncSysEvent.bind(this));

    this.startDataVerificationJob();
};

/**
 * 当被任命为监督节点
 * @param {*} data
 */
Supervisor.prototype.onAppointed = function (input) {
    let data = input.data
    logger.debug("当任命为监督节点, input:", input)
    let matchResult = app.gameMgr.matchResult
    let ret = matchResult.storeResult(data.room_hash, data.game_id, data.player_pubkey_list, data.supervison_node_list)
    let role = app.consts.ROOM_WORK_TYPE.SUPERVISOR
    matchResult.setRoomWorkType(data.room_hash, role)
    matchResult.setRoomWorkTypeByUser(data.game_id, data.player_pubkey_list, role)
    logger.debug("监督节点任命完成!")
};


/**
 * 向本监督节点发送了数据验证请求的广播，本监督节点保存请求， 异步验证处理。
 * @param message
 */
Supervisor.prototype.onMessageVerifyData = function (message) {
    this.verifyRequestQueue.push(message);
};

/**
 * 收到同步数据
 * @param {*} message 
 */
Supervisor.prototype.onSyncLogicEvent = function(input) {
    logger.debug("收到来自逻辑节点:%s 的同步事件:", input.sender, input)
    let data = input.data
    // FIXME: gameid和roomid信息，应该是客户端协议中携带，防止逻辑节点随意修改，破坏其它的room
    // 可以考虑分配节点后，一组逻辑+监督节点，设置某个token，作为消息同步的密钥，一定程度上防止恶意的干扰
    let token = data.token
    let eventList = data.list 

    let {gameId, roomId} = app.gameMgr.getMatchInfoByToken(token)
    let game = app.gameMgr.getGame(gameId)
    let room = game.roomMgr.getRoom(roomId)
    for(let ev of eventList) {
        room.recvEventFromLogic(ev[0], ev[1], ev[2])
    }
}

/**
 * 逻辑节点同步系统事件到监督节点
 * @param {*} input 
 */
Supervisor.prototype.onSyncSysEvent = function(input) {
    logger.debug("收到系统同步事件:", input)
    let [type, data] = input.data.list
    if(type == "enter") {
        // 用户进入游戏
        app.gameMgr.onSyncRoomJoin(data)
    } else if(type == "close") {
    
    }
}

/**
 *
 * @param reqNode
 * @param userId
 * @param gameId
 * @param userDataDigest
 * @param ts
 * @return {boolean}
 */
Supervisor.prototype.approveUserData = function (reqNode, userId, gameId, userDataDigest, ts) {
    //TODO: now just return true
    return true;
};


Supervisor.prototype.startDataVerificationJob = function () {
    let node = this.context;
    let that = this;
    let run = function () {
        try {
            let item = that.verifyRequestQueue.pop();
            if (item) {
                // {sender: '0x...', nonce: n, data: {type: 'message_data_verify', userId: '', gameId: '',
                // digest: '0x...', peer: {ip: '', port: n}}}
                let userId = item.data.userId;
                let gameId = item.data.gameId;
                let userDataDigest = item.data.digest;
                let ts = item.data.ts;
                let sender = item.sender;

                if (that.approveUserData(sender, userId, gameId, userDataDigest, ts)) {
                    //sign to approve the data
                    let hash = util.keccak(util.toBuffer(JSON.stringify(data)));
                    let sig = util.sign(hash, nodeKey.get_local_private());

                    let verifyRes = {
                        type: 'message_data_verified',
                        userId: userId,
                        gameId: gameId,
                        digest: util.bufferToHexWith0x(hash),
                        sig: util.toSignatureString(sig.r, sig.s, sig.v),
                        signer: node.nodeId
                    };
                    let peer = new Peer(sender, item.data.peer.ip, item.data.peer.port);
                    node.send(peer, verifyRes);
                }
            }
        }
        finally {
            if (!that.stop)
                setTimeout(run, 100);
        }
    };

    setTimeout(run, 100);
};


module.exports = Supervisor;
