// prism syntax highlighting
$('<link>', {
    rel: 'stylesheet',
    href: 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css'
}).appendTo('head');
$.getScript('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-core.min.js', function() {
    $.getScript('https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js', function() {
        if (window.Prism) {
            Prism.highlightAll();
        }
    });
});
$(document).on(':passagedisplay', () => {
    if (window.Prism) {
        Prism.highlightAll();
    }
});

// tabs
$(document).on('click', '#controls .header', function() {
    const control = $(this).attr('data-control');
    $('#control-content').html('');
    $('#control-content').wikiPassage(`control_${control}`);
    $('#headers').attr('data-selected', control);
});