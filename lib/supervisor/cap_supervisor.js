function Supervisor() {
    this.cap = 'supervisor';
    this.context = null;

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
    node.handleMessage('sync_logic_event', this.onSyncLogicEvent);
    node.handleMessage('sync_sys_event', this.onSyncSysEvent);

    this.startVerificationJob();
};

/**
 * 当被任命为监督节点
 * @param {*} data
 */
Supervisor.prototype.onAppointed = function (input) {
    let data = input.data
    logger.debug("当任命为监督节点, input:", input)
    let game = app.gameMgr.getGame(data.game_id)
    if(!game) {
        return
    }
    let ret = game.matchResult.store(data.room_hash, data.player_pubkey_list)
    let role = app.consts.ROOM_ROLE.SUPERVISOR
    game.matchResult.setRoomRole(data.room_hash, role)
    app.gameMgr.setRoomRoleByUser(data.game_id, data.player_pubkey_list, role)
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
    for(let ev fo eventList) {
        room.recvEventFromLogic(ev[0], ev[1], ev[2])
    }
}

/**
 * 逻辑节点同步系统事件到监督节点
 * @param {*} input 
 */
Supervisor.prototype.onSyncSysEvent = function(input) {
    let [type, data] = input.data
    if(type == "enter") {
        // 用户进入游戏
        app.gameMgr.onSyncRoomJoin(data)
    } else if(type == "close") {
    
    }
}

Supervisor.prototype.startVerificationJob = function () {
    let that = this;
    let run = function () {
        try{
            let item = that.verifyRequestQueue.pop();
            if(item) {

            }


        }
        finally {
            if (!this.stop)
                setTimeout(run, 100);
        }
    };

    setTimeout(run, 100);
};


module.exports = Supervisor;