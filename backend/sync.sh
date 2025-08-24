rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'package-lock.json' --exclude 'sync.sh' --exclude 'add.sh' --exclude 'connectToEc2.sh' \
-e "ssh -i ~/Desktop/.ssh/israel-EylonsMacbook.pem" \
. ubuntu@ec2-16-171-173-92.eu-north-1.compute.amazonaws.com:~/app

