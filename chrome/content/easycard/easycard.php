<?php
error_reporting(E_ALL^E_WARNING^E_NOTICE);
$fileName = dirname(__FILE__).'/out.xml';
$response['response'] = null;
$xml = simplexml_load_file($fileName);
if($xml) $response['response'] = $xml;
unlink($fileName);
echo json_encode($response);