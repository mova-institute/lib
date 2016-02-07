
SSH_KEY="/Users/msklvsk/.ssh/aws.pem"  # todo
REMOTE="ubuntu@mova.institute:/srv/www/mova-institute/mi-lib"
SOURCE="./dist/mannotator"



if [ $# -eq 0 ]
    then
        echo $ERRORSTRING;
elif [ $1 == "prod" ]
    then
        if [[ -z $2 ]]
            then
                echo "Running dry-run"
                DRY="--dry-run"
        elif [ $2 == "go" ]
            then
                echo "Running actual deploy"
        else
            echo $ERRORSTRING;
            exit 1
        fi
        rsync $DRY -az --force --delete --progress -e "ssh -i $SSH_KEY -p22" $SOURCE $REMOTE
fi