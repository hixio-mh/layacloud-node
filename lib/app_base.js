/**
 * 关于app的初始化
 */
const util = require('util')
const path = require('path');
const fs = require('fs');
const config = require('config');
const BB = require('bluebird');
const log4js = require('log4js');

const pjson = require('../package.json');
const AppConsts = require('./app_consts.js');
const Alphabet = require('alphabetjs')


/**
 * 初始化环境
 */
async function init(params) {
    global.app = global.app || {};
    app.consts = AppConsts;

    app.args = params;
	app.args.dev = (config.util.getEnv('NODE_ENV') === 'dev');
    //app.args.dynamic_nodekey = true;//(config.util.getEnv('DYNAMIC_NODEKEY') === 'yes');
    initLog()


    const laya_node_logo = 'LayaCloud';
    var laya_node_logo_str = Alphabet(laya_node_logo,'planar')
    console.log(laya_node_logo_str)
	
    // console.log(app.args);
    console.log(
`
=======================================
=                                     =
=        启动layacloud node           =
=                                     =
=======================================
`)

    /**
     * sleep
     */
    app.sleep = async function (time) {
        let sleepAsync = util.promisify(setTimeout);
        await sleepAsync(time);
    };

    /**
     * exit
     */
    app.exit = function (code) {
        code = code || 0;
        process.exit(code);
    };

    /**
     * inspect
     */
    app.inspect = function(obj) {
        return util.inspect(obj, false, null)
    }
}



/**
 *  初始化log
 */
function initLog(nodeName = "") {
    const mainModule = process.mainModule.filename;
    const mainModuleDir = path.dirname(mainModule);
    const logDir = path.join(mainModuleDir, 'log');
    let layout = {}
    if(nodeName == "") {
        layout = { type: 'basic' }
    } else {
        layout =  {
            type: 'pattern',
            pattern: '[%d] [%p] [%x{node}] - %m',
            tokens: {
                node: function(logEvent) {
                    return nodeName
                }
            }
        }
    }
    log4js.configure({
        appenders: {
            console: {type: 'console', layout:layout},
            file: {type: 'file', layout:layout, filename: path.join(logDir, pjson.name + '.log')}
        },
        categories: {
            default: {appenders: ['file'], level: 'trace'},
            dev: {appenders: ['console', 'file'], level: 'trace'}
        }
    });

    global.logger = log4js.getLogger(app.args.dev ? 'dev' : 'default');
}


exports = module.exports = {
    init,
    initLog
};
