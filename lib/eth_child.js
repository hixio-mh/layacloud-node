const config = require("../config/dev.json");
const eth_api = require("./common/eth_api");

var eth_child = {};

/**
 * 开始监听
 */
eth_child.start = function(){
	eth_api.init_provider(config.provider);
}

eth_child.start();

process.on('message',function(msg){
	if(msg.cmd == "eth_call_constant"){
		eth_api.call_constant_2(msg.data.abi,
			msg.data.contract_address,
			msg.data.method,
			msg.data.args, function(err, result){
				process.send({
					"cmd": "eth_call_constant",
					"data": result
				});
			});
	}
});