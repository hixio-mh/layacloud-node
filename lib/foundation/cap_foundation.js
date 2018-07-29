/*
    与中心节点的一些交互，例如注册节点，探寻节点消息等
*/

var CenterHelper = require('./center_helper')
var co = require('co')
/**
 *
 * @constructor
 */
function FoundationCapability() {
    this.cap = 'foundation';
    this.context = null;

}


FoundationCapability.prototype.init = function (params) {
   
    
};


FoundationCapability.prototype.enroll = function (node) {
    this.context = node;

     //向中心节点注册
     var that = this;
     co(function*(){
         var regist_done = yield function(done){
             CenterHelper.regist_to_center(done);
         }
         if(regist_done == false){
             setTimeout(() => {
                 that.init();
             }, 1000 * 30);
         }
     })

     //注册ws回调
     node.handleWsMessage('user.login',this.on_user_login);
};

/*
    Client --> 工作节点
*/
FoundationCapability.prototype.on_user_login = function(socket,data){
    logger.info('收到用户登录请求',data);

    co(function*(){
        //转发给中心服务器  //测试数据
        var result = yield function(done){
            CenterHelper.player_login_to_center(data.gameid,"0xd8ACcED8A7A92b334007f9C6127A848fE51D3C3b","123",done);
        }



        if(result.retcode == 0){

            var logic_node_info = result.data.logic_node;

            //返回逻辑节点信息给客户端
            var cloud_sdk_packet = {};
            cloud_sdk_packet.url = 'user.logined';
            cloud_sdk_packet.params = {};
            cloud_sdk_packet.params.code = 0;
            cloud_sdk_packet.params.node_hash_address = logic_node_info.node_hash_address;
            cloud_sdk_packet.params.ip_address = logic_node_info.ip_address;
            cloud_sdk_packet.params.port = logic_node_info.ws_port;
            cloud_sdk_packet.params.ssl_port = -1;

            logger.debug('返回逻辑节点信息给客户端',cloud_sdk_packet)


            socket.send(JSON.stringify(cloud_sdk_packet));
        }
    })
    

}



module.exports = FoundationCapability;