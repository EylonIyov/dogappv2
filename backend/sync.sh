rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'package-lock.json' --exclude 'sync.sh' \
-e "ssh -i ~/Desktop/.ssh/israel-EylonsMacbook.pem" \
. ubuntu@ec2-13-48-57-9.eu-north-1.compute.amazonaws.com:~/app

