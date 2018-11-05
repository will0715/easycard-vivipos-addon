#!/bin/bash
script=$(readlink -f "$0")
scriptpath=$(dirname "$script")

scripticerpath=${scriptpath}"/icerapi"
icerapipath="/home/icerapi"

cd ${scripticerpath}

action=$1

if [[ "$action" == "setcomport" ]]; then
    comport=$2
    #support com port : /dev/ttyS0, /dev/ttyS1, /dev/ttyS4
    if ! [[ "$comport" =~ ^(1|2|5)$ ]]; then
        exit
    fi

    comportindex=$(expr $comport - 1)
    comportname="/dev/ttyS"$comportindex

    #write comport
    reg="s@<ComPort>.*<\/ComPort>@<ComPort>$comport<\/ComPort>@g"
    sed $reg ICERINI.xml > ICERINI-new.xml
    mv ICERINI-new.xml ICERINI.xml

    #write comport2
    reg="s@<ComPort2>.*<\/ComPort2>@<ComPort2>${comportname}<\/ComPort2>@g"
    sed $reg ICERINI.xml > ICERINI-new.xml
    mv ICERINI-new.xml ICERINI.xml

    #write opencom
    reg="s@<OpenCom>.*<\/OpenCom>@<OpenCom>$comportindex<\/OpenCom>@g"
    sed $reg ICERINI.xml > ICERINI-new.xml
    mv ICERINI-new.xml ICERINI.xml
elif [[ "$action" == "setspid" ]]; then
    spid=$2
    reg="s@<NewSPID>.*<\/NewSPID>@<NewSPID>$spid<\/NewSPID>@g"
    sed $reg ICERINI.xml > ICERINI-new.xml
    mv ICERINI-new.xml ICERINI.xml
elif [[ "$action" == "setlocationid" ]]; then
    location_id=$2
    reg="s@<TMLocationID>.*<\/TMLocationID>@<TMLocationID>$location_id<\/TMLocationID>@g"
    sed $reg ICERINI.xml > ICERINI-new.xml
    mv ICERINI-new.xml ICERINI.xml
elif [[ "$action" == "setblcname" ]]; then
    blcname=$2
    reg="s@<BLCName>.*<\/BLCName>@<BLCName>$blcname<\/BLCName>@g"
    sed $reg ICERINI.xml > ICERINI-new.xml
    mv ICERINI-new.xml ICERINI.xml
elif [[ "$action" == "setcmasport" ]]; then
    cmas_port=$2
    reg="s@<CMAS_Port>.*<\/CMAS_Port>@<CMAS_Port>$cmas_port<\/CMAS_Port>@g"
    sed $reg ICERINI.xml > ICERINI-new.xml
    mv ICERINI-new.xml ICERINI.xml
else
    echo 'Wrong action'
fi

#move file to icerapi path
chmod 755 ICERINI.xml
cp -f ICERINI.xml ${icerapipath}"/ICERINI.xml"