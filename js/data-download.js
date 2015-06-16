$(document).ready(function() {
    $('#download-select').multiSelect();
    $('.download-all-btn').click(function (e) {
        e.preventDefault();
        if($('.intended-use-options option:selected').val() == 0) {
            alert('Please specify your intended use');
        }
        
        if(!$('.intended-use-desc').val()) {
           alert('Please enter a description of how you intend to use the data');
           return;
        }
        
        $('.link.ms-selected').multiDownload();
    });
});