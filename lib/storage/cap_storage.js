const dbprovider = require('./dbprovider_level');

/**
 *
 * @constructor
 */
function Storage() {
    this.cap = 'storage';
    this.context = null;

}


Storage.prototype.init = function (params) {
    dbprovider.init(params.storagedb);
};


Storage.prototype.enroll = function (node) {
    this.context = node;
    node.handleMessage('rpc_StorageRead', (data) => {
        console.log("storage got data");
        console.log(data);

        return {a: 'a', b: 'b'};
    });
};


/**
 * load user data
 * @param userId
 * @return Promise
 */
Storage.prototype.read = function (userId) {

    // get peers that store the user data

    // send rpc request to peers for data

    // consensus

    // return result


};


/**
 * store user data
 * @param userId
 * @param data
 * @return Promise
 */
Storage.prototype.write = function (userId, data) {

};


Storage.prototype.batchWrite = function (arrayOfData) {
};



const instance = new Storage();


module.exports = instance;