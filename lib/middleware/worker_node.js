/*
    Worker
    工作节点向中心节点的逻辑
*/
var superagent = require('superagent');
var packetManager = require('../../layacloud-common/packet_manager.js');
const version = require('./lib/version.js')
var nodeKey = require('./node_key');
var Worker = {};
/**
 * 节点初始化
 * @param 
 */
Worker.regist_to_center = function(){
    var packet = {};
    packet.ip_address = app.config.net.p2paddr;
    packet.ws_port = app.config.net.wsport;
    packet.http_port = app.conig.net.p2pport;
    packet.version = version();

    var sign_packet = packetManager.packet(nodeKey.get_local_private(),packet);
    Worker.post('regist_to_center_node',sign_packet);
        
}


Worker.post_to_center = function(method, packet,cb){
    var url = app.config.center.domain + method;
    console.log('post to center :',url);
    superagent.post(url)
              .send(packet)
              .end(function(err,res){

              })
}   

module.exports = Worker;