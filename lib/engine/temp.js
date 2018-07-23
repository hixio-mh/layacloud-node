/**
 * 利用命令行加载五子棋代码
 */
const vm = require('vm')
let dataMgr = {}

let room = {}
room.name = "room1"
room.master = "cheng"
room.fps = 10
room.duration = 120
room.usernum = 1
room._userList = ["cheng"]

// 获取用户id 列表
room.getuserid = function() {
  return this._userList
}

// 添加自定义数据
room.addroomdata = function(k, v) {
  if (this.name in dataMgr) {
    let roomData = dataMgr[this.name]    
    roomData[k] = v
  } else {
    let obj = {}
    obj[k] = v
    dataMgr[this.name] = obj
  }
  return v
}

// 获取自定义数据
room.getroomdata = function() {
  return dataMgr[this.name]
}

// 广播消息
room.broadcast = function(data) {
  console.log("广播数据给所有的客户端", data)
}

let Print = console.log
let sandbox = {Print:Print, room:room}
vm.createContext(sandbox)

try {
  const code = 
`
Print('run im VM start -----');
function oncreated(){
  Print("js create room");
  Print("   name="+this.name);
  Print("   master="+this.master);
  Print("   fps="+this.fps);
  Print("   duration="+this.duration);
  Print("   usernum="+this.usernum);
}
function onstart(){
  Print("js Room '"+this.name+"' Start!!");
  var d = this.addroomdata(0,66);
  Print("room data 0 is "+d);
  d = this.getroomdata();
  Print(JSON.stringify(d));
}

/**
 * 房间关闭时被调用
 */
function onclose(){
   Print("js Room '"+this.name+"' Closed!!");
}

/**
  * 玩家进入房间时被调用
  * @param {String} userid 进入房间的用户ID
  * @param {Object} data 进入房间的用户数据
  */
 function onuserin(userid, data){
    if (2 == this.usernum){
        //进入的玩家已齐全, 向客户端推送当前五子棋步数
        Print('all users in, push step to client');
        this.step = 0;
        //初始化棋盘
        this.desktop = [];
        for (var x=0;x<15;x++){
            this.desktop[x] = [];
            for (var y=0;y<15;y++){
                this.desktop[x][y]=-1;
            }
        }
        this.broadcast(JSON.stringify({
            'cmd':'step',
            'step':this.step
        }));
    }    
 }

 /**
  * 玩家进离开房间时被调用
  * @param {String} userid 离开房间的用户ID
  */
 function onuserout(userid){
    Print("js Room '"+this.name+"' user logout, userid='"+userid+"'");
 }

 /**
  * 当玩家发送自定义事件时被调用
  * @param {String} userid 发送事件的用户ID
  * @param {String} key 事件的key
  * @param {String} val 事件的value
  */
 function onuserevent(userid,key,val){
    Print("js Room '"+this.name+"' recv user '"+userid+"' event, key='"+key+"' value='"+val+"'");

    //放置棋子事件
    if (key == 'put'){
        //胜负已分
        if (this.over){
            return;
        }

        //判断当前轮到落子的是userid
        var mod = this.step % 2;
        if ((mod==0 && userid==this.master) || (mod==1 && userid!=this.master)){
            var data = JSON.parse(val);   
            //是空的格子才允许落子
            if (this.desktop[data.x][data.y] == -1){
                this.desktop[data.x][data.y] = mod;
                this.step++;
                //广播所有用户落子消息
                this.broadcast(JSON.stringify({
                    cmd:'put',
                    userid:userid,
                    x:data.x,
                    y:data.y
                }));

                //判断胜负
                if (isWin(this.desktop, data.x, data.y, mod)){
                    this.over = true;
                    //广播所有用户胜负消息
                    this.broadcast(JSON.stringify({
                        cmd:'win',
                        userid:userid
                    }));
                }
            }   
        }
    }
 }

 //自定义函数 棋盘,x,y,哪一方
 function isWin(a, r, c, t){
    var count1 = 0;
    var count2 = 0;
    var count3 = 0;
    var count4 = 0;
    for(var i=1;i<5;i++){
        //横向
        if((c-i>=0 && a[r][c-i]==t||(c+i<a.length && a[r][c+i]==t))){
            ++count1;
        }
        //纵向
        if((r-i>=0 && a[r-i][c]==t)||(r+i<a.length && a[r+i][c]==t)){
            ++count2;
        }
        //左斜
        if((r-i>=0 && c-i>=0 && a[r-i][c-i]==t)||(r+i<a.length && c+i<a.length && a[r+i][c+i]==t)){
            ++count3;
        }
        //右斜
        if((r-i>=0 && c+i<a.length && a[r-i][c+i]==t)||(r+i<a.length && c-i>=0 && a[r+i][c-i]==t)){
            ++count4;
        }
    }
    if(count1==4 || count2==4 || count3==4 || count4==4){
        return true;
    }
    return false
 }

// 调用函数
room.oncreated = oncreated
//oncreated.apply(room)
//room.oncreated()
room.onstart = onstart
room.onclose = onclose
room.onuserin = onuserin
room.onuserout = onuserout
room.onuserevent = onuserevent

`
  vm.runInContext(code, sandbox)
} catch(e) {
  console.log("run vm error:", e)
}

var stdin = process.openStdin();
stdin.addListener("data", function(d) {
  // note:  d is an object, and when converted to a string it will
  // end with a linefeed.  so we (rather crudely) account for that  
  // with toString() and then trim() 
  console.log("=======")
  let [input, ...tail] = d.toString().trim().split(/\s+/)
  if(input == "start") {
    room.oncreated()
    room.onstart()
    // 模拟进入一个人：
    room._userList.push("dan")
    room.usernum = room._userList.length
    room.onuserin("dan")
  } else if(input == "put") {
    if(tail && tail.length == 2) {
      let userid = tail[0]
      let data = tail[1]
      room.onuserevent(userid, "put", data)
    }
  } else if(input == "exit") {
    room.onclose()
  }


});
