#!/bin/bash

ERRORSTRING="Error. Please make sure you've indicated correct parameters"
REMOTE="ubuntu@mova.institute:/home/ubuntu/mova-institute/mi-lib"
REMOTE_KEY="/Users/msklvsk/.ssh/aws.pem"

if [ $# -eq 0 ]
    then
        echo $ERRORSTRING;
elif [ $1 == "prod" ]
    then
        if [[ -z $2 ]]
            then
                echo "Running dry-run"
                rsync --dry-run -az --force --delete --progress --exclude="node_modules" -e "ssh -i $REMOTE_KEY -p22" ./* $REMOTE
        elif [ $2 == "go" ]
            then
                echo "Running actual deploy"
                rsync -az --force --delete --progress --exclude="node_modules" -e "ssh -i $REMOTE_KEY -p22" ./* $REMOTE
        else
            echo $ERRORSTRING;
        fi
fi

# --exclude-from=rsync_exclude.txt