const format = require('string-format');


/**
 *
 * @param {String}nid node id (or address)
 * @param {String}ip  node IP or domain name
 * @param {Number}port node port numbers
 * @constructor
 */
function Peer(nid, ip, port) {
    this.nid = nid;
    this.ip = ip;
    this.port = port;
}


Peer.prototype.httpurl = function () {
    return format('http://{ip}:{port}', this);
};


module.exports = Peer;


