# 概述
实现逻辑节点和监督节点逻辑，运行游戏主逻辑。  
每台物理机器可以运行多个node，每个node均包含逻辑节点和监督节点功能。

# 安装

```
$ git clone  ssh://git@gitlab.layabox.com:10022/litao/layacloud-node.git --recursive
```
如果上述命令执行后，没有创建lib/common目录，则手工添加submodule:
```
git submodule add ssh://git@gitlab.layabox.com:10022/zonghai/layacloud-common.git lib/common
```

```
$ npm install
$ git submodule update --init --recursive
$ cd ./lib/common
$ npm install
$ cd ../..
$ node app.js -h
```

定期更新submodule代码 
```
$ cd layacloud-node
$ git submodule foreach git pull

```

# 与客户端交易
与客户端采用websockets进行交互


# P2P节点交互
节点之间采用http进行交互

# 备注
参考 module.js 实现：
https://github.com/nodejs/node-v0.x-archive/blob/master/lib/module.js
