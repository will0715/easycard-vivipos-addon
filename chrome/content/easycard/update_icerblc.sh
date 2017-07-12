#!/bin/bash
script=$(readlink -f "$0")
scriptpath=$(dirname "$script")
icerapipath="/home/icerapi"

cd ${scriptpath}

source bash-ini-parser

#set ftp information
cfg_parser "icer_ftp.ini"
cfg_section_ftp
ftp_username=$ftp_username
ftp_password=$ftp_password

#change work directory to icerapi path
cd ${icerapipath}

#remove blc file older than 3 days
find ${icerapipath}/BLC* -mtime +3 -exec rm {} \;

#download blc file
downloadblc=$(lftp -c "set ssl:verify-certificate no;open ftps://cmas-ftp.easycard.com.tw;user ${ftp_username} ${ftp_password};mirror ftpblc ${icerapipath};quit;" 2>&1)
latest_file=$(ls -tr | grep ".BIG$" | tail -n 1)

#change work directory to script path
cd ${scriptpath}

./set_icerini.sh "setblcname" ${latest_file}