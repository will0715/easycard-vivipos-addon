#!/bin/bash
script=$(readlink -f "$0")
scriptpath=$(dirname "$script")

cd ${scriptpath}

destination=/home/icerapi/
#create icerapi library directory
mkdir -p ${destination}
chmod -R 755 ${destination}

#copy icerapi script to library directory
cp -rf icerapi/* ${destination}

cd ${destination}

ln -s ./libssl/libssl.so libssl.so.1.0.0
ln -s ./libssl/libcrypto.so libcrypto.so.1.0.0