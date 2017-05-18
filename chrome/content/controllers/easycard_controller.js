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

    var mainWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("Vivipos:Main");

    const __controller__ = {

        name: 'EasycardPayment',
        components: ['Acl'],
        _sequenceKey: 'easycardSeq',
        _hostSequenceKey: 'easycardHostSeq',
        _cartController: null,
        _scriptPath: "/data/profile/extensions/easycard_payment@vivicloud.net/chrome/content/easycard/",
        _scriptFile: "callicerapi.sh",
        _inFile: "in.data",
        _outputFile: "out.data",
        _tmId: null,
        _isSandbox: false,
        _signOnExpiredTime: 40 * 60 * 1000,
        _dialogPanel: null,

        initial: function() {
            if (!this._cartController) {
                this._cartController = GeckoJS.Controller.getInstanceByName('Cart');
                this._cartController.addEventListener('beforeVoidSale', this.easycardCancel, this);
            }

            if (GeckoJS.Controller.getInstanceByName('Keypad')) {
                GeckoJS.Controller.getInstanceByName('Keypad').addEventListener('onEnterPress', this.easycardPayout, this);
            }

            if (GeckoJS.Controller.getInstanceByName('ShiftChanges')) {
                GeckoJS.Controller.getInstanceByName('ShiftChanges').addEventListener('shiftChanged', this.easycardSettlement, this);
            }

            this.copyScripts();

            //startup sign on to get machine ready.
            this._dialogPanel = this._showDialog(_('signon_process'));
            try {
                this.easycardSignOn();
            } catch (e) {
                this.log('DEBUG', e.message);
            } finally {
                this._dialogPanel.close();
            }
        },
        /**
         * copy icerapi scripts to home directory
         * Note: icerapi cannot excute in long directory prefix
         */
        copyScripts: function() {
            let icerapiProgram = '/home/icerapi/icerapi';
            if (!GREUtils.File.exists(icerapiProgram)) {
                try {
                    GREUtils.File.run('/bin/sh', ['-c', this._scriptPath + 'copyicerapi.sh' ], true);
                } catch (e) {
                    this.log('ERROR', e);
                }
            }

            if (!GREUtils.File.exists(icerapiProgram)) {
                alert(_('Install EasyCard library failed, please contact technical support.'));
            }
        },

        easycardPayout: function(evt) {
            let cart = mainWindow.GeckoJS.Controller.getInstanceByName('Cart');
            let currentTransaction = cart._getTransaction();
            let remainTotal = currentTransaction != null ? currentTransaction.getRemainTotal() : 0;
            let transactionSeq = currentTransaction != null ? currentTransaction.data.seq : null;
            let serialNum = this._getSerialNum();
            let hostSerialNum = this._getHostSerialNum();
            if (remainTotal <= 0) {
                NotifyUtils.info(_('confirm_amount'));
                evt.preventDefault();
                return;
            }
            if (!transactionSeq) {
                NotifyUtils.info(_('data_error'));
                evt.preventDefault();
                return;
            }

            $.blockUI({
                "message": '<h3>' + _('screen_lock') + '</h3>'
            });
            let waitPanel = this._showWaitPanel(_('show_progress'));

            try {
                let request = this.newICERAPIRequest().payoutRequest(remainTotal, serialNum, hostSerialNum, transactionSeq);
                let result = this._callICERAPI(request);
                if (!result) {
                    this._setWaitCaption(_('transaction_fail'));
                    this.sleep(4000);
                } else if (result[ICERAPIResponse.KEY_RESPONSE_CODE] != ICERAPIResponse.CODE_SUCCESS) {
                    this._setWaitCaption(_('transaction_fail') + ' : ' + result[ICERAPIResponse.KEY_ERROR_MSG]);
                    this.sleep(4000);
                } else {
                    this._setWaitCaption(_('transaction_success') + result[ICERAPIResponse.KEY_TXN_AMOUNT]);
                    cart._addPayment('easycard', result[ICERAPIResponse.KEY_TXN_AMOUNT], null, 'easycard', result[ICERAPIResponse.KEY_REFERENCE_NUM], false, false);
                    this.sleep(3000);
                }
            } catch (e) {} finally {
                waitPanel.hidePopup();
                $.unblockUI();
            }
        },

        easycardCancel: function(evt) {
            let cart = mainWindow.GeckoJS.Controller.getInstanceByName('Cart');
            let currentTransaction = cart._getTransaction();
            let transactionSeq = currentTransaction != null ? currentTransaction.data.seq : null;
            let serialNum = this._getSerialNum();
            let hostSerialNum = this._getHostSerialNum();
            if (!transactionSeq) {
                NotifyUtils.info(_('data_error'));
                evt.preventDefault();
                return cancelResult;
            }
            let waitPanel = null;
            try {
                let datasource = GeckoJS.ConnectionManager.getDataSource('order');
                let orderPayments = datasource.fetchAll('SELECT name,memo1,memo2,amount FROM order_payments where order_id="' + currentTransaction.data.id + '"');

                for (i = 0; i < orderPayments.length; i++) {
                    if (orderPayments[i].name == "easycard") {

                        $.blockUI({
                            "message": '<h3>' + _('screen_lock') + '</h3>'
                        });
                        waitPanel = this._showWaitPanel(_('show_progress'));

                        let request = this.newICERAPIRequest().cancelRequest(orderPayments[i].amount, serialNum, hostSerialNum, transactionSeq);
                        let result = this._callICERAPI(request);
                        if (!result || (typeof result[ICERAPIResponse.KEY_TXN_AMOUNT] === 'undefined' || orderPayments[i].amount != result[ICERAPIResponse.KEY_TXN_AMOUNT])) {
                            this._setWaitCaption(_('cancel_fail'));
                            this.sleep(4000);
                            evt.preventDefault();
                        } else if (result[ICERAPIResponse.KEY_RESPONSE_CODE] != ICERAPIResponse.CODE_SUCCESS) {
                            this._setWaitCaption(_('cancel_fail') + ' : ' + result[ICERAPIResponse.KEY_ERROR_MSG]);
                            this.sleep(4000);
                            evt.preventDefault();
                        } else {
                            this._setWaitCaption(_('cancel_success') + result[ICERAPIResponse.KEY_TXN_AMOUNT]);
                            this.sleep(3000);
                        }
                    }
                }
            } catch (e) {
                evt.preventDefault();
            } finally {
                if (waitPanel) {
                    waitPanel.hidePopup();
                }
                $.unblockUI();
            }
        },

        easycardQuery: function() {
            let cart = mainWindow.GeckoJS.Controller.getInstanceByName('Cart');
            let currentTransaction = cart._getTransaction();
            let total = currentTransaction != null ? currentTransaction.getTotal() : 0;
            let transactionSeq = currentTransaction != null ? currentTransaction.data.seq : null;
            let serialNum = this._getSerialNum();
            let hostSerialNum = this._getHostSerialNum();
            if (!transactionSeq) {
                NotifyUtils.info(_('data_error'));
                evt.preventDefault();
                return;
            }

            $.blockUI({
                "message": '<h3>' + _('screen_lock') + '</h3>'
            });
            let waitPanel = this._showWaitPanel(_('show_progress'));

            try {
                let request = this.newICERAPIRequest().queryRequest(total, serialNum, hostSerialNum, transactionSeq);
                let result = this._callICERAPI(request);
                if (!result) {
                    this._setWaitCaption(_('transaction_fail'));
                    this.sleep(4000);
                } else if (result[ICERAPIResponse.KEY_RESPONSE_CODE] != ICERAPIResponse.CODE_SUCCESS) {
                    this._setWaitCaption(_('transaction_fail') + ' : ' + result[ICERAPIResponse.KEY_ERROR_MSG]);
                    this.sleep(4000);
                } else {
                    this._setWaitCaption(_('transaction_success') + result[ICERAPIResponse.KEY_TXN_AMOUNT]);
                    this.sleep(3000);
                }
            } catch (e) {} finally {
                waitPanel.hidePopup();
                $.unblockUI();
            }
        },
        /**
         * get the current card balance
         * @return {Number} balance
         */
        easycardBalance: function() {
            let serialNum = this._getSerialNum();
            let hostSerialNum = this._getHostSerialNum();
            let request = this.newICERAPIRequest().balanceRequest(serialNum, hostSerialNum);
            let result = this._callICERAPI(request);
            let balance = result[ICERAPIResponse.KEY_BALANCE];
            if (balance != null) return parseInt(balance);
            return -1;
        },
        /**
         * ICERAPI settlement
         */
        easycardSettlement: function(evt) {

            if (GREUtils.Dialog.confirm(this.topmostWindow, _('settlement_confirm'),
                    _('settlement_confirm_str')
                )) {

                try {
                    let serialNum = this._getSerialNum();
                    let hostSerialNum = this._getHostSerialNum();
                    let request = this.newICERAPIRequest().settlementRequest(serialNum, hostSerialNum);
                    let result = this._callICERAPI(request);
                    if (result[ICERAPIResponse.KEY_RESPONSE_CODE] == ICERAPIResponse.CODE_SUCCESS) {
                        //reset sequence every settlement
                        SequenceModel.resetLocalSequence(this._sequenceKey, 0);
                        SequenceModel.resetLocalSequence(this._hostSequenceKey, 0);
                        alert(_('settlement_success'));
                        return;
                    }
                    alert(_('settlement_fail'));
                    evt.preventDefault();
                } catch (e) {
                    this.log('ERROR', this.dump(e));
                }
            }
            evt.preventDefault();
        },
        /**
         * Easycard Sign On Function
         * must do before communicating with ICERAPI
         * @return {Boolean}
         */
        easycardSignOn: function() {
            const ICERAPIRequest = new ICERAPIRequest();
            let serialNum = this._getSerialNum();
            let hostSerialNum = this._getHostSerialNum();
            let request = this.newICERAPIRequest('System').signonRequest(serialNum, hostSerialNum);
            let result = this._callICERAPI(request);
            if (!result || result[ICERAPIResponse.KEY_RESPONSE_CODE] != ICERAPIResponse.CODE_SUCCESS) {
                NotifyUtils.info(_('signon_fail'));
                return false;
            }
            this.sleep(1000);
            return true;
        },
        /**
         * call bridge script to communicate with easycardEDC
         * @param {String} request
         * @return {Object | null}
         */
        _callEasycardEDC: function(request) {
            this._writeInFile(request);
            try {
                this.log("DEBUG", "callEasycardEDC:::");
                GREUtils.File.run('/bin/bash', ['-c', '/usr/bin/timeout 30s ' + this._scriptPath + this._scriptFile], true);
                var responseJSON = JSON.parse(GREUtils.File.readAllLine(this._scriptPath + this._outputFile));
                var response = ICERAPIResponse.parseResponse(responseJSON);
                return response;
            } catch (e) {
                GeckoJS.BaseObject.log('ERROR', _('Failed to call easycardEDC (%S), request data: [%S].', [e, request]));
            }
            return null;
        },
        /**
         * get new serial number
         * @return {String}
         */
        _getSerialNum: function() {
            let sequenceNo = SequenceModel.getLocalSequence(this._sequenceKey);
            return GeckoJS.String.padLeft(sequenceNo, 6, "0");
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
            let writeInFile = new GeckoJS.File(this._scriptPath + this._inFile, true);
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

            this.sleep(1000);

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
         * @param {Object} caption
         */
        _showWaitPanel: function(title) {

            let waitPanel = document.getElementById('wait_panel');
            let waitCaption = document.getElementById('wait_caption');
            let progressbar = document.getElementById('progress');

            if (waitCaption) waitCaption.setAttribute("label", title);

            progressbar.setAttribute('hidden', true);
            waitPanel.openPopupAtScreen(0, 0);

            this.sleep(1000);
            return waitPanel;

        },
        /**
         * set wait caption
         * @param {String} caption
         */
        _setWaitCaption: function(title) {
            document.getElementById('wait_caption').setAttribute('label', title);
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