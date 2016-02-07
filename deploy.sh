
SSH_KEY="/Users/msklvsk/.ssh/aws.pem"  # todo
REMOTE="ubuntu@mova.institute"
DEST="/srv/www/mova-institute/mi-lib"
SOURCE="./dist/mannotator/"
ERRORSTRING="Wrong params"


if [ $# -eq 0 ]
    then
        echo $ERRORSTRING;
elif [ $1 == "mannotator" ]
  then
    if [[ -z $2 ]]
      then
        echo "Running dry-run"
        rsync --dry-run -az --force --delete --progress -e "ssh -i $SSH_KEY -p22" $SOURCE $REMOTE:$DEST
    elif [ $2 == "go" ]
      then
        echo "Running actual deploy"
        rsync -az --force --delete --filter='P node_modules/' --progress -e "ssh -i $SSH_KEY -p22" $SOURCE $REMOTE:$DEST || exit 1
        ssh -i $SSH_KEY $REMOTE "cd $DEST && npm prune && npm update" || exit 1
    else
      echo $ERRORSTRING;
      exit 1
    fi
fi