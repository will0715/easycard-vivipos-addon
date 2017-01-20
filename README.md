# 悠遊卡支付插件 #

提供店家整合悠遊卡支付方式

### 生成附加元件檔案 ###
1. Run ./make-xpi "production"

**Note**: If you want to test in sandbox mode, please change chrome/content/controllers/easycard_controller.js property _isSandbox 's value to false
```
#!javascript
_isSandbox: false
```

### EDC C serial port 通訊程式###
*Program Location* rs232/

#### How To Compile:
1. Require the dependecy library [Libserialport](http://sigrok.org/wiki/Libserialport)
2. After installed the library, run gcc -o easycardEDC.o easycard.c /usr/local/lib/libserialport.a