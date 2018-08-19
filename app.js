"use_strict";

const program = require('commander');
const config = require('config');
const version = require('./lib/version.js');
const AppBase = require('./lib/app_base.js');
const layaNode = require('./lib/layanode');


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

    logger.info(layaNode.getCapabilities());
}