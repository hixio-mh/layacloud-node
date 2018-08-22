const BB = require('bluebird');
const format = require('string-format');

const httpClient = require('../p2p/http_client');
const Peer = require('../p2p/peer');


function RpcClient() {
}


RpcClient.prototype.call = async function (method, args, peer) {
    peer = peer || new Peer('', 'localhost', 30656);
    let message = { type: method, args: args};
    let url = format('{}/{}', peer.httpurl(), method);
    return await httpClient.post(url, message);
};



module.exports = RpcClient;