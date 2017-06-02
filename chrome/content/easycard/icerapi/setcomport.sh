#!/bin/bash
script=$(readlink -f "$0")
scriptpath=$(dirname "$script")

cd ${scriptpath}

#support com port : /dev/ttyS0, /dev/ttyS1, /dev/ttyS4
comport=$1
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

#write comport3
reg="s@<ComPort3>.*<\/ComPort3>@<ComPort3>${comportname}<\/ComPort3>@g"
sed $reg ICERINI.xml > ICERINI-new.xml
mv ICERINI-new.xml ICERINI.xml

#write opencom
reg="s@<OpenCom>.*<\/OpenCom>@<OpenCom>$comportindex<\/OpenCom>@g"
sed $reg ICERINI.xml > ICERINI-new.xml
mv ICERINI-new.xml ICERINI.xml

chmod 755 ICERINI.xml