var ICERAPIRequest = function(batchNo) {
    this.signonSequence = '999999';
    this.settlementSequence = '999998';
    this.querySequence = '999997';
    this.TXN_AMT_UNIT = 100; //amount accurate to the second decimal place without decimal mark, ex. 10.01 -> 1001(10.01*100)
    this.batchNo = batchNo;
};

ICERAPIRequest.prototype = {

    PROCESS_CODE: {
        "signon": "881999",
        "deduct": "606100",
        "refund": "620061",
        "query": "296000",
        "settlement": "900099"
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
     * @return {String} xml
     */
    deductRequest: function(amount, hostSerialNum, transactionSeq) {
        let requestBody = "<T0400>" + this.calAmount(amount) + "</T0400>";
        requestBody += "<T1100>" + this.getTxnSequence(transactionSeq) + "</T1100>";
        requestBody += "<T1101>" + hostSerialNum + "</T1101>";
        requestBody += "<T3701>" + transactionSeq + "</T3701>";
        return this._buildRequestXml(this.MESSAGE_TYPE.request, this.PROCESS_CODE.deduct, requestBody);
    },
    /**
     * get the refund's request xml string
     * @param {Integer} amount
     * @param {String} HOST serialNum
     * @param {String} transactionSeq
     * @return {String} xml
     */
    refundRequest: function(amount, hostSerialNum, transactionSeq) {
        let requestBody = "<T0400>" + this.calAmount(amount) + "</T0400>";
        requestBody += "<T1100>" + this.getTxnSequence(transactionSeq) + "</T1100>";
        requestBody += "<T1101>" + hostSerialNum + "</T1101>";
        requestBody += "<T3701>" + transactionSeq + "</T3701>";
        return this._buildRequestXml(this.MESSAGE_TYPE.request, this.PROCESS_CODE.refund, requestBody);
    },
    /**
     * get the query's request xml string
     * @param {String} HOST serialNum
     * @return {String} xml
     */
    queryRequest: function(hostSerialNum) {
        let requestBody = "<T0400>000</T0400>";
        requestBody += "<T1100>" + this.querySequence + "</T1100>";
        requestBody += "<T1101>" + hostSerialNum + "</T1101>";
        return this._buildRequestXml(this.MESSAGE_TYPE.request, this.PROCESS_CODE.query, requestBody);
    },
    /**
     * get the settlement's request xml string
     * @param {String} HOST serialNum
     * @return {String} xml
     */
    settlementRequest: function(hostSerialNum) {
        let requestBody = "<T1100>" + this.settlementSequence +"</T1100>";
        requestBody += "<T1101>" + hostSerialNum + "</T1101>";
        return this._buildRequestXml(this.MESSAGE_TYPE.settlement, this.PROCESS_CODE.settlement, requestBody);
    },
    /**
     * get the signon's request xml string
     * @param {String} HOST serialNum
     * @return {String} xml
     */
    signonRequest: function(hostSerialNum) {
        let requestBody = "<T1100>" + this.signonSequence +"</T1100>";
        requestBody += "<T1101>" + hostSerialNum + "</T1101>";
        return this._buildRequestXml(this.MESSAGE_TYPE.signon, this.PROCESS_CODE.signon, requestBody);
    },
    /**
     * calculate amount to icerapi amount
     * @param {Number} transaction amount
     * @return {Number} calculated amount
     */
    calAmount: function(amount) {
        return amount*this.TXN_AMT_UNIT;
    },
    /**
     * get icerapi transaction sequence from POS transaction sequence
     * @param {String} POS transaction sequence
     */
    getTxnSequence: function(transactionSeq) {
        return GeckoJS.String.padLeft(transactionSeq.slice(-6), 6, "0");
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