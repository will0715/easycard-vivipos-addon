(function(){

    GeckoJS.StringBundle.createBundle("chrome://easycard_payment/locale/messages.properties");

    //load model
    include('chrome://easycard_payment/content/easycard/ICERAPIRequest.jsc');
    include('chrome://easycard_payment/content/easycard/ICERAPIResponse.jsc');
    include('chrome://viviecr/content/models/sequence.js');
    include('chrome://easycard_payment/content/models/easycard_transaction.js');

    //load library
    include('chrome://easycard_payment/content/libs/xml2json.min.js');

    include("chrome://easycard_payment/content/controllers/easycard_controller.jsc");

})();
