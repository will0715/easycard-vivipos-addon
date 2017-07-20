#!/bin/bash
logfile="/var/log/easycard_vivipos.log"
easycard_log="/data/profile/log/easycard/*"
easycard_database="/data/databases/easycard_data.sqlite"

cd ${scriptpath}

WriteLog() {
    logtype=$1
    data=$2
    now=$(date +"%Y-%m-%d %H:%M:%S")
    content="${now} [${logtype}] ${data}"
    echo ${content} >> ${logfile}
}

#write start log
WriteLog "backup" "start backup"

last_media=$(cat /tmp/last_media)
easycard_backup_dir=${last_media}"/easycard"

#last media is available
if [ -d "$last_media" ]; then
    #create backup directory
    mkdir -p ${easycard_backup_dir}
    cd ${easycard_backup_dir}

    #remove files older then 180 days
    find ${easycard_backup_dir} -mtime +90 -exec rm {} \;

    #copy logs and transaction database to backup directory
    cp -rf ${easycard_log} ${easycard_backup_dir}
    cp -f ${easycard_database} ${easycard_backup_dir}

    #write end log
    WriteLog "backup" "backup success"
else
    #write fail log
    WriteLog "backup" "backup media not found"
fi