const BB = require('bluebird');
const log4js = require('log4js');

const Storage = require ('../lib/storage/cap_storage');
const Logic = require ('../lib/game/cap_logic');


log4js.configure({
    appenders: {
        console: {type: 'console'},
    },
    categories: {
        default: {appenders: ['console'], level: 'trace'},
    }
});

global.logger = log4js.getLogger('default');


const json = `

{
     "data": {
         "logic_node": {
             "node_hash_address": "0xa8c77a1EBfe51514C9042387293ACCA01b62D12c",
             "ip_address": "172.19.0.3",
             "ws_port": 8656,
             "http_port": 30656,
             "version": "0.0.1.unstable",
             "regist_time": 1534952644802,
             "last_query_time": 1534952736120,
             "sys": {
                 "logic_task_count": 0,
                 "supervison_task_count": 0,
                 "os_freemem": 345227264,
                 "os_totalmem": 2095763456,
                 "os_platform": "linuxx644.9.93-linuxkit-aufs",
                 "os_cpu_number": 4,
                 "socket_connect_count": 0,
                 "os_cpu_usage": "1.25"
             },
             "work_status_list": [
                 {
                     "room_hash": "744fb9aa38a7973ae2cafef0a2fd98d9",
                     "work_game_id": "cloud_8029",
                     "work_type": "logic",
                     "player_pubkey_list": [
                         "0xd8ACcED8A7A92b334007f9C6127A848fE51D3C3b"
                     ],
                     "room_supver_list": [
                         {
                             "node_hash_address": "0xA0444b75eB441128Ce73a256DDd272fAdD09Bcc5",
                             "ip_address": "172.19.0.8",
                             "ws_port": 8656,
                             "http_port": 30656,
                             "version": "0.0.1.unstable",
                             "regist_time": 1534952645667,
                             "last_query_time": 1534952736892,
                             "sys": {
                                 "logic_task_count": 0,
                                 "supervison_task_count": 0,
                                 "os_freemem": 231407616,
                                 "os_totalmem": 2095763456,
                                 "os_platform": "linuxx644.9.93-linuxkit-aufs",
                                 "os_cpu_number": 4,
                                 "socket_connect_count": 0,
                                 "os_cpu_usage": "1.25"
                             },
                             "work_status_list": [
                                 {
                                     "room_hash": "744fb9aa38a7973ae2cafef0a2fd98d9",
                                     "work_game_id": "cloud_8029",
                                     "work_type": "storage",
                                     "player_pubkey_list": "0xd8ACcED8A7A92b334007f9C6127A848fE51D3C3b",
                                     "create_at": 1534952763636
                                 }
                             ]
                         }
                     ],
                     "create_at": 1534952763630
                 }
             ]
         },
         "sup_node_list": [
             {
                 "node_hash_address": "0xA0444b75eB441128Ce73a256DDd272fAdD09Bcc5",
                 "ip_address": "172.19.0.8",
                 "ws_port": 8656,
                 "http_port": 30656,
                 "version": "0.0.1.unstable",
                 "regist_time": 1534952645667,
                 "last_query_time": 1534952736892,
                 "sys": {
                     "logic_task_count": 0,
                     "supervison_task_count": 0,
                     "os_freemem": 231407616,
                     "os_totalmem": 2095763456,
                     "os_platform": "linuxx644.9.93-linuxkit-aufs",
                     "os_cpu_number": 4,
                     "socket_connect_count": 0,
                     "os_cpu_usage": "1.25"
                 },
                 "work_status_list": [
                     {
                         "room_hash": "744fb9aa38a7973ae2cafef0a2fd98d9",
                         "work_game_id": "cloud_8029",
                         "work_type": "storage",
                         "player_pubkey_list": "0xd8ACcED8A7A92b334007f9C6127A848fE51D3C3b",
                         "create_at": 1534952763636
                     }
                 ]
             }
         ],
         "room_hash": "744fb9aa38a7973ae2cafef0a2fd98d9",
         "single_plyaer_key": "0xd8ACcED8A7A92b334007f9C6127A848fE51D3C3b",
         "game_id": "cloud_8029"
     },
     "sender": "0x6379C45A9f92c567d45158027d1F8d2E45eeB405",
     "nonce": 1534952763638
 }
`;


const json2 = `
{
     "data": {
         
          
         "permission_node_list": [
             {
                 "node_hash_address": "0x1234567890",
                 "ip_address": "172.19.0.8",
                 "ws_port": 8656,
                 "http_port": 30656,
                 "version": "0.0.1.unstable",
                 "regist_time": 1534952645667,
                 "last_query_time": 1534952736892,
                 "sys": {
                     "logic_task_count": 0,
                     "supervison_task_count": 0,
                     "os_freemem": 231407616,
                     "os_totalmem": 2095763456,
                     "os_platform": "linuxx644.9.93-linuxkit-aufs",
                     "os_cpu_number": 4,
                     "socket_connect_count": 0,
                     "os_cpu_usage": "1.25"
                 },
                 "work_status_list": [
                     {
                         "room_hash": "744fb9aa38a7973ae2cafef0a2fd98d9",
                         "work_game_id": "cloud_8029",
                         "work_type": "storage",
                         "player_pubkey_list": "0xd8ACcED8A7A92b334007f9C6127A848fE51D3C3b",
                         "create_at": 1534952763636
                     }
                 ]
             }
         ],
         "player_pubkey": "0xd8ACcED8A7A92b334007f9C6127A848fE51D3C3b",
         "game_id": "cloud_8029"
     },
     "sender": "0x6379C45A9f92c567d45158027d1F8d2E45eeB405",
     "nonce": 1534952763638
 }
`;

let data = JSON.parse(json);
let data2= JSON.parse(json2);


function  testPermission() {

    const storage = new Storage();

    storage.onCreatePermission(data);
    storage.onAddPermission(data2);


    storage.checkPermission('0xa8c77a1EBfe51514C9042387293ACCA01b62D12c', '0xd8ACcED8A7A92b334007f9C6127A848fE51D3C3b');
    storage.checkPermission('0x1234567890', '0xd8ACcED8A7A92b334007f9C6127A848fE51D3C3b');

    console.log('ok');

}


function testGcPermission() {
    const storage = new Storage();

    let userId = data.data.single_plyaer_key;

    let nodeList = Array.from([data.data.logic_node.node_hash_address]);
    if (data.data.sup_node_list) {
        let s = data.data.sup_node_list.map(node => node.node_hash_address);
        nodeList = nodeList.concat(s);
    }

    storage.addPermission(userId, nodeList, 4);

    userId = data2.data.player_pubkey;
    const l = data2.data.permission_node_list;
    let s = null;
    if (l) {
        s = l.map(n => n.node_hash_address);
    }

    storage.addPermission(userId, s, 4);

    setTimeout(function () {

        try {
            storage.checkPermission('0x1234567890', '0xd8ACcED8A7A92b334007f9C6127A848fE51D3C3b');
        }
        catch (e) {
            console.log('0k');
        }
    }, 5000)


}



testPermission();
testGcPermission();