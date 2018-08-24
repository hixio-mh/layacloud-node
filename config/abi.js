module.exports = [
	{
		"constant": false,
		"inputs": [
			{
				"name": "_user_id",
				"type": "address"
			},
			{
				"name": "_storage_node_pubkey",
				"type": "address[]"
			}
		],
		"name": "save_public_key",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"name": "_user_id",
				"type": "address"
			},
			{
				"name": "_user_data",
				"type": "bytes"
			},
			{
				"name": "_signed_data",
				"type": "bytes"
			}
		],
		"name": "save_user_data",
		"outputs": [
			{
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [
			{
				"name": "_user_id",
				"type": "address"
			}
		],
		"name": "get_storage_status",
		"outputs": [
			{
				"name": "",
				"type": "uint256"
			},
			{
				"name": "",
				"type": "bool"
			},
			{
				"name": "",
				"type": "address[]"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [
			{
				"name": "_user_id",
				"type": "address"
			}
		],
		"name": "get_user_data",
		"outputs": [
			{
				"name": "",
				"type": "bytes"
			},
			{
				"name": "",
				"type": "bytes32"
			},
			{
				"name": "",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"name": "data",
				"type": "bytes"
			},
			{
				"name": "_signed_data",
				"type": "bytes"
			}
		],
		"name": "verify_center_publickey",
		"outputs": [
			{
				"name": "",
				"type": "bool"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [],
		"name": "get_var",
		"outputs": [
			{
				"name": "",
				"type": "uint256"
			},
			{
				"name": "",
				"type": "bytes32"
			},
			{
				"name": "",
				"type": "address[]"
			},
			{
				"name": "",
				"type": "bytes32[]"
			},
			{
				"name": "",
				"type": "bytes32[]"
			},
			{
				"name": "",
				"type": "bytes1[]"
			},
			{
				"name": "",
				"type": "bytes32[]"
			},
			{
				"name": "",
				"type": "address[]"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"name": "",
				"type": "address"
			}
		],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "constructor"
	}
];