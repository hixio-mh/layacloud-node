/**
 * 获取当前系统状态
 *  data:{
        logic_task_count: Number , 逻辑任务工作数量
        supervison_task_count: Number , 监督任务工作数量 
        os_freemem : Number , 空闲内存
        os_totalmem : Number , 当前节点的总内存
        os_platform : String  ,  当前节点的操作系统
        os_cpu_number : Number , cpu核数
        os_cpu_usage : Number  , cpu使用率平均百分比
        socket_connect_count : Number , 当前节点的链接数
    }
 */

var cpu = require('cpu');
var sys = require('sysinfo');
var os = require('os');
var SysInfo = {};

SysInfo.logic_task_count = 0;
SysInfo.supervison_task_count = 0;
SysInfo.socket_connect_count = 0;

/**
 * 返回节点当前系统信息
 */
SysInfo.get_node_sys = function(){

    return new Promise((resolve, reject) => {
        cpu.usage((arr) =>{ 

            var total_usage = 0;
            for(var i=0; i < arr.length; ++i){
                var single_core_usage = arr[i];
                total_usage += parseFloat(single_core_usage);
            }            
            var ava_cpu_usage = (total_usage / arr.length).toFixed(2);


            var sys_result = {};
            sys_result.logic_task_count = SysInfo.logic_task_count;
            sys_result.supervison_task_count = SysInfo.supervison_task_count;
            sys_result.os_freemem = sys.os.freemem;
            sys_result.os_totalmem = sys.os.totalmem;
            sys_result.os_platform = sys.os.platform + sys.os.arch+sys.os.release;
            sys_result.os_cpu_number = cpu.num();
            sys_result.socket_connect_count = SysInfo.socket_connect_count;
            sys_result.os_cpu_usage = ava_cpu_usage;

            return resolve(sys_result)

        })

    })
  
}


/**
 * local IP address of 'eth0' iface
 *
 *
 */

SysInfo.get_local_ip4 = function() {
    var ifaces = os.networkInterfaces();

    var iface = ifaces['eth0'];
    if (!iface) {
        iface = ifaces['lo'];
    }

    for (let i = 0; i < iface.length; i++) {
        if ('IPv4' === iface[i].family) {
            return iface[i].address;
        }
    }

}

/**
 * 设置逻辑节点任务数量
 * @param {Number} count 逻辑节点任务数
 */
SysInfo.set_logic_task_count = function(count){
    SysInfo.logic_task_count = count;
}

/**
 * 设置监督节点任务数量
 * @param {Number} count 
 */
SysInfo.set_supervison_task_count = function(count){
    SysInfo.supervison_task_count = count;
}

/**
 * 
 * @param {Number} count Websocket连接数量
 */
SysInfo.set_socket_connect_count = function(count){
    SysInfo.socket_connect_count = count;
}


module.exports = SysInfo;
