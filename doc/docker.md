## Docker 

### 下载和启动Docker

下载Mac或Windows版本
https://www.docker.com/products/docker-desktop



### 准备基本Image

- node:10.8.0-alpine
```bash
    docker pull node:10.8.0-alpine
```

- node:9.8.0-alpine 

用于layacloud-center 项目需要nodejs version <= 9.8.0

```bash
    docker pull node:9.8.0-alpine
```

下载后可以用一下命令检查
```bash
    docker images
输出    
    node     10.8.0-alpine       5a519d1e3a24        2 weeks ago         70.3MB
    node     9.8.0-alpine        4a6857f6f75d        5 months ago        68.4MB
```

### 创建测试网络interface

列出docker 网络
```bash
    docker network ls
    
    NETWORK ID          NAME                   DRIVER              SCOPE
    e46eed88b310        bridge                 bridge              local
    9af5d42cbdb3        host                   host                local
    43e443f8ed01        none                   null                local

```
创建测试网络： layacloud-local-test

```bash
    docker network create layacloud-local-test --driver bridge
    
    docker network ls
    
    NETWORK ID          NAME                   DRIVER              SCOPE
    e46eed88b310        bridge                 bridge              local
    9af5d42cbdb3        host                   host                local
    c6f21fab182a        layacloud-local-test   bridge              local
    43e443f8ed01        none                   null                local
```

### 启动layacloud-center 项目

```bash
    cd layacloud-center 
    docker-compose up
    
```

第一次启动的时候， docker 会编译image。


### 启动layacloud-node 项目

```bash
    cd layacloud-node
    docker-compose up --scale layanode=N
    
```

第一次启动的时候， docker 会编译image。 N 可以指定启动的节点个数。


###手动启动一个layacloud-node 节点

当执行完docker-compose up 后， docker会编译一个新的image， 可以通过一下命令查询：

```bash
    docker images
    
    layacloud-node_layanode       latest              3cfed1a318c1        19 hours ago        381MB
    layacloud-center_layacenter   latest              a2dd510508d8        21 hours ago        398MB
    node                          10.8.0-alpine       5a519d1e3a24        2 weeks ago         70.3MB
    node                          9.8.0-alpine        4a6857f6f75d        5 months ago        68.4MB
    
```

前两项是新编译的image， 可以通过一下命令手动启动一个节点

```bash
    docker run -ti --rm layacloud-node_layanode:latest sh
   
<进入docker 运行环境>    
   /layacloud-node 
   ./dev.sh
```

