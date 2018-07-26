/*
    Worker
    工作节点向中心节点的逻辑
*/
var httpclient = require('../p2p/http_client')
var packetManager = require('../../layacloud-common/packet_manager.js');
var lcc = require('../../layacloud-common/util');
const version = require('../version.js');
var nodeKey = require('./node_key');
var config = require('../../config/default.json');
var co = require('co');

var Worker = {};
/**
 * 节点初始化
 * @param 
 */
Worker.regist_to_center = function(cb){

    co(function*(){
        try{
            logger.info('start regist to center')
            var packet = {};
            packet.ip_address = config.net.p2paddr;
            packet.ws_port = config.net.wsport;
            packet.http_port = config.net.p2pport;
            packet.version = version();
            let local_pk = nodeKey.get_local_private();
            local_pk = lcc.hexToBuffer(local_pk);
            var sign_packet = packetManager.packet(local_pk,packet);
            var url = Worker.url('regist_to_center_node');
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


Worker.url = function(method){
    var url = config.center.debug_domain + method;
    return url;
}   

module.exports = Worker;