var EDCResponse = {

    KEY_CARD_PHYSICAL_ID: "T0200",
    KEY_TXN_AMOUNT: "T0400",
    KEY_BALANCE: "T0410",
    KEY_RESPONSE_CODE: "T3900",
    KEY_REFERENCE_NUM: "T3700",
    KEY_ERROR_MSG: "ErrMsg",

    CODE_SUCCESS: "0",

    /**
     * return the result entity
     * @param {Object} responseJSON
     * @return {Object | null}
     */
    parseResponse: function(responseJSON) {
        return (typeof responseJSON != "undefined" && responseJSON.response != null && typeof responseJSON.response.TRANS != "undefined") ? responseJSON.response.TRANS : null;
    }

};