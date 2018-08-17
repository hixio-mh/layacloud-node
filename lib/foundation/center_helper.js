/*
    Worker
    工作节点向中心节点的逻辑
*/
var httpclient = require('../p2p/http_client')
var packetManager = require('../common/packet_manager.js');
var lcc = require('../common/util.js');
const version = require('../version.js');
var nodeKey = require('./node_key');
var co = require('co');
var sysinfo = require('../utils/sys_info');

var Worker = {};

Worker.local_pk = undefined
/**
 * 节点初始化，向中心服务器注册
 * @param 
 */
Worker.regist_to_center = function(cb){

    co(function*(){
        try{
            logger.info('start regist to center',app.config.net.wsaddr)
            var packet = {};


            packet.ip_address = app.config.net.wsaddr;
            // packet.ip_address = sysinfo.get_local_ip4(); // 测试用


            packet.ws_port = app.config.net.wsport;
            packet.http_port = app.config.net.p2pport;
            packet.version = version();
            let local_pk = nodeKey.get_local_private();
            local_pk = lcc.hexToBuffer(local_pk);
            Worker.local_pk = local_pk;
            var sign_packet = packetManager.packet(local_pk,packet);
            var url = Worker.url('regist_to_center_node');
            logger.info(url,sign_packet);
            var result = yield httpclient.post(url,sign_packet);
            if(result.retcode == 0){
                logger.info('向中心节点注册成功，节点已加入网络');
                cb(null,true)
            }
            else{
                logger.info('向中心节点注册失败',result.msg);
                logger.info('30秒后重试')
                cb(null,false)
            }
            
        }
        catch(e){
            logger.error('向中心节点注册失败',e);
            logger.info('30秒后重试')
            cb(null,false)
        }
    })
    
    
}

/**
 * 向中心服务器转发用户登录请求
 * game_id //游戏Id
 * user_id //用户公钥
 * token //签名
 */

Worker.player_login_to_center = function(gameid, userid, token,cb){
    var packet = {};
    packet.game_id = gameid;
    packet.player_pubkey = userid;
    packet.sign = token;
    Worker.post_to_center('player_login_to_center',packet,function(err,res){
        if(cb){
            cb(err,res);
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
Worker.match_game_to_center = function(game_id ,user_pubkey, game_config, match_value, cb){
    var packet = {};
    packet.game_id = game_id;
    packet.player_pubkey = user_pubkey;
    packet.game_config = game_config
    package.match_value = match_value
    Worker.post_to_center('player_match_to_center',packet,function(err,res){
        if(cb){
            cb(err,res);
        }
    })
}

Worker.post_to_center = function(method,packet,callback){

    co(function*(){
        try{
            let local_pk = nodeKey.get_local_private();
            local_pk = lcc.hexToBuffer(local_pk);
            var sign_packet = packetManager.packet(Worker.local_pk,packet);

            var url = Worker.url(method);
            logger.debug("post_to_center url:%s", url, sign_packet);
            var result = yield httpclient.post(url,sign_packet);
            callback(null,result)
        }
        catch(e){
            logger.error('CenterHelper.post_to_center excpetion',e);
            callback(e,{});
        }
        
    })
   
}


Worker.url = function(method){
    var url = app.config.center.debug_domain + method;
    return url;
}   

module.exports = Worker;