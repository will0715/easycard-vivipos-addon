var EDCRequest = function(tmId, tmAgentNum) {
    this._tmId = tmId;
    this._tmAgentNum = tmAgentNum;
};

EDCRequest.prototype = {

    PROCESS_CODE: {
        "signon": "881999",
        "payout": "811599",
        "cancel": "823899",
        "query": "999999",
        "balance": "200000",
        "settlement": "900000"
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
     * @param {String} transactionSeq
     * @return {String} xml
     */
    payoutRequest: function(amount, serialNum, transactionSeq) {
        let requestBody = "<T0400>" + amount + "</T0400>";
        requestBody += "<T1101>" + serialNum + "</T1101>";
        requestBody += "<T3701>" + transactionSeq + "</T3701>";
        return this._buildRequestXml(this.MESSAGE_TYPE.request, this.PROCESS_CODE.payout, requestBody);
    },
    /**
     * get the cancel's request xml string
     * @param {Integer} amount
     * @param {String} serialNum
     * @param {String} transactionSeq
     * @return {String} xml
     */
    cancelRequest: function(amount, serialNum, transactionSeq) {
        let requestBody = "<T0400>" + amount + "</T0400>";
        requestBody += "<T1101>" + serialNum + "</T1101>";
        requestBody += "<T3701>" + transactionSeq + "</T3701>";
        return this._buildRequestXml(this.MESSAGE_TYPE.request, this.PROCESS_CODE.cancel, requestBody);
    },
    /**
     * get the query's request xml string
     * @param {Integer} amount
     * @param {String} serialNum
     * @param {String} transactionSeq
     * @return {String} xml
     */
    queryRequest: function(amount, serialNum, transactionSeq) {
        let requestBody = "<T0400>" + amount + "</T0400>";
        requestBody += "<T1101>" + serialNum + "</T1101>";
        requestBody += "<T3701>" + transactionSeq + "</T3701>";
        return this._buildRequestXml(this.MESSAGE_TYPE.request, this.PROCESS_CODE.query, requestBody);
    },
    /**
     * get the balance's request xml string
     * @return {String} xml
     */
    balanceRequest: function() {
        return this._buildRequestXml(this.MESSAGE_TYPE.request, this.PROCESS_CODE.balance);
    },
    /**
     * get the settlement's request xml string
     * @param {String} serialNum
     * @return {String} xml
     */
    settlementRequest: function(serialNum) {
        let requestBody = "<T1101>" + serialNum + "</T1101>";
        return this._buildRequestXml(this.MESSAGE_TYPE.settlement, this.PROCESS_CODE.settlement, requestBody);
    },
    /**
     * get the signon's request xml string
     * @param {String} serialNum
     * @param {String} signOnPwd
     * @return {String} xml
     */
    signonRequest: function(serialNum, signOnPwd) {
        let requestBody = "<T1101>" + serialNum + "</T1101>";
        requestBody += "<T5595><T559502>PWD</T559502>";
        requestBody += "<T559503>" + signOnPwd + "</T559503></T5595>";
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
        let request = "<TM><TRANS>";
        request += "<T0100>" + messageType + "</T0100>";
        request += "<T0300>" + processCode + "</T0300>";
        if (typeof requestBody != "undefined") {
            request += "<T1201>" + (new Date()).toString('HHmmss') + "</T1201>";
            request += "<T1301>" + (new Date()).toString('yyyyMMdd') + "</T1301>";
            request += "<T5504>" + this._tmId + "</T5504>";
            request += "<T5510>" + this._tmAgentNum + "</T5510>";
            request += requestBody;
        }
        request += "</TRANS></TM>";
        return request;
    }

};