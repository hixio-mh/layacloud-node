const util = require('util')
const moment = require('moment')
const argv = require('minimist')(process.argv.slice(2))
const version = require('./lib/version.js')
const AppBase = require('./lib/app_base.js')
const layaNode = require('./lib/layanode');
var co = require('co')

/**
 * 用法
 */
function usage() {
    console.log(
        `
说明：
 layacloud-node 命令行接口
用法：
 ./lanode [options] command [command options] [arguments ...]
命令：
 run          启动节点
 version      显示版本信息
 help,h       显示本帮助信息

参数:
  --config value                     TOML configuration file

节点参数：
  --ws                   Enable the WS-RPC server
  --wsaddr value         WS-RPC server listening interface (default: "localhost")
  --wsport value         WS-RPC server listening port (default: 8656)
  --p2paddr value        P2P server listening interface (default: "0.0.0.0") 
  --p2pport value        P2P server listening port (default: 30656)
`
    )
}

async function main() {
    await AppBase.init();
    let command = parseArgs();
    switch (command) {
        case "help":
            usage()
            app.exit()
            break
        case "version":
            console.log(version())
            break
        case "run":
            run()
            break;
        default:
            console.log("unknown command!")
            app.exit(1)
    }
}


function run() {
  try {
    app.layaNode = layaNode
    process.on('SIGINT', function () {
      layaNode.stop();
      logger.info("node stopped.");
      app.exit(1);
    });
    
    co(function*(){
      yield function(done){
        layaNode.init({},done); //TODO: pass in the parsed arguments
      }
      layaNode.start();
    })

  } catch (e) {
    logger.error(e);
  }

}

function parseArgs() {
  if ('wsaddr' in argv) {
    app.config.net.wsaddr = argv.wsaddr
  }
  if('wsport' in argv) {
    app.config.net.wsport = argv.wsport
  }

  if ('h' in argv || argv._.indexOf('help') != -1) {
    return "help"
  }
  if (argv._.indexOf('version') != -1) {
    return 'version'
  }
  if (argv._.indexOf('run') != -1) {
    return 'run'
  }
  return "unknow"
}

main()