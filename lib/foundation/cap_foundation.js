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
    
};


FoundationCapability.prototype.enroll = function (node) {
    this.context = node;

};




module.exports = FoundationCapability;