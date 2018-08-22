/*
    与中心节点的一些交互，例如注册节点，探寻节点消息等
*/
var CenterHelper = require('./center_helper')
var co = require('co')
var SysInfo = require('../utils/sys_info');
const PUtil = require('../game/protocol_util.js')

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
     node.handleWsMessage('user.login',this.on_user_login.bind(this));

     //注册http回调
     node.handleMessage('sysinfo',this.on_center_ask_sysinfo.bind(this))

     node.handleMessage('test', this.onTestMessage.bind(this));
};


FoundationCapability.prototype.onTestMessage = function(message) {
    logger.debug('got test message', message);
};



FoundationCapability.prototype.on_center_ask_sysinfo = async function(data){
    //logger.info('on_center_ask_sysinfo',data);
    var sys_result =   await SysInfo.get_node_sys()
    //logger.info('',sys_result);
    return sys_result;
}


/*
    Client --> 工作节点
*/
FoundationCapability.prototype.on_user_login = function(socket,data){
    logger.info('收到用户登录请求',data);

    co(function*(){
        //转发给中心服务器
        let params = data.params
        var userId = params.userid;
        let token = params.token
        var result = yield function(done){
            CenterHelper.player_login_to_center(data.params.gameid, userId, token, done);
        };

        if(result.retcode === 0){

            var logic_node_info = result.data.logic_node;

            //返回逻辑节点信息给客户端
            let packet = PUtil.userJoined(0, logic_node_info.node_hash_address, 
                    logic_node_info.ip_address, logic_node_info.ws_port, -1)
            logger.debug('返回逻辑节点信息给客户端',packet)

            socket.send(JSON.stringify(packet));
        }
        else{
            logger.info(result.msg);
        }
    })
    

}



module.exports = FoundationCapability;
