
const layanode = require('../lib/layanode');
const Peer = require('../lib/p2p/peer');
const BB = require('bluebird');


function testSend() {

    let p = layanode.send(new Peer('abc', 'localhost', 30656), {type: 'rpc_storage_write'});

    console.log(p);

    let pr = p.reflect();

    console.log(pr);
}



async function testAsync() {

    // async func
    const asyncFn = async function () {
        return 1;
    };


    let p = asyncFn();
    console.log(p instanceof Promise); // async func returns native Promise


    const bbFn = function () {  // bluebird promise
        return BB.resolve(1);
    };

    p = bbFn();
    console.log(p instanceof BB.Promise);


    let ret = await bbFn();   // good to await a bluebird promise
    console.log(ret);


    const npFn = function () {  //native promise
        return new Promise((resolve, reject) => {
            resolve(1);
        });
    };

    p = npFn();
    console.log(p instanceof Promise);

    ret = await npFn();  // good to await native promise
    console.log(ret);


}


testAsync();