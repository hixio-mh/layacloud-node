"use_strict";

const program = require('commander');
const config = require('config');
const version = require('./lib/version.js');
const AppBase = require('./lib/app_base.js');
const layaNode = require('./lib/layanode');
const RpcClient = require('./lib/rpc/rpc_client');
const Peer = require('./lib/p2p/peer');
const CPMgr = require('./lib/common/child_process_mgr');

program
    .version(version())
    .description('layacloud node program');

program
    .command('run')
    .description('run layacloud node')
    .option('--addr <addr>', 'the address of this node. IP or domain name')
    .option('--peer-port <pport>', 'peer communication port')
    .option('--game-port <gport>', 'game port to which game clients connect')
    .option('--curl <curl>', 'coordinator(center) url')
    .option('--no-storage', 'flag to indicate this node does not provide storage capability', false)
    .option('--storage-db <name>', 'database name to create when running as storage node, default to "db"', 'db')
    .action((options) => {
        let args = {
            addr: options.addr || config.get('net.addr'),
            pport: options.peerPort || config.get('net.p2pport'),
            gport: options.gamePort || config.get('net.wsport'),
            curl: options.curl || config.get('center.url'),
            storage: options.storage,
            storagedb: options.storageDb,
        };

        run(args).catch(err => {
            logger.error(err);
        });
    });

program.command('query')
    .description('query pow of this node')
    .option('--endpoint <endpoint>', 'rpc endpoint address', 'localhost:30656')
    .action((options) => {

        // console.log(options);
        let endpoint = options.endpoint;
        let idx = endpoint.indexOf(':');
        if (idx === -1) {
            idx = endpoint.length;
        }
        let addr = endpoint.substring(0, idx);
        let port = Number.parseInt(endpoint.substr(idx + 1));
        if (port <= 0 || isNaN(port)) port = 30656;

        let peer = new Peer('', addr, port);
        const rpc = new RpcClient(peer);
        rpc.call('rpc_account_checkNodePow', null).then((data) => {
            console.log(JSON.stringify(data, null, 4));
        }).catch((e) => {
            console.error('error', e.message);
        });

    });

program
    .command('*')
    .action(() => {
        program.outputHelp();
    });

program.parse(process.argv);

if (program.args.length < 1) {
    program.outputHelp();
}

async function run(params) {
    await AppBase.init(params);

    process.on('SIGINT', function () {
        layaNode.stop();
        logger.info("node stopped.");
        app.exit(1);
    });

    app.layaNode = layaNode;

    await layaNode.init(params);
    await layaNode.start();

    //启动ETH交易监听子进程
    CPMgr.add_child('eth_child', './lib/eth_child.js');
    logger.info('初始化ETH监听子进程')

    logger.info(layaNode.getCapabilities());
}