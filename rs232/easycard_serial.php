<?php
include(dirname(__FILE__).'/PhpSerial.php');

define('STX', "0x02");
define('ETX', "0x03");
define('ACK', "0x06");
define('NAK', "0x15");

try {
$serial = new PhpSerial();
} catch (Exception $e) {
error_log($e->getMessage());
}

$serial->deviceSet("/dev/ttyS0");

$serial->confBaudRate(115200);
$serial->confParity('none');
$serial->confCharacterLength(8);
$serial->confStopBits(1);
$serial->confFlowControl('xon/xoff');

$serial->deviceOpen();

$requestData = file_get_contents('/tmp/in.data');
$request= pack('H*', bin2hex(chr(STX).$requestData.chr(ETX)));
$serial->sendMessage($request, 2);
$buffer = '';
$end = '';
$res = unpack('C*', fread($serial->_dHandle, 1));
if($res[1] == ACK) {
  do {
    $res = unpack('C*', fread($serial->_dHandle, 128));
    if(count($res) > 0) $end = $res[count($res)];
    for($i = 1; $i <= count($res); $i++) {
      if($res[$i] != STX && $res[$i] != ETX) {
        $buffer .= chr($res[$i]);
      }
    }
  } while($end != ETX);
  //read response finished, send ACK signal to EDC.
  $serial->sendMessage(pack('H', ACK));
} else if($res[1] == NAK) {
  $buffer = '<EDC><TRANS><T3900>99998</T3900><ErrMsg></ErrMsg></TRANS></EDC>';
} else {
  $buffer = '<EDC><TRANS><T3900>99999</T3900><ErrMsg></ErrMsg></TRANS></EDC>';
}

$serial->deviceClose();

$fileName = '/tmp/out.xml';
$response['response'] = null;
$xml = simplexml_load_file($fileName);
if($xml) $response['response'] = $xml;
unlink($fileName);
echo json_encode($response);