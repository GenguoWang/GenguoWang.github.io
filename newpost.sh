#!/bin/bash
if [ $# -ne 1 ]; then
    echo "Usage: $0 postname"
    exit -1
fi
predate=`date "+%Y-%m-%d"`
date=`date "+%Y-%m-%d %H:%M:%S"`
user=`cat user.conf |sed 's/^\s*username\s*=\s*\(.*\)\s*$/\1/'|head -n 1`
tag=$1
name=` echo "$1" | sed 's/ /-/g'`
draft="_drafts/${predate}-${name}.md"
post="_posts/${predate}-${name}.md"
if [ -f "$post" ]; then
    echo "$post already exists"
	exit -1
fi
if [ ! -f "$draft" ]; then
    cat post.tpl |sed -e "s/####//;s/NAME/$user/;s/DATE/$date/;s/TAG/$tag/" > $draft
fi
vim $draft
echo "sure to post?(press enter to continue,or Ctrl+C to stop)"
read
mv $draft $post
echo "posting..."
git pull origin master
git add $post
git commit -m"post $post"
git push origin master
echo "suceeded!"

