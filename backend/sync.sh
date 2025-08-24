rsync -avz --exclude 'node_modules' --exclude '.git' --exclude '.env' --exclude 'serviceAccountKey.json' \
-e "ssh -i ~/.ssh/israel-EylonsMacbook.pem" \
. ubuntu@ec2-13-48-57-9.eu-north-1.compute.amazonaws.com