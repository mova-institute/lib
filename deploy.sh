
SSH_KEY="$HOME/.ssh/aws.pem"
REMOTE="ubuntu@mova.institute"
DEST="/opt/node/mannotator"
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
        rsync --dry-run -az --force --delete --filter='P node_modules/' --progress -e "ssh -i $SSH_KEY -p22" $SOURCE $REMOTE:$DEST
    elif [ $2 == "go" ]
      then
        echo "Running actual deploy"
        rsync           -az --force --delete --filter='P node_modules/' --progress -e "ssh -i $SSH_KEY -p22" $SOURCE $REMOTE:$DEST || exit 1
        ssh -i $SSH_KEY $REMOTE "cd $DEST && npm prune && npm update && pm2 restart mannotator" || exit 1
    else
      echo $ERRORSTRING;
      exit 1
    fi
fi