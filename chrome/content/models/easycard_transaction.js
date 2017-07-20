(function() {

    if(typeof AppModel == 'undefined') {
        include( 'chrome://viviecr/content/models/app.js' );
    }

    var __model__ = {

        name: 'EasycardTransaction',

        useDbConfig: 'easycard_data',
        /**
         * save easycard transaction record
         *
         * @param {String} easycard batch no
         * @param {String} easycard message type
         * @param {String} transaction type
         * @param {String} easycard reference number
         * @param {String} order's id
         * @param {Number} easycard transaction amount
         * @param {Number} easycard transaction autoload amount
         * @param {Object|String} transaction details
         * @return {String|null} id
         */
        saveRecord: function(batchNo, messageType, transactionType, referenceNum, orderId, easycardTxnAmount, easycardAutoloadAmount, details) {

            if (!batchNo || !messageType || !transactionType || !referenceNum) return null;

            let data = {
                terminal_no: GeckoJS.Session.get('terminal_no'),
                sale_period: GeckoJS.Session.get('sale_period'),
                shift_number: GeckoJS.Session.get('shift_number'),
                batch_no: batchNo,
                message_type: messageType,
                transaction_type: transactionType,
                reference_num: referenceNum,
                order_id: orderId,
                amount: easycardTxnAmount,
                autoload_amount: easycardAutoloadAmount,
                details: (typeof details === 'object') ? JSON.stringify(details) : details,
            };

            var r = this.save(data);
            if (!r) {
                this.log('ERROR',
                         'An error was encountered while saving easycard transaction record (error code ' + this.lastError + '): ' + this.lastErrorString);

                r = this.saveToBackup(data);
                if (r) {
                    this.log('DEBUG', 'record saved to backup');
                }
                else {
                    this.log('ERROR',
                             'record could not be saved to backup\n' + this.dump(data));
                }
            }
            return r;

        },

        getLastOrder: function(terminalNo) {
            let record = this.find('first', {
                conditions: 'terminal_no = "' + terminalNo + '"',
                order: 'created DESC'
            }) || null;
            return record;
        },

        getByOrderIdAndTxnType: function(orderId, txnType) {
            let terminalNo = GeckoJS.Session.get('terminal_no');
            let record = this.find('first', {
                conditions: "easycard_transactions.terminal_no='"+terminalNo+"' AND easycard_transactions.order_id='"+orderId+"' AND easycard_transactions.transaction_type='"+txnType+"'",
                recursive: 0
            }) || null;
            return record;
        },

        getTotalByMsgTypeAndBatchNo: function(batchNo, messageType) {
            let result = {
                count: 0,
                total: 0
            };
            
            let terminalNo = GeckoJS.Session.get('terminal_no');
            let records = this.find('all', {
                    conditions: "easycard_transactions.terminal_no='"+terminalNo+"' AND easycard_transactions.batch_no='"+batchNo+"' AND easycard_transactions.message_type = '"+messageType+"'",
                    recursive: 0
            }) || null;

            if (records) {
                let txnTotal = 0;
                for(let key in records) {
                    let record = records[key];
                    result.count += 1;
                    txnTotal += record.amount;
                    txnTotal += record.autoload_amount;
                    if (record.autoload_amount > 0) {
                        result.count += 1;
                    }
                }
                result.total = txnTotal;
            }
            return result;
        },

        //inspiring from viviecr@firich.com.tw/content/models/ledger_record.js
        clearExpireData: function(expireDate) {

            // try to attach history database
            var result = false;
            var isMoveToHistory = GeckoJS.Configure.read('vivipos.fec.settings.moveExpiredDataToHistory') || false;
            var attachedOrderHistory = isMoveToHistory ? this.attachOrderHistory() : false;

            if (!this.begin()) {
                this.log('ERROR', 'An error was encountered while preparing to remove expired easycard activity logs (error code ' + this.lastError + '): ' + this.lastErrorString);
                if (attachedOrderHistory) {
                    this.detachOrderHistory();
                }               
                return false;
            }

            try {
                   
                if (attachedOrderHistory) {
                    this.execute('CREATE TABLE IF NOT EXISTS order_history.easycard_transactions AS SELECT * FROM easycard_transactions');
                    this.execute('INSERT OR REPLACE INTO order_history.easycard_transactions SELECT * FROM easycard_transactions where created <= ' + expireDate);
                }

                r = this.execute('delete from easycard_transactions where created <= ' + expireDate);
                if (!r) {
                    throw {errno: model.lastError,
                           errstr: model.lastErrorString,
                           errmsg: _('An error was encountered while expiring easycard activity logs (error code %S) .', [this.lastError])};
                }
                
                if (!this.commit()) {
                    throw {
                        errno: this.lastError,
                        errstr: this.lastErrorString,
                        errmsg: _('An error was encountered while expiring easycard activity logs (error code %S) .', [this.lastError])
                    };                           
                }                   
                result = true; 
                           
            }catch(e) {
                
                this.rollback();
                this.log('ERROR', e.errmsg);

                this.lastError = e.errno;
                this.lastErrorString = e.errstr;
               
                result = false;
                
            }finally {
                if (attachedOrderHistory) {
                    this.detachOrderHistory();
                }
            }
            
            return result;
            
        },

        truncateData: function() {
            return this.execute('delete from easycard_transactions');
        }

    };

    var EasycardTransaction = window.EasycardTransaction =  AppModel.extend(__model__);
})();
