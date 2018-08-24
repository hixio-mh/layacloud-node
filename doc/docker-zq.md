## 在本机调试过程中的Docker使用说明 

### 已上传到Docker Hub的镜像

- tyrande000/layanode-zq:latest

用于layanode项目，用于每次更改代码Rebuild镜像时的基础镜像，已包含各种代码库

- tyrande000/layacenter-zq:latest

用于layacenter项目，用于每次更改代码Rebuild镜像时的基础镜像，已包含各种代码库

### Layanode编译和启动

- 编译方法（如有代码修改）
```bash
	#用于生成 layacloud-node_layanode，该镜像包含node代码
	docker-compose build
```

- 启动方法
```bash
	#启动10个节点
	docker-compose up --scale layanode=10
	
	#拉皮条节点，暴露主机8656端口，供五子棋项目可以访问本地端口
	docker run -p 8656:8656 --network layacloud-local-test layacloud-node_layanode --url http://172.18.0.2:9001(本人机器上Center IP)
```

### Layacenter编译和启动

- 编译方法（如有代码修改）
```bash
	#用于生成layacloud-center_layacenter，该镜像包含center代码
	docker-compose build
```

- 启动方法
```bash
	#暴露9001端口，给浏览器观察数据用
	docker run -p9001:9001 --network layacloud-local-test layacloud-center_layacenter
```
