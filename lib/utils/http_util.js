const request = require("request");

async function requestAsync(url) {
 return new Promise((resolve, reject) => {
    request(url, (error, response, body) => {
      if (error) {
        return reject(error);
      }
      return resolve(body);
    });
  });
}

exports = module.exports = requestAsync;