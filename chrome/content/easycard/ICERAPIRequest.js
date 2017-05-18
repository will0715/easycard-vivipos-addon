var ICERAPIRequest = function() {
    this.TXN_AMT_UNIT = 100; //amount accurate to the second decimal place without decimal mark, ex. 10.01 -> 1001(10.01*100)
};

ICERAPIRequest.prototype = {

    PROCESS_CODE: {
        "signon": "881999",
        "payout": "606100",
        "cancel": "620061",
        "query": "296000",
        "settlement": "900099"
    },

    MESSAGE_TYPE: {
        "request": "0200",
        "settlement": "0500",
        "signon": "0800"
    },
    /**
     * get the payout's request xml string
     * @param {Integer} amount
     * @param {String} serialNum
     * @param {String} HOST serialNum
     * @param {String} transactionSeq
     * @return {String} xml
     */
    payoutRequest: function(amount, serialNum, hostSerialNum, transactionSeq) {
        let requestBody = "<T0400>" + this.calAmount(amount) + "</T0400>";
        requestBody += "<T1100>" + serialNum + "</T1100>";
        requestBody += "<T1101>" + hostSerialNum + "</T1101>";
        requestBody += "<T3701>" + transactionSeq + "</T3701>";
        return this._buildRequestXml(this.MESSAGE_TYPE.request, this.PROCESS_CODE.payout, requestBody);
    },
    /**
     * get the cancel's request xml string
     * @param {Integer} amount
     * @param {String} serialNum
     * @param {String} HOST serialNum
     * @param {String} transactionSeq
     * @return {String} xml
     */
    cancelRequest: function(amount, serialNum, hostSerialNum, transactionSeq) {
        let requestBody = "<T0400>" + this.calAmount(amount) + "</T0400>";
        requestBody += "<T1100>" + serialNum + "</T1100>";
        requestBody += "<T1101>" + hostSerialNum + "</T1101>";
        requestBody += "<T3701>" + transactionSeq + "</T3701>";
        return this._buildRequestXml(this.MESSAGE_TYPE.request, this.PROCESS_CODE.cancel, requestBody);
    },
    /**
     * get the query's request xml string
     * @param {String} serialNum
     * @param {String} HOST serialNum
     * @return {String} xml
     */
    queryRequest: function(serialNum, hostSerialNum) {
        let requestBody = "<T0400>000</T0400>";
        requestBody += "<T1100>" + serialNum + "</T1100>";
        requestBody += "<T1101>" + hostSerialNum + "</T1101>";
        return this._buildRequestXml(this.MESSAGE_TYPE.request, this.PROCESS_CODE.query, requestBody);
    },
    /**
     * get the settlement's request xml string
     * @param {String} serialNum
     * @param {String} HOST serialNum
     * @return {String} xml
     */
    settlementRequest: function(serialNum, hostSerialNum) {
        let requestBody = "<T1100>" + serialNum + "</T1100>";
        requestBody += "<T1101>" + hostSerialNum + "</T1101>";
        return this._buildRequestXml(this.MESSAGE_TYPE.settlement, this.PROCESS_CODE.settlement, requestBody);
    },
    /**
     * get the signon's request xml string
     * @param {String} serialNum
     * @param {String} HOST serialNum
     * @return {String} xml
     */
    signonRequest: function(serialNum, hostSerialNum) {
        let requestBody = "<T1100>" + serialNum + "</T1100>";
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
            request += "<T1200>" + (new Date()).toString('HHmmss') + "</T1200>";
            request += "<T1300>" + (new Date()).toString('yyyyMMdd') + "</T1300>";
            request += requestBody;
        }
        request += "</TRANS></TransXML>";
        return request;
    }

};