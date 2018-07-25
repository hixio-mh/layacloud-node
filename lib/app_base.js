/**
 * 关于app的初始化
 */
const config = require('config');
const log4js = require('log4js');
const pjson = require('../package.json');
const AppConsts = require('./app_consts.js');

/**
 * 初始化环境
 */
async function init() {
  global.app = global.app || {};
  app.config = config;
  if(app.config.util.getEnv('NODE_ENV') == 'dev') {
    app.config.dev = true
  }

  app.logger = initLog();
  global.logger = app.logger;
  app.consts = AppConsts;
  // FIXME 为何必须有这个查询，否则config无法获取数据
  app.config.get("net")

  /**
   * sleep
   */
  app.sleep = async function (time) {
    let sleepAsync = util.promisify(setTimeout);
    await sleepAsync(time);
  }

  /**
   * exit
   */
  app.exit = function(code) {
    code = code || 0;
    process.exit(code);
  }
}

/**
 *  初始化log
 */
function initLog() {
  if (app.config.dev == true) {
    log4js.configure({
      appenders: {
        log: { type: 'console' }
      },
      categories: { default: { appenders: ['log'], level: 'debug' } }
    });
  } else {
    log4js.configure({
      appenders: {
        log: { type: 'file', filename: 'log/' + pjson.name + '.log' }
      },
      categories: { default: { appenders: ['log'], level: 'debug' } }
    });
  }
  const logger = log4js.getLogger();
  return logger;
}

exports = module.exports = {
  init
};