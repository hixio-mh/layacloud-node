#!/bin/sh

DOCKER_LIST=$(sudo docker ps -q)

for i in ${DOCKER_LIST}; do
	echo CURRENT_CONTAINER:${i}
	sudo docker logs ${i}
	echo CURRENT_CONTAINER:${i}
done
