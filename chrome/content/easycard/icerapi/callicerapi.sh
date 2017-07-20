#!/bin/bash
script=$(readlink -f "$0")
scriptpath=$(dirname "$script")
logfile=/var/log/easycard_vivipos.log

cd ${scriptpath}


WriteLog() {
    logtype=$1
    data=$2
    now=$(date +"%Y-%m-%d %H:%M:%S")
    content="${now} [${logtype}] ${data}"
    echo ${content} >> ${logfile}
}

#add-on variable
inputdata="/tmp/icerapi_in.data"
outputdata="/tmp/icerapi_out.data"

#icerapi variable
icerdatapath="ICERData/"
icerapireq=${icerdatapath}"ICERAPI.REQ"
icerapireqok=${icerdatapath}"ICERAPI.REQ.OK"
icerapires=${icerdatapath}"ICERAPI.RES"
icerapiresok=${icerdatapath}"ICERAPI.RES.OK"

reqxml=$(cat ${inputdata})
#write request log
WriteLog "request" "${reqxml}"

#start process if request xml if not empty
if [ ! -z "$reqxml" -a "$reqxml" != " " ]; then
    rm ${outputdata}
    rm ${icerapireq}
    rm ${icerapireqok}
    rm ${icerapires}
    rm ${icerapiresok}
    #write request xml to icerapi request file
    echo ${reqxml} > ${icerapireq}
    touch ${icerapireqok}
    #execute icerapi program
    LD_LIBRARY_PATH=${scriptpath} ${scriptpath}/icerapi
    #read response if response ok file exists
    if [ -f "$icerapiresok" ]; then
        #write response to output data file
        response=$(cat ${icerapires})
        echo ${response} > ${outputdata}
        #wrtie response log
        WriteLog "response" "${response}"
    fi
fi