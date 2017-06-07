(function() {

    if (typeof AppController === 'undefined') {
        include('chrome://viviecr/content/controllers/app_controller.js');
    }
    if (typeof ICERAPIRequest === 'undefined') {
        include('chrome://easycard_payment/content/easycard/ICERAPIRequest.js');
    }
    if (typeof ICERAPIResponse === 'undefined') {
        include('chrome://easycard_payment/content/easycard/ICERAPIResponse.js');
    }

    include('chrome://easycard_payment/content/libs/xml2json.min.js');
    include('chrome://easycard_payment/content/models/easycard_transaction.js');

    var mainWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("Vivipos:Main");
    var extMgr = Components.classes["@mozilla.org/extensions/manager;1"].getService(Components.interfaces.nsIExtensionManager);
    var extItem = extMgr.getItemForID('viviecr@firich.com.tw');

    const __controller__ = {

        name: 'EasycardPayment',
        packageName: 'easycard_payment',
        components: ['Acl'],
        uses: ['ShiftMarker'],
        _hostSequenceKey: 'easycardHostSeq',
        _cartController: null,
        _icerAPIPath: '/home/icerapi/',
        _icerAPIScript: "callicerapi.sh",
        _scriptPath: "/data/profile/extensions/easycard_payment@vivicloud.net/chrome/content/easycard/",
        _inFile: "/tmp/icerapi_in.data",
        _outputFile: "/tmp/icerapi_out.data",
        _dialogPanel: null,
        _receiptPrinter: 1,
        _prefsPrefix: 'vivipos.fec.settings.easycard_payment',

        initial: function() {
            if (!this._cartController) {
                this._cartController = GeckoJS.Controller.getInstanceByName('Cart');
                if (extItem && extItem.version.indexOf('1.3.3') != -1) {
                    this._cartController.addEventListener('confirmVoidSale', this.easycardRefund, this);
                } else {
                    this._cartController.addEventListener('beforeVoidSale', this.easycardRefundOld, this);
                }
            }

            if (GeckoJS.Controller.getInstanceByName('ShiftChanges')) {
                GeckoJS.Controller.getInstanceByName('ShiftChanges').addEventListener('shiftChanged', this.easycardSettlement, this);
            }

            if (GeckoJS.Controller.getInstanceByName('Main')) {
                GeckoJS.Controller.getInstanceByName('Main').addEventListener('afterClearOrderData', this.expireData, this);
                GeckoJS.Controller.getInstanceByName('Main').addEventListener('afterTruncateTxnRecords', this.truncateData, this);
            }

            this.initialDatabase();

            this.copyScripts();

            //copy logrotate script to logrotate.d
            GREUtils.File.copy(this._scriptPath+'vivipos_easycardlog', '/etc/logrotate.d/');

            //startup sign on to get machine ready.
            this._dialogPanel = this._showDialog(_('Easycard sign on is processing, pelase wait...'));
            try {
                this.easycardSignOn(true);
            } catch (e) {
                this.log('DEBUG', e.message);
            } finally {
                this._dialogPanel.close();
            }
        },
        // create required table from schema file.
        initialDatabase: function() {

            this.dispatchEvent('beforeInitialDatabase', {});

            var schemaSqlUrl = 'chrome://' + this.packageName + '/content/databases/schema.sql';

            var sqlFilePath = GREUtils.File.chromeToPath(schemaSqlUrl);
            var sqlFile = GREUtils.File.getFile(sqlFilePath);
            if (sqlFile && sqlFile.exists()) {

                var schemaSqlFile = new GeckoJS.File(sqlFile);
                schemaSqlFile.open("r");
                var sqlLines = schemaSqlFile.readAllLine();
                schemaSqlFile.close();

                var datasource = GeckoJS.ConnectionManager.getDataSource('easycard_data');
                try {
                    sqlLines.forEach(function(sql) {
                        datasource.execute(sql);
                    });
                } catch (e) {
                    this.log('FATAL', 'ERROR Initial easycard_payment schema.sql schema.');
                }

            }

            this.dispatchEvent('afterInitialDatabase', {});

            return true;

        },
        /**
         * copy icerapi scripts to home directory
         * Note: icerapi cannot excute in long directory prefix
         */
        copyScripts: function() {
            let flagInstallFile = GREUtils.File.chromeToPath('chrome://' + this.packageName + '/content/flags/first_install');
            if (GREUtils.File.exists(flagInstallFile)) {
                GREUtils.File.remove(flagInstallFile);
                try {
                    GREUtils.File.run('/bin/sh', ['-c', this._scriptPath + 'copyicerapi.sh' ], true);
                } catch (e) {
                    this.log('ERROR', e);
                }
            }

            let icerapiProgram = this._icerAPIPath+'icerapi';

            if (!GREUtils.File.exists(icerapiProgram)) {
                alert(_('Failed to install easycard library, please contact technical support.'));
            }
        },

        expireData: function(evt) {
            var model = new EasycardTransaction();
            var expireDate = parseInt(evt.data);
            if (!isNaN(expireDate)) {
                try {
                    var r = model.restoreFromBackup();
                    if (!r) {
                        throw {errno: model.lastError,
                               errstr: model.lastErrorString,
                               errmsg: _('An error was encountered while expiring backup easycard activity logs (error code %S) [messages #801].', [model.lastError])};
                    }

                    r = model.clearExpireData(expireDate);
                    if (!r) {
                        throw {errno: model.lastError,
                               errstr: model.lastErrorString,
                               errmsg: _('An error was encountered while expiring ledger easycard logs (error code %S) [messages #802].', [model.lastError])};
                    }
                }
                catch(e) {
                    this._dbError(e.errno, e.errstr, e.errmsg);
                }
            }
        },

        truncateData: function(evt) {
            var model = new EasycardTransaction();
            try {
                var r = model.restoreFromBackup();
                if (!r) {
                    throw {errno: model.lastError,
                           errstr: model.lastErrorString,
                           errmsg: _('An error was encountered while removing all backup easycard activity logs (error code %S) [messages #805].', [model.lastError])};
                }

                r = model.truncateData();
                if (!r) {
                    throw {errno: model.lastError,
                           errstr: model.lastErrorString,
                           errmsg: _('An error was encountered while removing all easycard activity logs (error code %S) [messages #806].', [model.lastError])};
                }
            }
            catch(e) {
                this._dbError(e.errno, e.errstr, e.errmsg);
            }
        },

        _dbError: function(errno, errstr, errmsg) {
            this.log('ERROR', 'Database error: ' + errstr + ' [' +  errno + ']');
            GREUtils.Dialog.alert(this.topmostWindow,
                                  _('Data Operation Error'),
                                  errmsg + '\n\n' + _('Please restart the machine, and if the problem persists, please contact technical support immediately.'));
        },

        /**
         * deduct transaction
         * @param {Boolean} receipt print mode, -1: no print 1: force print
         */
        easycardDeduct: function(receiptPrintMode) {
            let cart = mainWindow.GeckoJS.Controller.getInstanceByName('Cart');
            let currentTransaction = cart._getTransaction();
            let remainTotal = currentTransaction != null ? currentTransaction.getRemainTotal() : 0;
            let transactionSeq = currentTransaction != null ? currentTransaction.data.seq : null;
            let hostSerialNum = this._getHostSerialNum();
            if (remainTotal <= 0) {
                NotifyUtils.info(_('Transaction amount is lower than 0, please check amount'));
                return;
            }
            if (!transactionSeq) {
                NotifyUtils.info(_('Data error, please contact technical support'));
                return;
            }

            $.blockUI({
                "message": '<h3>' + _('Screen Lock') + '</h3>'
            });
            let waitPanel = this._showWaitPanel(_('Transaction in progress'));

            try {
                let batchNo = this._getBatchNo();
                let result = this.processDeduct(batchNo, remainTotal, hostSerialNum, transactionSeq);

                if (!result) {
                    this._setWaitDescription(_('Transaction failed, cannot pay with easycard'));
                    this.sleep(2000);
                } else if (result[ICERAPIResponse.KEY_RETURN_CODE] != ICERAPIResponse.CODE_SUCCESS) {
                    this._setWaitDescription(_('Transaction failed, cannot pay with easycard') + "\n" + _('Error ' + result[ICERAPIResponse.KEY_RETURN_CODE]));
                    this.sleep(2000);
                } else if (result[ICERAPIResponse.KEY_TXN_AMOUNT] > 0) {
                    let easycardTxnAmount = result[ICERAPIResponse.KEY_TXN_AMOUNT];
                    let txnAmount = ICERAPIResponse.calAmount(easycardTxnAmount);
                    let balance = ICERAPIResponse.calAmount(result[ICERAPIResponse.KEY_BALANCE]);
                    let oldBalance = ICERAPIResponse.calAmount(result[ICERAPIResponse.KEY_OLD_BALANCE]);
                    let easycardAutoloadAmount = result[ICERAPIResponse.KEY_AUTOLOAD_TXN_AMOUNT];
                    let autoloadAmount = (typeof easycardAutoloadAmount != 'undefined') ? ICERAPIResponse.calAmount(easycardAutoloadAmount) : 0;

                    this._setWaitDescription(_('Transaction success, please see details below', [txnAmount, balance]));

                    let deviceId = result[ICERAPIResponse.KEY_DEVICE_ID];
                    let cardId = result[ICERAPIResponse.KEY_RECEIPT_CARD_ID];
                    let rrn = result[ICERAPIResponse.KEY_REFERENCE_NUM];
                    let memo = deviceId+'-'+cardId+'-'+rrn;
                    currentTransaction.data.easycard = {
                        cardId: cardId,
                        deviceId: deviceId,
                        rrn: rrn,
                        txnDate: this._formatDateTime(result[ICERAPIResponse.KEY_TXN_DATE], result[ICERAPIResponse.KEY_TXN_TIME]),
                        txnAmount: txnAmount,
                        autoloadAmount: autoloadAmount,
                        balance: balance,
                        oldBalance: oldBalance,
                        txnType: 'Deduct',
                        batchNo: batchNo
                    };
                    cart._addPayment('easycard', txnAmount, null, 'easycard', memo, false, false);

                    //save easycard transactin record
                    let easycardTransaction = new EasycardTransaction();
                    easycardTransaction.saveRecord(batchNo, (new ICERAPIRequest()).MESSAGE_TYPE["request"], 'deduct', rrn, currentTransaction.data.id, easycardTxnAmount, easycardAutoloadAmount, result);
                    this.sleep(500);

                    if (!receiptPrintMode || receiptPrintMode != -1) {
                        if (receiptPrintMode == 1 || GREUtils.Dialog.confirm(this.topmostWindow, _('Do you want to print Easycard deduct receipt?'), _('Do you want to print Easycard deduct receipt?'))) {
                            this.printReceipt(currentTransaction, this._receiptPrinter, false, true);
                        }
                    }
                    this.sleep(1500);
                } else {
                    this._setWaitDescription(_('Transaction failed, cannot pay with easycard'));
                    this.sleep(2000);
                }
            } catch (e) {
                this.log('ERROR', e);
            } finally {
                waitPanel.hidePopup();
                $.unblockUI();
            }
        },
        /**
         * process the deduct payment
         * @param {String} batch no
         * @param {Integer} remaining total
         * @param {String} HOST serialNum
         * @param {String} transactionSeq
         * @return {Object|null}
         */
        processDeduct: function(batchNo, remainTotal, hostSerialNum, transactionSeq) {
            let icerAPIRequest = new ICERAPIRequest(batchNo);
            let request = icerAPIRequest.deductRequest(remainTotal, hostSerialNum, transactionSeq);
            let result = this._callICERAPI(request);
            //timeout or retry required
            if (!result || ICERAPIResponse.isRetryRequired(result)) {
                for (let retryAttempts = 0; retryAttempts < 3; retryAttempts++) {
                    if (GREUtils.Dialog.confirm(this.topmostWindow, _('Retry payment'), _('Payment timeout, please check the device and easycard, press the OK button to retry payment'))) {
                        this.sleep(500);
                        request = icerAPIRequest.deductRequest(remainTotal, hostSerialNum, transactionSeq);
                        result = this._callICERAPI(request);
                        //return normal result
                        if (result && !ICERAPIResponse.isRetryRequired(result)) {
                            return result;
                        }
                    } else {
                        //cancel retry payment
                        break;
                    }
                    this.sleep(1000);
                }
            }
            return result;
        },
        /**
         * refund easycard transaction when voidsale
         */
        easycardRefund: function(evt) {
            return this.processRefund(evt);
        },
        /**
         * refund for old ecr version
         */
        easycardRefundOld: function(evt) {
            return this.processRefund(evt, 'old');
        },
        /**
         * process refund easycard transaction
         */
        processRefund: function(evt, version) {
            let cart = mainWindow.GeckoJS.Controller.getInstanceByName('Cart');
            let currentTransaction = cart._getTransaction();
            let transactionSeq = currentTransaction != null ? currentTransaction.data.seq : null;
            let hostSerialNum = this._getHostSerialNum();
            if (!transactionSeq) {
                NotifyUtils.info(_('Data error, please contact technical support'));
                return false;
            }
            let waitPanel = null;
            try {
                let refundPayments = null;
                if (version === 'old') {
                    refundPayments = evt.data.OrderPayment;
                } else {
                    refundPayments = evt.data.refundPayments;
                }

                if (typeof refundPayments === 'object') {

                    for (i = 0; i < refundPayments.length; i++) {
                        if (refundPayments[i].name == "easycard") {
                            let refundAmount = Math.abs(refundPayments[i].amount);

                            $.blockUI({
                                "message": '<h3>' + _('Screen Lock') + '</h3>'
                            });
                            waitPanel = this._showWaitPanel(_('Transaction in progress'));

                            let batchNo = this._getBatchNo();
                            let icerAPIRequest = new ICERAPIRequest(batchNo);
                            let request = icerAPIRequest.refundRequest(refundAmount, hostSerialNum, transactionSeq);
                            let result = this._callICERAPI(request);
                            if (!result) {
                                this._setWaitDescription(_('Transaction failed, cannot refund payment with easycard'));
                                this.sleep(2000);
                                evt.preventDefault();
                            } else if (result[ICERAPIResponse.KEY_RETURN_CODE] != ICERAPIResponse.CODE_SUCCESS) {
                                this._setWaitDescription(_('Transaction failed, cannot refund payment with easycard') + "\n" + _('Error ' + result[ICERAPIResponse.KEY_RETURN_CODE]));
                                this.sleep(2000);
                                evt.preventDefault();
                            } else if (typeof result[ICERAPIResponse.KEY_TXN_AMOUNT] === 'undefined' || refundAmount != ICERAPIResponse.calAmount(result[ICERAPIResponse.KEY_TXN_AMOUNT])) {
                                this._setWaitDescription(_('Transaction failed, cannot refund payment with easycard'));
                                this.sleep(2000);
                                evt.preventDefault();
                            } else {
                                let easycardTxnAmount = result[ICERAPIResponse.KEY_TXN_AMOUNT];
                                let txnAmount = ICERAPIResponse.calAmount(easycardTxnAmount);
                                let balance = ICERAPIResponse.calAmount(result[ICERAPIResponse.KEY_BALANCE]);
                                let oldBalance = ICERAPIResponse.calAmount(result[ICERAPIResponse.KEY_OLD_BALANCE]);
                                let deviceId = result[ICERAPIResponse.KEY_DEVICE_ID];
                                let cardId = result[ICERAPIResponse.KEY_RECEIPT_CARD_ID];
                                let rrn = result[ICERAPIResponse.KEY_REFERENCE_NUM];
                                let easycardAutoloadAmount = result[ICERAPIResponse.KEY_AUTOLOAD_TXN_AMOUNT];
                                let autoloadAmount = (typeof easycardAutoloadAmount != 'undefined') ? ICERAPIResponse.calAmount(easycardAutoloadAmount) : 0;
                                currentTransaction.data.easycard = {
                                    cardId: cardId,
                                    deviceId: deviceId,
                                    rrn: rrn,
                                    txnDate: this._formatDateTime(result[ICERAPIResponse.KEY_TXN_DATE], result[ICERAPIResponse.KEY_TXN_TIME]),
                                    txnAmount: txnAmount,
                                    autoloadAmount: autoloadAmount,
                                    balance: balance,
                                    oldBalance: oldBalance,
                                    txnType: 'Refund',
                                    batchNo: batchNo
                                };
                                //save easycard transactin record
                                let easycardTransaction = new EasycardTransaction();
                                easycardTransaction.saveRecord(batchNo, (new ICERAPIRequest()).MESSAGE_TYPE["request"], 'refund', rrn, currentTransaction.data.id, easycardTxnAmount, easycardAutoloadAmount, result);

                                this.sleep(500);
                                this._setWaitDescription(_('Transaction success, payment is refunded with easycard', [txnAmount, balance]));
                                this.sleep(1500);
                            }
                        }
                    }
                }
            } catch (e) {
                this.log('Error', e.message);
                evt.preventDefault();
            } finally {
                if (waitPanel) {
                    waitPanel.hidePopup();
                }
                $.unblockUI();
            }
        },

        easycardQuery: function() {
            $.blockUI({
                "message": '<h3>' + _('Screen Lock') + '</h3>'
            });
            let waitPanel = this._showWaitPanel(_('Transaction in progress'));

            try {
                let hostSerialNum = this._getHostSerialNum();
                let icerAPIRequest = new ICERAPIRequest(this._getBatchNo());
                let request = icerAPIRequest.queryRequest(hostSerialNum);
                let result = this._callICERAPI(request);
                if (!result) {
                    this._setWaitDescription(_('Transaction failed, please present card again'));
                    this.sleep(2000);
                } else if (result[ICERAPIResponse.KEY_RETURN_CODE] != ICERAPIResponse.CODE_SUCCESS) {
                    this._setWaitDescription(_('Transaction failed, please present card again') + "\n" + _('Error ' + result[ICERAPIResponse.KEY_RETURN_CODE]));
                    this.sleep(2000);
                } else {
                    let balance = ICERAPIResponse.calAmount(result[ICERAPIResponse.KEY_BALANCE]);
                    this._setWaitDescription(_('The balance of the easycard is %S', [balance]));
                    this.sleep(1500);
                }
            } catch (e) {
                this.log('ERROR', e);
            } finally {
                waitPanel.hidePopup();
                $.unblockUI();
            }
        },
        /**
         * ICERAPI settlement
         */
        easycardSettlement: function(evt) {
            alert(_('Please keep easycard device connected during shift change'));

            $.blockUI({
                "message": '<h3>' + _('Screen Lock') + '</h3>',
                css: { top: '37.5%' }
            });

            this._dialogPanel = this._showDialog(_('Easycard transaction log upload, check connection...'));
            try {
                let batchNo = this._getBatchNo();
                let hostSerialNum = this._getHostSerialNum();
                let icerAPIRequest = new ICERAPIRequest(batchNo);
                let transactionTotal = (new EasycardTransaction()).getTotalByMsgTypeAndBatchNo(batchNo, icerAPIRequest.MESSAGE_TYPE["request"]);
                let request = icerAPIRequest.settlementRequest(hostSerialNum, transactionTotal.count, transactionTotal.total);
                let result = this._callICERAPI(request);
                if (result[ICERAPIResponse.KEY_RETURN_CODE] == ICERAPIResponse.CODE_SUCCESS) {
                    //reset sequence every settlement
                    SequenceModel.resetLocalSequence(this._hostSequenceKey, 0);
                    //reset batch no when success settlement
                    this._resetBatchNo();
                    this._setCaption(_('Easycard transaction log upload success!'));
                    this.sleep(1000);
                    return;
                }
                this._setCaption(_('Easycard transaction log upload failed, please press the upload button at control panel'));
                this.sleep(2000);
            } catch (e) {
                this.log('ERROR', e);
            } finally {
                $.unblockUI();
                this._dialogPanel.close();
            }
        },
        /**
         * Easycard Sign On Function
         * must do before communicating with ICERAPI
         * @param {Boolean} retry
         * @return {Boolean}
         */
        easycardSignOn: function(retry) {
            let hostSerialNum = this._getHostSerialNum();
            let icerAPIRequest = new ICERAPIRequest();
            let request = icerAPIRequest.signonRequest(hostSerialNum);
            let result = this._callICERAPI(request);
            if (!result || result[ICERAPIResponse.KEY_RETURN_CODE] != ICERAPIResponse.CODE_SUCCESS) {
                if (retry) {
                    return this.easycardSignOn();
                }
                this._setCaption(_('Easycard sign on failed, please check the device is connected to the POS, and then restart'));
                this.sleep(1500);
                return false;
            }
            this._setCaption(_('Easycard sign on success'));
            this.sleep(1000);
            return true;
        },
        /**
         * print easycard receipt
         *
         * @param {Object} receipt data
         * @param {Integer} printer number
         */
        printReceipt: function(receiptData, printer, autoPrint, duplicate) {
            let deviceController = GeckoJS.Controller.getInstanceByName('Devices');
            let printerController = GeckoJS.Controller.getInstanceByName('Print');

            if (deviceController == null) {
                NotifyUtils.error(_('Error in device manager! Please check your device configuration'));
                return;
            }

            switch (deviceController.isDeviceEnabled('receipt', printer)) {
                case -2:
                    NotifyUtils.warn(_('The specified receipt printer [%S] is not configured', [printer]));
                    return;

                case -1:
                    NotifyUtils.warn(_('Invalid receipt printer [%S]', [printer]));
                    return;

                case 0:
                    NotifyUtils.warn(_('The specified receipt printer [%S] is not enabled', [printer]));
                    return;
            }

            let enabledDevices = deviceController.getEnabledDevices('receipt', printer);
            if (enabledDevices != null) {
                let template = 'easycard-receipt';
                let port = enabledDevices[0].port;
                let portspeed = enabledDevices[0].portspeed;
                let handshaking = enabledDevices[0].handshaking;
                let devicemodel = enabledDevices[0].devicemodel;
                let encoding = enabledDevices[0].encoding;
                let copies = 1;

                _templateModifiers(TrimPath, encoding);

                let order2 = printerController.deepClone(receiptData.data);
                let txn2 = new Transaction(true, true);
                if (txn2) {
                    txn2.data = order2;
                }else {
                    txn2 = receiptData;
                }

                let data = {
                    txn: txn2,
                    order: order2
                };
                data.linkgroups = null;
                data.printNoRouting = 1;
                data.routingGroups = null;
                data.autoPrint = autoPrint;
                data.duplicate = duplicate;

                // check if record already exists on this device if not printing a duplicate
                if (!data.duplicate) {
                    let receipt = printerController.isReceiptPrinted(data.order.id, data.order.batchCount, printer);
                    if (receipt) {
                        if (fallbackToDuplicate) {
                            data.duplicate = true;
                        }
                        else {
                            // if auto-print, then we don't issue warning
                            if (!autoPrint) NotifyUtils.warn(_('A receipt has already been issued for this order on printer [%S]', [ printer ]));
                            return;
                        }
                    }
                }
                printerController.printSlip('receipt', data, template, port, portspeed, handshaking, devicemodel, encoding, printer, copies);
                    }
        },
        /**
         * convert easycard datetime to receipt format
         * @param {String} transaction date
         * @param {String} transaction time
         * @return {String}
         */
        _formatDateTime: function(txndate, txntime) {
            return txndate.substring(0,4)+'/'+txndate.substring(4,6)+'/'+txndate.substring(6,8)+' '+txntime.substring(0,2)+':'+txntime.substring(2,4)+':'+txntime.substring(4,6);
        },
        /**
         * call bridge script to communicate with ICERAPI
         * @param {String} request
         * @return {Object | null}
         */
        _callICERAPI: function(request) {
            let result = null;
            this._writeInFile(request);
            try {
                this.log("DEBUG", "callICERAPI:::");
                GREUtils.File.run('/bin/bash', ['-c', '/usr/bin/timeout 30s ' + this._icerAPIPath + this._icerAPIScript], true);
                if (GREUtils.File.exists(this._outputFile)) {
                    let icerapiRESXML = GREUtils.Charset.convertToUnicode(GREUtils.File.readAllBytes(this._outputFile), 'UTF-8');
                    let x2js = new X2JS();
                    try {
                        icerapiRESJSON = x2js.xml_str2json(icerapiRESXML);
                        result = ICERAPIResponse.parseResponse(icerapiRESJSON);
                        //set host serial number if tag exists
                        if (typeof result[ICERAPIResponse.KEY_HOST_SERIAL_NUM] != 'undefined') {
                            this._setHostSerialNum(result[ICERAPIResponse.KEY_HOST_SERIAL_NUM]);
                        }
                    } catch(e) {
                        this.log('ERROR', e.message);
                    }
                }
            } catch (e) {
                GeckoJS.BaseObject.log('ERROR', _('Failed to call ICERAPI (%S), request data: [%S].', [e, request]));
            }
            return result;
        },
        /**
         * get host serial number
         * @return {String}
         */
        _getHostSerialNum: function() {
            let sequenceNo = SequenceModel.getLocalSequence(this._hostSequenceKey);
            return GeckoJS.String.padLeft(sequenceNo, 6, "0");
        },
        /**
         * set host serial number
         * @return {String}
         */
        _setHostSerialNum: function(currentHostSerialNum) {
            SequenceModel.resetLocalSequence(this._hostSequenceKey, currentHostSerialNum);
        },
        /**
         * write request to temp file.
         * @return {String}
         */
        _writeInFile: function(request) {
            let writeInFile = new GeckoJS.File(this._inFile, true);
            writeInFile.open("vivi");
            writeInFile.write(request);
            writeInFile.close();
        },
        /**
         * open dialog box
         * @param {String} caption
         * @return {Object}
         */
        _showDialog: function(caption) {

            let width = 600;
            let height = 140;

            let aURL = 'chrome://easycard_payment/content/dialogs/alert_dialog.xul';
            let aName = '';
            let aArguments = {
                caption: caption
            };

            let aFeatures = 'chrome,dialog,centerscreen,dependent=yes,resize=no,width=' +
                width + ',height=' + height;

            let win = Components.classes['@mozilla.org/appshell/window-mediator;1']
                .getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow('Vivipos:Main');
            if (win.document.documentElement.id == 'viviposMainWindow' &&
                win.document.documentElement.boxObject.screenX < 0) {
                win = null;
            }

            let alertWin = GREUtils.Dialog.openWindow(win, aURL, aName,
                aFeatures, aArguments);

            this.sleep(500);

            return alertWin;

        },
        /**
         * set dialog caption
         * @param {String} caption
         */
        _setCaption: function(caption)
        {
            if (this._dialogPanel) {
                this._dialogPanel.document.getElementById('dialog-caption').textContent = caption;
            }
        },
        /**
         * show wait panel
         *
         * @param {String} description
         */
        _showWaitPanel: function(description) {

            let waitPanel = document.getElementById('linebreak_waiting_panel');
            let waitDesc = document.getElementById('linebreak_waiting_description');

            if (waitDesc) waitDesc.textContent = description;

            if (waitPanel) waitPanel.openPopupAtScreen(0, 0);

            this.sleep(500);
            return waitPanel;

        },
        /**
         * set wait description.
         *
         * @param {String}
         */
        _setWaitDescription: function(description) {
            document.getElementById('linebreak_waiting_description').textContent = description;
        },

        _getBatchNo: function() {
            let batchNo = null;
            let prefBatchNo = GeckoJS.Configure.read(this._prefsPrefix+'.batchNo');
            if (!prefBatchNo) {
                batchNo = this._writeBatchNo();
            } else {
                batchNo = prefBatchNo;
            }
            return batchNo;
        },

        _writeBatchNo: function(sequence) {
            if (!sequence) sequence = 0;
            let batchNo = (new Date()).toString('yyMMdd') + GeckoJS.String.padLeft(sequence, 2, "0");
            GeckoJS.Configure.write(this._prefsPrefix+'.batchNo', batchNo);
            return batchNo;
        },

        _resetBatchNo: function() {
            let prefBatchNo = GeckoJS.Configure.read(this._prefsPrefix+'.batchNo');
            let batchDate = prefBatchNo.substring(0,6);
            let batchSeq = prefBatchNo.substring(6);
            let currentDate = (new Date()).toString('yyMMdd');
            if (batchDate != currentDate) {
                return this._writeBatchNo();
            } else {
                let newBatchSeq = batchSeq + 1;
                return this._writeBatchNo(newBatchSeq);
            }
        }
    };

    GeckoJS.Controller.extend(__controller__);

    if (mainWindow === window) {

        let main = GeckoJS.Controller.getInstanceByName('Main');
        if (main) {
            main.addEventListener('afterInitial', function() {
                main.requestCommand('initial', null, 'EasycardPayment');
            });
        }

    }

})();