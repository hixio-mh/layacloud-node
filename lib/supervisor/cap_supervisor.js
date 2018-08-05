const gameMgr = require("../game/game_mgr.js")

function Supervisor() {
    this.cap = 'supervisor';
    this.context = null;
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

    node.handleMessage('message_data_verify', this.handleMessageVerifyData);
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
        gameMgr.matchResult.setRoomRole(data.room_hash, app.consts.ROOM_ROLE.SUPERVISOR)
    }
};


/**
 * 向本监督节点发送了数据验证请求的广播，本监督节点保存请求， 异步验证处理。
 * @param message
 */
Supervisor.prototype.handleMessageVerifyData = function (message) {


};


module.exports = Supervisor;