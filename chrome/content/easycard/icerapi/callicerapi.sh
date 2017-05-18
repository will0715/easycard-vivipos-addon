#!/bin/bash
script=$(readlink -f "$0")
scriptpath=$(dirname "$script")

cd ${scriptpath}

#add-on variable
inputdata="/tmp/icerapi_in.data"
outputdata="/tmp/icerapi_out.data"

#icerapi variable
icerdatapath="ICERData/"
icerapireq=${icerdatapath}"ICERAPI.REQ"
icerapires=${icerdatapath}"ICERAPI.RES"
icerapiresok=${icerdatapath}"ICERAPI.RES.OK"

reqxml=$(cat ${inputdata})

#start process if request xml if not empty
if [ ! -z "$reqxml" -a "$reqxml" != " " ]; then
    rm ${outputdata}
    rm ${icerapireq}
    rm ${icerapires}
    rm ${icerapiresok}
    #write request xml to icerapi request file
    echo ${reqxml} > ${icerapireq}
    #execute icerapi program
    ./icerapi
    #read response if response ok file exists
    if [ -f "$icerapiresok" ]; then
        #write response to output data file
        response=$(cat ${icerapires})
        echo ${response} > ${outputdata}
    fi
fi