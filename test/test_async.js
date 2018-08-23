const BB = require('bluebird');

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


    const plainFn = function () {
        return 2;
    }


    ret = await plainFn(); // ok to await on plain function

    console.log(ret);
}


testAsync();