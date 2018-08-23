/**
 * Module dependencies.
 */
const eth_api = require("../common/eth_api");
const config = require("../../config/dev.json");
const abi = require("../../config/abi");
const child_process_mgr = require("../common/child_process_mgr");

module.exports = (function(){
	return new node_contract();
})();

function node_contract(){
	eth_api.init_provider(config.provider);
}

node_contract.prototype.get_user_data = function(user_id){
	return child_process_mgr.send2child("eth_child", {
		"cmd": "eth_call_constant",
		"data": {
			"abi": abi,
			"contract_address": config.contract_address,
			"method": "get_user_data",
			"args": user_id
		}
	}, true);
}