var nodeKey = {};
var lcc = require('../../layacloud-common/util.js');
var fs = require('fs');
var co = require('co');



nodeKey.path = __dirname + '/../config/node.key';
nodeKey.private_key = undefined;

nodeKey.initlize = function(cb){
    co(function*(){
        try{
            var private_key = yield function(done){
                nodeKey.read_local_keyfile(done);
            }
            nodeKey.pravite_key = lcc.bufferToHex(private_key);        
            if(cb){
                cb(null,null);
            } 
            
        }
        catch(e){
            console.log(e)
        }
    })
}

nodeKey.get_local_private = function(){
    return nodekey.private_key;
}


nodeKey.read_local_keyfile = function(callback){
    fs.readFile(nodeKey.path,'utf8',function(err,result){
        if(err != undefined){
           
            var genPK = lcc.genPrivateKey();
            nodeKey.write_local_keyfile(genPK,callback);          
        }  
        else{
            callback(null,result);
        }
        
    })
}

nodeKey.write_local_keyfile = function(pravite_key,callback){
    fs.writeFile(nodeKey.path, pravite_key ,{flag:'a',encoding:'utf-8'},callback);
}

module.exports = nodeKey