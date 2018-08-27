/*
    Worker
    工作节点向中心节点的逻辑
*/

var co = require('co');
var format = require('string-format');
var httpclient = require('../p2p/http_client')
var packetManager = require('../common/packet_manager.js');
var lcc = require('../common/util.js');
const version = require('../version.js');
var nodeKey = require('./node_key');
var sysinfo = require('../utils/sys_info');

var Worker = {};

Worker.local_pk = undefined
/**
 * 节点初始化，向中心服务器注册
 * @param
 */
Worker.regist_to_center = function (cb) {

    co(function* () {
        try {
            logger.info('start regist to center', app.args.addr)
            var packet = {};

            packet.ip_address = app.args.addr;
            if (app.args.addr === '0.0.0.0') { // try to get ip from local interface
                packet.ip_address = sysinfo.get_local_ip4();
            }

            packet.ws_port = app.args.gport;
            packet.http_port = app.args.pport;
            packet.version = version();
            let local_pk = nodeKey.get_local_private();
            local_pk = lcc.hexToBuffer(local_pk);
            Worker.local_pk = local_pk;
            var sign_packet = packetManager.packet(local_pk, packet);
            var url = Worker.url('regist_to_center_node');
            logger.info(url, sign_packet);
            var result = yield httpclient.post(url, sign_packet);
            if (result.retcode == 0) {
                logger.info('向中心节点注册成功，节点已加入网络');
                cb(null, true)
            }
            else {
                logger.info('向中心节点注册失败', result.msg);
                logger.info('30秒后重试')
                cb(null, false)
            }

        }
        catch (e) {
            logger.error('向中心节点注册失败', e);
            logger.info('30秒后重试')
            cb(null, false)
        }
    })


}

/**
 * 向中心服务器转发用户登录请求
 * game_id //游戏Id
 * user_id //用户公钥
 * token //签名
 */

Worker.player_login_to_center = function (gameid, userid, token, cb) {
    var packet = {};
    packet.game_id = gameid;
    packet.player_pubkey = userid;
    packet.sign = token;
    Worker.post_to_center('player_login_to_center', packet, function (err, res) {
        if (cb) {
            cb(err, res);
        }
    });


}

/**
 * 向中心服务器投递匹配请求
 * 匹配成功后还是从HTTP回来告知成功
 * @param {*} game_id 游戏ID
 * @param {*} user_pubkey 用户pubkey
 * @param {*} game_config config.json中定义的房间信息
 * @param {*} match_value 匹配使用的值
 */
Worker.match_game_to_center = function (game_id, user_pubkey, game_config, match_value, cb) {
    var packet = {};
    packet.game_id = game_id;
    packet.player_pubkey = user_pubkey;
    packet.game_config = game_config
    packet.match_value = match_value
    Worker.post_to_center('player_match_to_center', packet, function (err, res) {
        if (cb) {
            cb(err, res);
        }
    })
}

/**
 * 向中心请求玩家数据上链
 * @param {*} room_hash 房间id
 * @param {*} game_id 游戏ID
 * @param {*} player_pubkey 用户pubkey
 * @param {*} data 用户数据
 * @param {*} sig 签名数据
 */
Worker.write2chain_request_to_center = function (room_hash, game_id, player_pubkey, data, sig, cb) {
	try {
		var packet = {
			room_hash,
			game_id,
			player_pubkey,
			data,
			sig
		};
		
		Worker.post_to_center('player_data_to_chain', packet, function (err, res) {
			if (res.retcode == 0) {
				cb(null, true);
			} else {
				cb(null, false);
			}
		});
	}
	catch (e) {
		logger.error('向中心节点请求数据上链失败', e);
		cb(null, false);
	}
}

/**
 * 提交工作量
 * @param {*} game_id 游戏ID
 * @param {*} user_pubkey 用户pubkey
 * @param {*} game_config config.json中定义的房间信息
 * @param {*} match_value 匹配使用的值
 */
Worker.on_battle_over_savedone = function (room_hash, room_hash_sign, cb) {
    var packet = {};
    packet.room_hash = room_hash
    packet.room_hash_sign = room_hash_sign;
    Worker.post_to_center('on_battle_over_savedone', packet, function (err, res) {
        if (cb) {
            cb(err, res);
        }
    })
}

/**
 * 玩家下线，通知
 * TODO: 节点和服务器交互，需要安全机制，添加某个token，防止滥用
 */
Worker.player_offline = function(gameId, userId, cb) {
    var packet = {}
    packet.player_pubkey = userId
    packet.game_id = gameId
    Worker.post_to_center('player_offline', packet, function (err, res) {
        if (cb) {
            cb(err, res);
        }
    })
}

/**
 * 对局结束回到大厅
 */
Worker.switch_to_home = function(gameId, userId, roomHash, cb) {
    var packet = {}
    packet.game_id = gameId
    packet.player_pubkey = userId
    packet.room_hash = roomHash
    Worker.post_to_center('switch_to_home', packet, function (err, res) {
        if (cb) {
            cb(err, res);
        }
    })
}


Worker.query_node_pow = function(cb) {
    Worker.post_to_center('query_node_pow', {}, cb);
}

/**
 * 查询合约abi及地址
 * @param {*} game_id 
 * @param {*} cb 
 */
Worker.query_contract_info = function(game_id, cb) {
    Worker.post_to_center('query_contract_info', {
		game_id
	}, cb);
}

/**
 * 查询玩家是否在线
 * @param {*} player_pubkey 
 * @param {*} game_id
 * @param {*} cb 
 */
Worker.query_player_online = function(player_pubkey, game_id, cb) {
    Worker.post_to_center('query_player_online', {
		player_pubkey,
		game_id
	}, cb);
}

Worker.post_to_center = function (method, packet, callback) {

    co(function* () {
        try {
            let local_pk = nodeKey.get_local_private();
            local_pk = lcc.hexToBuffer(local_pk);
            var sign_packet = packetManager.packet(Worker.local_pk, packet);

            var url = Worker.url(method);
            logger.debug("post_to_center url:%s", url, sign_packet);
            var result = yield httpclient.post(url, sign_packet);
            callback(null, result)
        }
        catch (e) {
            logger.error('CenterHelper.post_to_center excpetion', e,Worker.url(method),packet);
            callback(e, {});
        }

    })

}


Worker.url = function (method) {
    return format('{}/{}', app.args.curl, method);
}

module.exports = Worker;
