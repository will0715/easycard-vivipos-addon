#!/bin/bash
SCRIPT=$(readlink -f "$0")
SCRIPTPATH=$(dirname "$SCRIPT")
input_file="in.data";
output_xml_file="out.xml";
output_data_file="out.data";
cd ${SCRIPTPATH}
chmod 755 *
./easycardEDC.o > ${output_xml_file}
/usr/bin/php ./easycard.php > ${output_data_file}

rm -f ${input_file} ${output_xml_file};