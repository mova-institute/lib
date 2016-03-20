
SSH_KEY="$HOME/.ssh/mova.institute.key"
REMOTE="ubuntu@mova.institute"
DEST="/opt/node/mi-web"
SOURCE="dist/mi-web/"
ERRORSTRING="Wrong params"


if [ $# -eq 0 ]
  then
    echo $ERRORSTRING;
elif [ $1 == "mi-web" ]
  then
    if [[ -z $2 ]]
      then
        echo "Running dry-run"
        rsync --dry-run -rlpcgoD --force --delete --filter='P node_modules/' -i         -e "ssh -i $SSH_KEY" $SOURCE $REMOTE:$DEST | pcregrep '^[<>*]' || exit 1
    elif [ $2 == "go" ]
      then
        echo "Running actual deploy"
        rsync           -rlpcgoD --force --delete --filter='P node_modules/' --progress -e "ssh -i $SSH_KEY" $SOURCE $REMOTE:$DEST                    || exit 1
        ssh -i $SSH_KEY $REMOTE "cd $DEST && npm prune && npm update && pm2 restart mi-web" || exit 1
    else
      echo $ERRORSTRING;
      exit 1
    fi
fi