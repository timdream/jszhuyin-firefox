#/bin/bash

# This script make AMO reviewers happy by removing build scripts
# and uncessary files

echo "This file will attempt to stash local changes in data/jszhuyin before"
echo "removing files, but you are still in risk of lost any local changes."
echo "Also, any local changes in the directory will not be included in xpi."
echo "Do you wish to continue? Press Ctrl+C to exit."
read

cd `dirname $0`

echo
echo "Delete files ..."
cd ./data/jszhuyin
[[ $(git status 2> /dev/null | tail -n1 | awk '{print $1}') != "nothing" ]] && DIRTY=1
[ ! -z $DIRTY ] && git stash >> /dev/null
rm -rf Makefile Gruntfile.js test build index.html minimal.html

echo
echo "Making xpi..."
cd ../../
cfx xpi

echo
echo "Restore files ..."
cd ./data/jszhuyin
git checkout Makefile Gruntfile.js test build index.html minimal.html
[ ! -z $DIRTY ] && git stash pop >> /dev/null

echo
echo 'Done.'
