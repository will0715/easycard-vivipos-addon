(function(){
    
    function startup() {
      const inputData = window.arguments[0];

      if (inputData.caption) {
        document.getElementById('dialog-caption').textContent = inputData.caption;
      }
    }
    
    window.addEventListener('load', startup, false);
})();
