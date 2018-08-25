/**
 * Module dependencies.
 */
const child_process_mgr = require("../common/child_process_mgr");
const CenterHelper = require('../foundation/center_helper');

module.exports = (function(){
	return new node_contract();
})();

function node_contract(){
	
}

node_contract.prototype.get_user_data = function(game_id, user_id){
	return new Promise((resolve, reject) => {
		CenterHelper.query_contract_info(game_id, async function(err, result){
			if(result.retcode == 0){
				var abi = result.data.contract_abi;
				var contract_address = result.data.contract_address;
				var user_data = await child_process_mgr.send2child("eth_child", {
					"cmd": "eth_call_constant",
					"data": {
						"abi": abi,
						"contract_address": contract_address,
						"method": "get_user_data",
						"args": user_id
					}
				}, true);
				
				resolve(user_data);
			}else{
				reject(null);
			}
		});
	});
}