/**
 * Docs
 * documentation script tools for non angular documentation
 */

// global vars
var header_height = 50,
    sidebar_offset = 50,
    menu_offset_collections = [];

// main routine & service
$(document).ready(function(e){
    // init
    BuildTabs();
    LeftSidebar().init();
    SmoothScroll().linkListener();

    // when page get scrolled
    $(document).on('scroll', function(e){
        // header service
        LeftSidebar().onScroll();
    });

    // when hash change
    $(window).on('hashchange',function(e){
        LeftSidebar().renderMenubyHash(location.hash);
    });
});


/**
 * Tabs
 */
function BuildTabs(){
    var wrapper = $('.docs-tab'),
        link = '.docs-tab-link-container > li',
        content = '.docs-tab-content';

    function _open_tab(tab, idx){
        tab.find(link).removeClass('active');
        tab.find(link).eq(idx).addClass('active');
        tab.find(content).hide();
        tab.find(content).eq(idx).show();
    }

    wrapper.each(function(index){
        var tab = $(this);
        _open_tab(tab, 0);

        tab.find(link).on('click',function(e){
            e.preventDefault();
            _open_tab(tab, $(this).index());
        });
    });
}

/**
 * Left Sidebar
 */
function LeftSidebar(){
    var navbar = $('.docs-navbar'),
        left_sidebar_element = $('.docs-left-sidebar'),
        content_element = $('.docs-content');


    function _get_scroll_position(){
        return $(document).scrollTop() + header_height;
    }

    function _get_all_menu_scroll_offset(){
        $('.docs-content > h1, .docs-content > h2').each(function(index){
            var hash = $(this).attr('id');
            if(hash){
                menu_offset_collections.push({
                    'hash': hash,
                    'offset': $(this).offset().top
                });
            }
        });
    }

    function _determine_hash_by_scroll(offset){
        return  _.find(menu_offset_collections,function(heading, index, list){
            if(index < (list.length - 1))
                return (heading.offset < offset) && (list[index + 1].offset > offset);
            else
                return (heading.offset < offset);
        });
    }

    function _render_menu_by_hash(hash){
        // reset
        left_sidebar_element.find('li').removeClass('active');
        left_sidebar_element.find('li > ul').hide();

        // crawl link
        left_sidebar_element.find('a[href*=#]:not([href=#])')
        .each(function(index){
            // open state for selected link
            if( this.hash === hash ){

                var link = $(this).closest('li').addClass('active'),
                    next_elem = $(this).next();
                if(next_elem.is('ul')){
                    next_elem.show(0);
                }else{
                    link.parent('ul').show(0);
                }

            }
        });
    }

    function _on_scroll(){
        // sidebar offset in iddle state
        sidebar_offset = content_element.offset().top;

        // render menu on scroll
        var heading = _determine_hash_by_scroll(_get_scroll_position() + 2);
        if(heading)
            _render_menu_by_hash('#'+heading.hash);

        if( _get_scroll_position() > (sidebar_offset)) {
            left_sidebar_element.addClass('docs-sidebar-fixed');
            content_element.addClass('prefix-25');
        }else{
            left_sidebar_element.removeClass('docs-sidebar-fixed');
            content_element.removeClass('prefix-25');
        }
    }

    function _init(){
        _get_all_menu_scroll_offset();
        _on_scroll();
        _render_menu_by_hash(location.hash);
    }

    return {
        onScroll: _on_scroll,
        renderMenubyHash : _render_menu_by_hash,
        init: _init
    };
}

/**
 * Smooth Scroll
 */
function SmoothScroll(){

    function _scroll_to(hash, callback){
        var target = $(hash),
            callback = callback || null;

        target = target.length ? target : $('[name=' + hash.slice(1) +']');
        if (target.length) {
            $('html,body').animate(
                { scrollTop: target.offset().top - header_height },
                700, 'easeOutExpo', callback);
        }
    }

    function _link_listener(){
        $('a[href*=#]:not([href=#])')
            .on('click', function(e) {
            // check if link goes localy
            if (location.pathname.replace(/^\//,'') == this.pathname.replace(/^\//,'') &&
                location.hostname == this.hostname) {
                var hash = this.hash;
                _scroll_to(hash, function(){
                    window.location.hash = hash;
                });
            }

            return false;
        });
    }

    return {
        linkListener: _link_listener,
        scrollTo: _scroll_to
    };

}