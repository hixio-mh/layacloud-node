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

    node.handleMessage('on_appointment_sup_node', this.onAppointed);
    node.handleMessage('message_data_verify', this.onMessageVerifyData);

    this.startDataVerificationJob();
};

/**
 * 当被任命为监督节点
 * @param {*} data
 */
Supervisor.prototype.onAppointed = function (input) {
    let data = input.data
    logger.debug("当任命为监督节点, input:", input)
    let ret = gameMgr.matchResult.store(data.room_hash, data.player_pubkey_list)
    if (ret) {
        let role = app.consts.ROOM_ROLE.SUPERVISOR
        gameMgr.matchResult.setRoomRole(data.room_hash, role)
        gameMgr.matchResult.setRoomRoleByUser(data.game_id, data.player_pubkey_list, role)
    }
};


/**
 * 向本监督节点发送了数据验证请求的广播，本监督节点保存请求， 异步验证处理。
 * @param message
 */
Supervisor.prototype.onMessageVerifyData = function (message) {
    this.verifyRequestQueue.push(message);
};


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