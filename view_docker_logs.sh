#!/bin/sh

DOCKER_LIST=$(docker ps -q)

for i in ${DOCKER_LIST}; do
	echo CURRENT_CONTAINER:${i}
	docker logs ${i}
	echo CURRENT_CONTAINER:${i}
done
