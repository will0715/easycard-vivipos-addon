var ICERAPIRequest = function(batchNo) {
    this.TXN_AMT_UNIT = 100; //amount accurate to the second decimal place without decimal mark, ex. 10.01 -> 1001(10.01*100)
    this.batchNo = batchNo;
};

ICERAPIRequest.prototype = {

    PROCESS_CODE: {
        "signon": "881999",
        "deduct": "606100",
        "refund": "620061",
        "query": "296000",
        "settlement": "900099",
        "cancel": "816100"
    },

    MESSAGE_TYPE: {
        "request": "0200",
        "settlement": "0500",
        "signon": "0800"
    },
    /**
     * get the deduct's request xml string
     * @param {Integer} amount
     * @param {String} HOST serialNum
     * @param {String} transactionSeq
     * @param {String} icerTXNSequence
     * @return {String} xml
     */
    deductRequest: function(amount, hostSerialNum, transactionSeq, icerTXNSequence) {
        let requestBody = "<T0400>" + this.calAmount(amount) + "</T0400>";
        requestBody += "<T1100>" + icerTXNSequence + "</T1100>";
        requestBody += "<T1101>" + hostSerialNum + "</T1101>";
        requestBody += "<T3701>" + transactionSeq + "</T3701>";
        return this._buildRequestXml(this.MESSAGE_TYPE.request, this.PROCESS_CODE.deduct, requestBody);
    },
    /**
     * get the refund's request xml string
     * @param {Integer} amount
     * @param {String} HOST serialNum
     * @param {String} transactionSeq
     * @param {String} icerTXNSequence
     * @return {String} xml
     */
    refundRequest: function(amount, hostSerialNum, transactionSeq, icerTXNSequence) {
        let requestBody = "<T0400>" + this.calAmount(amount) + "</T0400>";
        requestBody += "<T1100>" + icerTXNSequence + "</T1100>";
        requestBody += "<T1101>" + hostSerialNum + "</T1101>";
        requestBody += "<T3701>" + transactionSeq + "</T3701>";
        return this._buildRequestXml(this.MESSAGE_TYPE.request, this.PROCESS_CODE.refund, requestBody);
    },
    /**
     * get the cancel's request xml string
     * @param {Integer} cancel amount
     * @param {String} HOST serialNum
     * @param {String} transactionSeq
     * @param {String} icerTXNSequence
     * @param {String} original device id
     * @param {String} original reference number
     * @param {String} original transaction date
     * @return {String} xml
     */
    cancelRequest: function(cancelAmount, hostSerialNum, transactionSeq, icerTXNSequence, oriDeviceId, oriRRN, oriTxnDate) {
        let requestBody = "<T0400>" + this.calAmount(cancelAmount) + "</T0400>";
        requestBody += "<T1100>" + icerTXNSequence + "</T1100>";
        requestBody += "<T1101>" + hostSerialNum + "</T1101>";
        requestBody += "<T5581>" + oriDeviceId + "</T5581>";
        requestBody += "<T5582>" + oriRRN + "</T5582>";
        requestBody += "<T5583>" + oriTxnDate + "</T5583>";
        requestBody += "<T3701>" + transactionSeq + "</T3701>";
        return this._buildRequestXml(this.MESSAGE_TYPE.request, this.PROCESS_CODE.cancel, requestBody);
    },
    /**
     * get the query's request xml string
     * @param {String} HOST serialNum
     * @param {String} icerTXNSequence
     * @return {String} xml
     */
    queryRequest: function(hostSerialNum, icerTXNSequence) {
        let requestBody = "<T0400>000</T0400>";
        requestBody += "<T1100>" + icerTXNSequence + "</T1100>";
        requestBody += "<T1101>" + hostSerialNum + "</T1101>";
        return this._buildRequestXml(this.MESSAGE_TYPE.request, this.PROCESS_CODE.query, requestBody);
    },
    /**
     * get the settlement's request xml string
     * @param {String} HOST serialNum
     * @param {Number} transaction count
     * @param {Number} transaction total
     * @param {String} icerTXNSequence
     * @return {String} xml
     */
    settlementRequest: function(hostSerialNum, transactionCount, transactionTotal, icerTXNSequence) {
        let requestBody = "<T1100>" + icerTXNSequence +"</T1100>";
        requestBody += "<T1101>" + hostSerialNum + "</T1101>";
        requestBody += "<T5591>" + transactionCount + "</T5591>";
        requestBody += "<T5592>"
        requestBody += "<T559201>" + transactionTotal + "</T559201>";
        requestBody += "</T5592>";
        return this._buildRequestXml(this.MESSAGE_TYPE.settlement, this.PROCESS_CODE.settlement, requestBody);
    },
    /**
     * get the signon's request xml string
     * @param {String} HOST serialNum
     * @param {String} icerTXNSequence
     * @return {String} xml
     */
    signonRequest: function(hostSerialNum, icerTXNSequence) {
        let requestBody = "<T1100>" + icerTXNSequence +"</T1100>";
        requestBody += "<T1101>" + hostSerialNum + "</T1101>";
        return this._buildRequestXml(this.MESSAGE_TYPE.signon, this.PROCESS_CODE.signon, requestBody);
    },
    /**
     * calculate amount to icerapi amount
     * @param {Number} transaction amount
     * @return {Number} calculated amount
     */
    calAmount: function(amount) {
        let tmpAmount = amount*this.TXN_AMT_UNIT;
        let txnAmount = parseInt(Math.round(tmpAmount));
        return txnAmount;
    },
    /**
     * build the request xml string
     * @param {String} messageType
     * @param {String} processCode
     * @param {String} requestBody
     * @return {String} xml
     */
    _buildRequestXml: function(messageType, processCode, requestBody) {
        let request = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><TransXML><TRANS>';
        request += "<T0100>" + messageType + "</T0100>";
        request += "<T0300>" + processCode + "</T0300>";
        if (typeof requestBody != "undefined") {
            if (this.batchNo) {
                requestBody += "<T5501>" + this.batchNo + "</T5501>";
            }
            request += "<T1200>" + (new Date()).toString('HHmmss') + "</T1200>";
            request += "<T1300>" + (new Date()).toString('yyyyMMdd') + "</T1300>";
            request += requestBody;
        }
        request += "</TRANS></TransXML>";
        return request;
    }

};