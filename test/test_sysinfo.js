var SysInfo = require('../lib/utils/sys_info');


async function main(){

    var result = await SysInfo.get_node_sys();
    console.log(result);
}
try{
    main();
}catch(e){
    console.log(e);
}
