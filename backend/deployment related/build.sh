#Stop existing container
sudo docker stop dogapp-backend

#Delete the old image
sudo docker rm dogapp-backend

# Force stop and remove all containers
sudo docker rm dogapp-backend

# Remove any dangling containers with the same name
sudo docker rm -f dogapp-backend 2>/dev/null || true

# Remove the old image
sudo docker rmi dogapp-backend_dogapp-backend 2>/dev/null || true

#build the new image
sudo docker build -t dogapp-backend .


#Start the container
sudo docker run -d \
  --name dogapp-backend \
  -p 8080:8080 \
  --env-file .env.production \
  --restart unless-stopped \
  dogapp-backend

