#!/bin/sh

PEER_PORT=30656
GAME_PORT=8656

NODE_NUM=6

docker_run(){
	for i in $(seq 1 ${NODE_NUM})
	do
		#echo i:${i} GAME:${GAME_PORT} PEER:${PEER_PORT} node{i}
		#docker run -d -p ${GAME_PORT}:${GAME_PORT} -p ${PEER_PORT}:${PEER_PORT} layacloud-node_layanode --game-port ${GAME_PORT} --peer-port ${PEER_PORT} --addr `curl ip.sb` --curl http://54.238.198.125:9001
		sudo docker run -d -p ${GAME_PORT}:${GAME_PORT} -p ${PEER_PORT}:${PEER_PORT} --name NODE_${i} layacloudnode_layanode --game-port ${GAME_PORT} --peer-port ${PEER_PORT} --addr 18.182.43.99 --curl http://54.238.198.125:9001
		
		GAME_PORT=$(($GAME_PORT+1))
		PEER_PORT=$(($PEER_PORT+1))
	done
}

docker_start(){
	sudo docker stop `sudo docker ps -q`
	
	for i in $(seq 1 ${NODE_NUM})
	do
		sudo docker start NODE_${i}
	done

}
#docker run -p 8656:8656 --network layacloud-local-test layacloud-node_layanode
#docker run -d -p 8665:8656 -p 30665:30656 --name node_10 -e WS_PORT=8665 -e P2P_PORT=30665 layanode
if [ "$1" = "run" ];then
	docker_run
fi

if [ "$1" = "start" ];then
	docker_start
fi
