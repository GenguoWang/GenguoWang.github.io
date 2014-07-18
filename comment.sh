#!/bin/bash
if [ $# -ne 2 ]
then
    echo "Usage: $0 post comment"
    exit -1
fi
date=`date "+%Y-%m-%d %H:%M:%S"`
user=`cat user.conf |sed 's/^\s*username\s*=\s*\(.*\)\s*$/\1/'|head -n 1`
ptag=$1
msg=$2
echo $ptag | grep -q -e "^_posts/.*$"
if [ $? -eq 0 ]
then
    post=$ptag
else
    num=`ls _posts/*$ptag* 2>/dev/null | wc | awk '{print $1}'`
    if [ $num -eq 1 ]
    then
        post=`ls _posts/*$ptag*`
	elif [ $num -eq 0 ]
	then
		echo "$ptag not exist"
        exit -1
    else
        ls _posts/*$ptag*
        echo "$ptag is ambiguous"
        exit -1
    fi
fi
echo "commnet to $post"
echo ">$date $user:    "
echo ">$msg"
echo "sure to comment?(press enter to continue,or Ctrl+C to stop)"
read
echo "commenting..."
echo "">> $post
echo ">$date $user:    ">> $post
echo ">$msg">> $post
git pull origin master
git add $post
git commit -m"add comment"
git push origin master
echo "suceeded!"
