#!/bin/bash
script=$(readlink -f "$0")
scriptpath=$(dirname "$script")

cd ${scriptpath}

#copy logrotate script to logrotate.d
cp -rf vivipos_easycardlog /etc/logrotate.d/

#copy cronjob to cron.hourly
cp -rf easycardschedule /etc/cron.hourly/

#create easycard data directory
mkdir -p /data/profile/log/easycard

destination=/home/icerapi/
#create icerapi library directory
mkdir -p ${destination}
chmod -R 755 ${destination}

#copy icerapi script to library directory
cp -rf icerapi/* ${destination}

cd ${destination}

ln -s ./libssl/libssl.so libssl.so.1.0.0
ln -s ./libssl/libcrypto.so libcrypto.so.1.0.0

# check the [timeout] bin file for MP3275A
LSB_RELEASE=`lsb_release -s -c`
checkfile1="/usr/local/bin/timeout"
checkfile2="/usr/bin/timeout"

if [ ! -f "$checkfile1" ] && [ X"$LSB_RELEASE" = X"hardy" ]; then
    cp -rf timeout-hardy /usr/local/bin/timeout
fi

if [ ! -f "$checkfile2" ] && [ X"$LSB_RELEASE" = X"hardy" ]; then
    cp -rf timeout-hardy /usr/bin/timeout
fi