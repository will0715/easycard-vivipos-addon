#!/bin/bash
script=$(readlink -f "$0")
scriptpath=$(dirname "$script")
icerapipath="/home/icerapi"

cd ${scriptpath}

#set ftp information
ftp_username=$1
ftp_password=$2

#change work directory to icerapi path
cd ${icerapipath}

#remove blc file older than 5 days
find ${icerapipath}/BLC* -mtime +5 -exec rm {} \;

#download blc file
downloadblc=$(lftp -c "set ssl:verify-certificate no;open ftps://cmas-ftp.easycard.com.tw;user ${ftp_username} ${ftp_password};mget /ftpblc/*;quit;" 2>&1)
latest_file=$(ls -tr | grep ".BIG$" | tail -n 1)

blc_count=$(find ./BLC* | wc -l)
blc_uptodate_file="/tmp/easycard_blc_uptodate"

if [ "$blc_count" -gt "0" ]; then
    echo 1 > ${blc_uptodate_file}
else
    echo 0 > ${blc_uptodate_file}
fi

#change work directory to script path
cd ${scriptpath}

./set_icerini.sh "setblcname" ${latest_file}