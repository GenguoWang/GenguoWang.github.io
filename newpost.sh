#!/bin/bash
if [ $# -ne 1 ]
then
    echo "Usage: $0 postname"
    exit -1
fi
predate=`date "+%Y-%m-%d"`
date=`date "+%Y-%m-%d %H:%M:%S"`
user=`cat user.conf |sed 's/^\s*username\s*=\s*\(.*\)\s*$/\1/'|head -n 1`
tag=$1
name=` echo "$1" | sed 's/ /-/g'`
post="_posts/${predate}-${name}.md"
echo $post
num=`ls $post 2>/dev/null | wc | awk '{print $1}'`
if [ $num -eq 1 ]
then
    echo "$post already exists"
	exit -1
fi
cat post.tpl |sed "s/NAME/$user/"|sed "s/DATE/$date/"|sed "s/TAG/$tag/" > $post.tmp
vim $post.tmp
echo "sure to post?(press enter to continue,or Ctrl+C to stop)"
read
mv $post.tmp $post
echo "posting..."
git pull origin master
git add $post
git commit -m"post $post"
git push origin master
echo "suceeded!"

