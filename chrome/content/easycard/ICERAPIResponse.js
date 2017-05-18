var ICERAPIResponse = {

    KEY_CARD_PHYSICAL_ID: "T0200",
    KEY_TXN_AMOUNT: "T0400",
    KEY_AUTOLOAD_TXN_AMOUNT: "T0409",
    KEY_BALANCE: "T0410",
    KEY_RESPONSE_CODE: "T3900",
    KEY_RETURN_CODE: "T3901",
    KEY_REFERENCE_NUM: "T3700",

    CODE_SUCCESS: "0",

    /**
     * return the result entity
     * @param {Object} responseJSON
     * @return {Object | null}
     */
    parseResponse: function(responseJSON) {
        return (typeof responseJSON != "undefined" && typeof responseJSON.TransXML != 'undefined' && typeof responseJSON.TransXML.TRANS != 'undefined') ? responseJSON.TransXML.TRANS : null;
    }

};