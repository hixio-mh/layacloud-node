const levelup = require('levelup');
const leveldown = require('leveldown');
const BB = require('bluebird');


const DB_NAME = 'db';
let db = null;
const putP = BB.promisify(put);
const getP = BB.promisify(get);
const delP = BB.promisify(del);


function LevelDbProvider() {
}


LevelDbProvider.prototype.init = function (name) {
    db = levelup(leveldown(name || DB_NAME));
};


/**
 *
 * @param {String}userId
 * @param {Buffer|String|Object}data
 * @param {String|undefined} digest OPTIONAL. digest of the data
 * @return {Promise}
 */
LevelDbProvider.prototype.put = function (userId, data) {
    return putP(userId, data);
};


/**
 * @param userId
 * @return {Promise}  {d: data, ts: timestamp, h: digest}
 */
LevelDbProvider.prototype.get = function (userId) {
    return getP(userId);
};


LevelDbProvider.prototype.del = function (userId) {
    return delP(userId);
};


function put(userId, data, cb) {
    if (checkUninitialized(cb)) return;
    let wrapdata = {
        d: data,
        ts: Date.now(),
    };
    db.put(userId, JSON.stringify(wrapdata), cb);
}


function del(userId, cb) {
    if (checkUninitialized(cb)) return;
    db.del(userId, cb);
}


function get(userId, cb) {
    if (checkUninitialized(cb)) return;
    db.get(userId).then(data => {
        const wrapdata = JSON.parse(data);
        if (wrapdata.d.type === 'Buffer') {
            wrapdata.d = wrapdata.d.data;
        }
        cb(null, wrapdata);
    }).catch(err => {
        if (err) {
            cb(null, {d: null});
        }
    });
}


function checkUninitialized(cb) {
    if (!db) cb(new Error('db not initialized'));
    return (!db);
}


module.exports = new LevelDbProvider();