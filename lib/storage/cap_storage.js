/**
 * 
 * @constructor
 */
function Storage() {
    this.cap = 'storage';
    this.context = null;

}


Storage.prototype.init = function (params) {

};


Storage.prototype.enroll = function (node) {
    this.context = node;
    node.handleMessage('rpc_ReadStorage', (data) => {
        console.log("storage got data");
        console.log(data);

        return {a: 'a', b: 'b'};
    });
};


module.exports = Storage;