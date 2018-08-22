'use strict';

const util = require('util');


function ConsensusError(message) {
    Error.captureStackTrace(this, ConsensusError);
    this.name = ConsensusError.name;
    this.message = message;
}


util.inherits(ConsensusError, Error);


module.exports = ConsensusError;