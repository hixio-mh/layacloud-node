var CenterHelper = require('./center_helper')
/**
 *
 * @constructor
 */
function FoundationCapability() {
    this.cap = 'logic';
    this.context = null;

}


FoundationCapability.prototype.init = function (params) {
    CenterHelper.regist_to_center();
};


FoundationCapability.prototype.enroll = function (node) {
    this.context = node;

};




module.exports = FoundationCapability;