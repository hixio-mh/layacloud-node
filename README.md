# 概述
实现逻辑节点和监督节点逻辑，运行游戏主逻辑。  
每台物理机器可以运行多个node，每个node均包含逻辑节点和监督节点功能。

# 安装
```
$ npm install
$ git submodule update --init --recursive
$ cd layacloud-common
$ npm install
$ cd ..
$ node app.js -h
```

# 与客户端交易
与客户端采用websockets进行交互


# P2P节点交互
节点之间采用http进行交互

# 备注
参考 module.js 实现：
https://github.com/nodejs/node-v0.x-archive/blob/master/lib/module.js