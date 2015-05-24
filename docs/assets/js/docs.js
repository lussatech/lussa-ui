/**
 * Docs
 * documentation script tools for non angular documentation
 */

// global vars
var header_height = 50,
    sidebar_offset = 50;

// main routine & service
$(document).ready(function(e){
    // init
    TabbedContent();

    // when page get scrolled
    $(document).on('scroll', function(e){
        // header service
        ScrollBehaviour().leftSidebar();
    });
});


/**
 * Tabs
 */
function TabbedContent(){
    var wrapper = $('.docs-tab'),
        link = '.docs-tab-link-container > li',
        content = '.docs-tab-content';

    function _open_tab(tab, idx){
        tab.find(content).hide();
        tab.find(content).eq(idx).show();
    }

    wrapper.each(function(index){
        var tab = $(this);
        _open_tab(tab, 0);

        tab.find(link).on('click',function(e){
            e.preventDefault();
            _open_tab(tab, $(this).index())
        });
    });
}

/**
 * scroll
 */
function ScrollBehaviour(){
    var navbar = $('.docs-navbar'),
        left_sidebar_element = $('.docs-left-sidebar'),
        content_element = $('.docs-content');


    function _get_scroll_position(){
        console.info($(document).scrollTop());
        return $(document).scrollTop();
    }

    function _left_sidebar(){
        // sidebar offset in iddle state
        sidebar_offset = $('.docs-content').offset().top;
        console.info(sidebar_offset);

        if( _get_scroll_position() > (sidebar_offset - header_height )) {
            left_sidebar_element.addClass('docs-sidebar-fixed');
            content_element.addClass('prefix-25');
        }else{
            left_sidebar_element.removeClass('docs-sidebar-fixed');
            content_element.removeClass('prefix-25');
        }
    }

    return {
        leftSidebar: _left_sidebar
    }
}