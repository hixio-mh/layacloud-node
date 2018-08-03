const request = require("request");
const BB = require('bluebird');


/**
 * post json object
 * @param {String}url
 * @param {Object}data
 * @return {Promise}
 */
function post(url, data) {
    return new BB.Promise((resolve, reject) => {
        request({url: url, method: 'POST', json: data},
            (err, resp, body) => {
                if (err) {
                    reject(err);
                }
                else if (resp.statusCode !== 200) {
                    reject(new Error(resp.statusCode));
                }
                else {
                    resolve(body);
                }
            }
        );
    });
}


function get(url) {
    return new BB.Promise((resolve, reject) => {
        request(url, (err, resp, body) => {
                if (err) {
                    return reject(err);
                }
                if (resp.statusCode !== 200) {
                    return reject(new Error(resp.statusCode));
                }
                return resolve(body);
            }
        );
    });
}


exports = module.exports =  {
    post: post,
    get: get
};



