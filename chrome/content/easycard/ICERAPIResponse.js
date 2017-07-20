var ICERAPIResponse = {

    KEY_CARD_PHYSICAL_ID: "T0200",
    KEY_TXN_AMOUNT: "T0400",
    KEY_AUTOLOAD_TXN_AMOUNT: "T0409",
    KEY_BALANCE: "T0410",
    KEY_RESPONSE_CODE: "T3900",
    KEY_RETURN_CODE: "T3901",
    KEY_READER_RESPONSE_CODE: "T3904",
    KEY_REFERENCE_NUM: "T3700",
    KEY_HOST_SERIAL_NUM: "T1101",
    KEY_RECEIPT_CARD_ID: "T0215",
    KEY_DEVICE_ID: "T4110",
    KEY_OLD_BALANCE: "T0415",
    KEY_TXN_DATE: "T1300",
    KEY_TXN_TIME: "T1200",
    KEY_EINVOICE_CARRIER_ID: "T0209",

    CODE_SUCCESS: "0",
    CODE_RETRY: "-125",
    CODE_READER_ERROR: "-119",

    TXN_AMT_UNIT: 100,

    /**
     * return the result entity
     * @param {Object} responseJSON
     * @return {Object | null}
     */
    parseResponse: function(responseJSON) {
        return (typeof responseJSON != "undefined" && typeof responseJSON.TransXML != 'undefined' && typeof responseJSON.TransXML.TRANS != 'undefined') ? responseJSON.TransXML.TRANS : null;
    },
    /**
     * calculate icerapi amount to real amount
     * @param {Number} icerapi amount
     * @return {Number} calculated amount
     */
    calAmount: function(icerapiAmount) {
        return parseFloat(icerapiAmount/this.TXN_AMT_UNIT); //amount accurate to the second decimal place without decimal mark, ex. 1001 -> 10.01(1001/100)
    },
    /**
     * check whether the response need to retry or not
     * @param {Object} response
     * @return {Object | null}
     */
    isRetryRequired: function(response) {
        return (response[this.KEY_RETURN_CODE] == this.CODE_RETRY || (response[this.KEY_RETURN_CODE] == "-119" && response[this.KEY_READER_RESPONSE_CODE].indexOf("62") == 0)) ? true : false;
    }

};