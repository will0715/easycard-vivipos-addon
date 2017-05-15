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