PWD=`pwd`
git pull
cd ./lib/common
git pull origin master
cd ${PWD}

CONTAINER_COUNT=`sudo docker ps -qa|wc -l`

echo "${CONTAINER_COUNT}"
if [ ${CONTAINER_COUNT} -ne 0 ]; then
    sudo docker stop `sudo docker ps -qa`
    sudo docker rm `sudo docker ps -qa`
fi

#sudo docker build -t layacloud-node_layanode .
sudo docker-compose build
