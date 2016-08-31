REMOTE="msklvsk@mova.institute"
DEST="/opt/node/annotator"
SOURCE="../dist/*"
ERRORSTRING="Wrong params"


if [ $# -eq 0 ]
  then
    echo $ERRORSTRING;
elif [ $1 == "annotator" ]
  then
    if [[ -z $2 ]]
      then
        echo "Running dry-run"
        rsync --dry-run -rlpcgoD --force --delete --exclude 'node_modules/libxmljs/build'            -i -e ssh $SOURCE $REMOTE:$DEST | pcregrep '^[<>*]' || exit 1
    elif [ $2 == "go" ]
      then
        echo "Running actual deploy"
        rsync           -rlpcgoD --force --delete --exclude 'node_modules/libxmljs/build' --progress    -e ssh $SOURCE $REMOTE:$DEST                    || exit 1
        ssh $REMOTE "cd $DEST && pm2 restart annotator" || exit 1
    else
      echo $ERRORSTRING;
      exit 1
    fi
fi
