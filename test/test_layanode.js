
const layanode = require('../lib/layanode');
const Peer = require('../lib/p2p/peer');



function testSend() {

    let p = layanode.send(new Peer('abc', 'localhost', 30656), {type: 'test'});

    console.log(p);

    let pr = p.reflect();

    console.log(pr);
}



function testSignAndSend() {

    let p = layanode.signAndSend(new Peer('abc', 'localhost', 30656), {type: 'rpc_storage_write'});

    console.log(p);

    let pr = p.reflect();

    console.log(pr);
}






testSignAndSend();