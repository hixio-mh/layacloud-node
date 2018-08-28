const program = require('commander');
const fs = require('fs');
const prompt = require('prompt');
const BB = require('bluebird');
const format = require('string-format');
const WebSocket = require('ws');

const httpClient = require('../lib/p2p/http_client');
const Peer = require('../lib/p2p/peer');


let Config;
let ws;

let loginNode;

program
    .version('0.0.1')
    .description('mock client')
    .option('--config <config.json>', 'client configuration file in JSON', './mock_client_config.json')
    .parse(process.argv);


fs.readFile(program.config, (err, data) => {

    if (err) {
        console.error(err);
        process.exit(1);
    }
    else {
        Config = JSON.parse(data);
    }
});


process.on('SIGINT', function () {
    if(ws)
        ws.close();
    process.exit(1);
});



console.log('MOCK client started');


async function login(command) {
    let peerIp = command[1] || 'localhost';
    let port = command[2] || 8656;

    let url = format('ws://{}:{}', peerIp, port);
    console.log('connect to ' + url);

    ws = new WebSocket(url);

    ws.on('open', function open() {
        console.log('websocket connected');
        let data = {
            url: 'user.login',
            params: {
                userid: Config.user_id,
                gameid: Config.game_id,
                token: ''
            }
        };
        ws.send(JSON.stringify(data));
    });

    ws.on('message', function incoming(data) {
        console.log(data);
        let obj = JSON.parse(data);
        if (obj.url === 'user.logined') {
            loginNode = new Peer(obj.params.node_hash_address, obj.params.ip_address, 30656);
        }

    });
}


async function rpc(command) {

    let rpc_command = command[1];
    let messageType;
    let rpcMessage = {};

    switch (rpc_command) {
        case 'read':

            rpcMessage.type = 'test_read_data';
            rpcMessage.userId = Config.user_id;
            rpcMessage.gameId = Config.game_id;
            break;
        case 'write':
            rpcMessage.type = 'test_write_data';
            rpcMessage.userId = Config.user_id;
            rpcMessage.gameId = Config.game_id;
            rpcMessage.data = JSON.parse(command[2]);
            break;
        default:
            throw new Error('not support rpc ' + rpc_command);
    }

    let url = format('{}/{}', loginNode.httpurl(), rpcMessage.type);
    let response = await httpClient.post(url, rpcMessage);

    console.log(JSON.stringify(response, null, 4));
}


async function loop() {
    const readCommandFn = BB.promisify(prompt.get);
    while (true) {
        let input = await readCommandFn({
            name: 'command',
        });

        let command = input.command.split(' ');

       // console.log(command);
        switch (command[0]) {
            case 'show':
                console.log(JSON.stringify(Config, null, 4));
                break;
            case 'login':

                try {
                    await login(command);
                }catch (e) {
                    console.log(e.message);
                }

                break;
            case 'rpc':
                try {
                    await rpc(command);
                }catch (e) {
                    console.log(e.message);
                }
                break;

            case 'exit':
            case 'quit':
                throw new Error('exit');
                break;

            default:
                break;
        }
    }
}

loop().catch(e => {
    console.error(e.message);
});

