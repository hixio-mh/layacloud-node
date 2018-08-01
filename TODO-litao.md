# 待办
- 处理user.match命令
- single房间可以正常运行
- single逻辑节点和监督节点之间的数据同步: onuserin, onuserout, onuserevent, oncreated, onstart
- node级数据获取和存储(需要共识机制)

- 监督逻辑实现
- 监督者和逻辑节点之间的通讯
- 房间的duration实现
- 使用vm2替换vm

2018.07.27
- 玩家断线，从playerMgr及room中去除 ok
- 房间无人则自动关闭 ok
- 房间关闭则从room mgr中清理，同时玩家下线 ok
- 房间的onupdate实现 ok
- engine代码保护，防止被开发者随意调用 ok

# 将来
- laya合约代码审查
- 玩家断线重连处理