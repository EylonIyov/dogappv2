sudo docker build -t dogapp-backend .

sudo docker run -d \
  --name dogapp-backend \
  -p 3000:3000 \
  --env-file .env.production \
  --restart unless-stopped \
  dogapp-backend