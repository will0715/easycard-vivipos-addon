(function() {

    if (typeof AppController === 'undefined') {
        include('chrome://viviecr/content/controllers/app_controller.js');
    }
    if (typeof EDCRequest === 'undefined') {
        include('chrome://easycard_payment/content/easycard/EDCRequest.jsc');
    }
    if (typeof EDCResponse === 'undefined') {
        include('chrome://easycard_payment/content/easycard/EDCResponse.jsc');
    }

    var mainWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("Vivipos:Main");

    const __controller__ = {

        name: 'EasycardPayment',
        components: ['Acl'],
        _sequenceKey: 'easycardSeq',
        _cartController: null,
        _scriptPath: "/data/profile/extensions/easycard_payment@vivicloud.net/chrome/content/easycard/",
        _scriptFile: "easycardEDC.sh",
        _inFile: "in.data",
        _outputFile: "out.data",
        _tmId: null,
        _isSandbox: false,
        _signOnExpiredTime: 40 * 60 * 1000,

        initial: function() {
            if (!this._cartController) {
                this._cartController = GeckoJS.Controller.getInstanceByName('Cart');
                this._cartController.addEventListener('beforeVoidSale', this.easycardCancel, this);
            }

            if (GeckoJS.Controller.getInstanceByName('Keypad')) {
                GeckoJS.Controller.getInstanceByName('Keypad').addEventListener('onEnterPress', this.easycardPayout, this);
            }

            if (GeckoJS.Controller.getInstanceByName('ShiftChanges')) {
                GeckoJS.Controller.getInstanceByName('ShiftChanges').addEventListener('onStartShift', this.easycardSettlement, this);
            }

            //startup sign on to get machine ready.
            let dialogPanel = this._showDialog(_('signon_process'));
            try {
                let sequence = this._getSequence();
                this._easycardSignOn(sequence);
            } catch (e) {
                this.log('DEBUG', e.message);
            } finally {
                dialogPanel.close();
            }
        },

        easycardPayout: function(evt) {
            let cart = mainWindow.GeckoJS.Controller.getInstanceByName('Cart');
            let currentTransaction = cart._getTransaction();
            let remainTotal = currentTransaction != null ? currentTransaction.getRemainTotal() : 0;
            let transactionSeq = currentTransaction != null ? currentTransaction.data.seq : null;
            let sequence = this._getSequence();
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
                if (this._easycardSignOn(sequence)) {
                    let request = this.newEDCRequest().payoutRequest(remainTotal, sequence, transactionSeq);
                    let result = this._callEasycardEDC(request);
                    if (!result) {
                        this._setWaitCaption(_('transaction_fail'));
                        this.sleep(4000);
                    } else if (result[EDCResponse.KEY_RESPONSE_CODE] != EDCResponse.CODE_SUCCESS) {
                        this._setWaitCaption(_('transaction_fail') + ' : ' + result[EDCResponse.KEY_ERROR_MSG]);
                        this.sleep(4000);
                    } else {
                        this._setWaitCaption(_('transaction_success') + result[EDCResponse.KEY_TXN_AMOUNT]);
                        cart._addPayment('easycard', result[EDCResponse.KEY_TXN_AMOUNT], null, 'easycard', result[EDCResponse.KEY_REFERENCE_NUM], false, false);
                        this.sleep(3000);
                    }
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
            let sequence = this._getSequence();
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

                        if (this._easycardSignOn(sequence)) {
                            let request = this.newEDCRequest().cancelRequest(orderPayments[i].amount, sequence, transactionSeq);
                            let result = this._callEasycardEDC(request);
                            if (!result || (typeof result[EDCResponse.KEY_TXN_AMOUNT] === 'undefined' || orderPayments[i].amount != result[EDCResponse.KEY_TXN_AMOUNT])) {
                                this._setWaitCaption(_('cancel_fail'));
                                this.sleep(4000);
                                evt.preventDefault();
                            } else if (result[EDCResponse.KEY_RESPONSE_CODE] != EDCResponse.CODE_SUCCESS) {
                                this._setWaitCaption(_('cancel_fail') + ' : ' + result[EDCResponse.KEY_ERROR_MSG]);
                                this.sleep(4000);
                                evt.preventDefault();
                            } else {
                                this._setWaitCaption(_('cancel_success') + result[EDCResponse.KEY_TXN_AMOUNT]);
                                this.sleep(3000);
                            }
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
            let sequence = this._getSequence();
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
                if (this._easycardSignOn(sequence)) {
                    let request = this.newEDCRequest().queryRequest(total, sequence, transactionSeq);
                    let result = this._callEasycardEDC(request);
                    if (!result) {
                        this._setWaitCaption(_('transaction_fail'));
                        this.sleep(4000);
                    } else if (result[EDCResponse.KEY_RESPONSE_CODE] != EDCResponse.CODE_SUCCESS) {
                        this._setWaitCaption(_('transaction_fail') + ' : ' + result[EDCResponse.KEY_ERROR_MSG]);
                        this.sleep(4000);
                    } else {
                        this._setWaitCaption(_('transaction_success') + result[EDCResponse.KEY_TXN_AMOUNT]);
                        this.sleep(3000);
                    }
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
            let request = this.newEDCRequest().balanceRequest();
            let result = this._callEasycardEDC(request);
            let balance = result[EDCResponse.KEY_BALANCE];
            if (balance != null) return parseInt(balance);
            return -1;
        },
        /**
         * easycardEDC settlement
         */
        easycardSettlement: function(evt) {
            if (GREUtils.Dialog.confirm(this.topmostWindow, _('settlement_confirm'),
                    _('settlement_confirm_str')
                )) {

                try {
                    let sequence = this._getSequence();
                    if (this._easycardSignOn(sequence)) {
                        let request = this.newEDCRequest().settlementRequest(sequence);
                        let result = this._callEasycardEDC(request);
                        if (result[EDCResponse.KEY_RESPONSE_CODE] == EDCResponse.CODE_SUCCESS) {
                            alert(_('settlement_success'));
                            return;
                        }
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
         * must do while communicating with easycardEDC
         * @param {Number} sequence
         * @return {Object | null}
         */
        _easycardSignOn: function(sequence) {
            if (GeckoJS.Session.get('easycardEDCSignOn') != null && (new Date().getTime() - GeckoJS.Session.get('easycardEDCSignOn') <= this._signOnExpiredTime)) {
                return GeckoJS.Session.get('easycardEDCSignOn');
            }
            if (!this._signOnPwd) {
                let comport = GeckoJS.Configure.read('vivipos.fec.settings.easycard_payment.comport');
                let signOnPwd = GeckoJS.Configure.read('vivipos.fec.settings.easycard_payment.signOnPwd');
                if (!comport || !signOnPwd || comport == "" || signOnPwd == "") {
                    NotifyUtils.info(_('setting_missing'));
                    return false;
                }
                this._signOnPwd = signOnPwd;
            }
            const edcRequest = new EDCRequest(this._tmId, 'System');
            let request = this.newEDCRequest('System').signonRequest(sequence, this._signOnPwd);
            let result = this._callEasycardEDC(request);
            if (!result || result[EDCResponse.KEY_RESPONSE_CODE] != EDCResponse.CODE_SUCCESS) {
                NotifyUtils.info(_('signon_fail'));
                return false;
            }
            GeckoJS.Session.set('easycardEDCSignOn', new Date().getTime());
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
                var response = EDCResponse.parseResponse(responseJSON);
                return response;
            } catch (e) {
                GeckoJS.BaseObject.log('ERROR', _('Failed to call easycardEDC (%S), request data: [%S].', [e, request]));
            }
            return null;
        },
        /**
         * get new EDCRequest instance
         * @param {String} agentNum
         * @return {EDCRequest}
         */
        newEDCRequest: function(agentNum) {
            let tmId = GeckoJS.Session.get('terminal_no');
            let tmAgentNum = agentNum;
            let clerk = this.Acl.getUserPrincipal();
            if (clerk && typeof agentNum === 'undefined') {
                tmAgentNum = clerk.username;
            }
            if (this._isSandbox) {
                this.log('DEBUG', tmAgentNum);
                return new EDCRequest("00", "1234");
            }
            return new EDCRequest(tmId, tmAgentNum);
        },
        /**
         * get new sequence
         * @return {String}
         */
        _getSequence: function() {
            let sequenceNo = SequenceModel.getLocalSequence(this._sequenceKey);
            return GeckoJS.String.padLeft(sequenceNo, 6, "0");
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
                main.requestCommand('initial', null, 'EasycardPayment'); // viviconnect etl
            });
        }

    }

})();