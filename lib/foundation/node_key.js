var nodeKey = {};
var lcc = require('../common//util.js');
var fs = require('fs');
var co = require('co');



nodeKey.path = __dirname + '/../../node.key';
nodeKey.private_key = undefined;


nodeKey.initlize = function(cb){
    co(function*(){
        try{
            nodeKey.private_key  = yield function(done){
                nodeKey.read_local_keyfile(done);
            }
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

    return nodeKey.private_key;
}

nodeKey.get_local_address = function(){
    var pk_buffer = lcc.hexToBuffer(nodeKey.private_key)
    return lcc.privateToAddress(pk_buffer)

}

nodeKey.read_local_keyfile = function(callback){
    //console.log('start load key');
    fs.readFile(nodeKey.path,'utf8',function(err,result){
        if(err != undefined){
           
            var genPK = lcc.genPrivateKey();
            genPK = lcc.bufferToHex(genPK);
            nodeKey.write_local_keyfile(genPK,function(){
                callback(null,genPK);
            });          
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