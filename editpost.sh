#!/bin/bash
if [ $# -ne 1 ]; then
    echo "Usage: $0 ptag"
    exit -1
fi
ptag=$1
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
name=`basename $post`
draft="_drafts/$name"
if [ ! -f "$draft" ]; then
    cp $post $draft
fi
vim $draft
echo "sure to save the change?(press enter to continue,or Ctrl+C to stop)"
read
mv $draft $post
echo "committing..."
git pull origin master
git add $post
git commit -m"edit $post"
git push origin master
echo "suceeded!"

