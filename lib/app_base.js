/**
 * 关于app的初始化
 */
const path = require('path');
const fs = require('fs');
const config = require('config');
const BB = require('bluebird');
const log4js = require('log4js');

const pjson = require('../package.json');
const AppConsts = require('./app_consts.js');

/**
 * 初始化环境
 */
async function init(params) {
    global.app = global.app || {};
    app.consts = AppConsts;

    app.args = params;
	app.args.dev = (config.util.getEnv('NODE_ENV') === 'dev');
	app.args.dynamic_nodekey = true;//(config.util.getEnv('DYNAMIC_NODEKEY') === 'yes');
	
    global.logger = await initLog();

    // console.log(app.args);
    console.log(
`
=======================================
启动layacloud node
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
}



/**
 *  初始化log
 */
async function initLog() {
    const mainModule = process.mainModule.filename;
    const mainModuleDir = path.dirname(mainModule);
    const logDir = path.join(mainModuleDir, 'log');

    log4js.configure({
        appenders: {
            console: {type: 'console'},
            file: {type: 'file', filename: path.join(logDir, pjson.name + '.log')}
        },
        categories: {
            default: {appenders: ['file'], level: 'trace'},
            dev: {appenders: ['console', 'file'], level: 'trace'}
        }
    });

    return log4js.getLogger(app.args.dev ? 'dev' : 'default');
}


exports = module.exports = {
    init
};
