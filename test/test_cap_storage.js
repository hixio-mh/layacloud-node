const BB = require('bluebird');
const Storage = require ('../lib/storage/cap_storage');
const Logic = require ('../lib/game/cap_logic');

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


let data = JSON.parse(json);
console.log(data);





function  testPermission() {

    const storage = new Storage();
    console.log(JSON.stringify(storage.permissionMap, null, 4));

    storage.onMessagePermProvision(data);

    console.log(JSON.stringify(storage.permissionMap, null, 4));


    storage.checkPermission('0xa8c77a1EBfe51514C9042387293ACCA01b62D12c', '0xd8ACcED8A7A92b334007f9C6127A848fE51D3C3b');
    console.log('ok');

}


function Obj() {
    this.map = new Map();
}

function testx () {

   let obj = new Obj();
    obj.map.set('1', obj);

    console.log(obj);


}


async function testWrite() {
    let logic = new Logic();
    const writeFn = BB.promisify(logic.write).bind(logic);

    await writeFn('0xd8ACcED8A7A92b334007f9C6127A848fE51D3C3b', 'cloud_8029', {});
}

testx();
testPermission();
testWrite();