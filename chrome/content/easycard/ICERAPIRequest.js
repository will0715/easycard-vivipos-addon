var ICERAPIRequest = function() {
};

ICERAPIRequest.prototype = {

    PROCESS_CODE: {
        "signon": "881999",
        "payout": "606100",
        "cancel": "620061",
        "query": "216000",
        "balance": "296000",
        "settlement": "900099"
    },

    MESSAGE_TYPE: {
        "request": "0100",
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
        let requestBody = "<T0400>" + amount + "</T0400>";
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
        let requestBody = "<T0400>" + amount + "</T0400>";
        requestBody += "<T1100>" + serialNum + "</T1100>";
        requestBody += "<T1101>" + hostSerialNum + "</T1101>";
        requestBody += "<T3701>" + transactionSeq + "</T3701>";
        return this._buildRequestXml(this.MESSAGE_TYPE.request, this.PROCESS_CODE.cancel, requestBody);
    },
    /**
     * get the query's request xml string
     * @param {Integer} amount
     * @param {String} serialNum
     * @param {String} HOST serialNum
     * @return {String} xml
     */
    queryRequest: function(amount, serialNum, hostSerialNum) {
        let requestBody = "<T0400>" + amount + "</T0400>";
        requestBody += "<T1100>" + serialNum + "</T1100>";
        requestBody += "<T1101>" + hostSerialNum + "</T1101>";
        return this._buildRequestXml(this.MESSAGE_TYPE.request, this.PROCESS_CODE.query, requestBody);
    },
    /**
     * get the balance's request xml string
     * @param {String} serialNum
     * @param {String} HOST serialNum
     * @return {String} xml
     */
    balanceRequest: function(serialNum, hostSerialNum) {
        let requestBody = "<T1100>" + serialNum + "</T1100>";
        requestBody += "<T1101>" + hostSerialNum + "</T1101>";
        return this._buildRequestXml(this.MESSAGE_TYPE.request, this.PROCESS_CODE.balance, requestBody);
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