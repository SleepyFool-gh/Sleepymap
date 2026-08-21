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