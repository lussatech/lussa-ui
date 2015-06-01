/**
 * [docs description]
 * @type {[type]}
 */
var app = angular.module('docs', [
    'ngSanitize',
    'ngAnimate',
    'lussa.ui.form.datePicker'
]);

/**
 * Component Controller
 */
app.controller('ComponentController', ['$log', '$scope', 'page', 'lussaUI' , 'PageNavigationFactory',
    function($log, $scope, page, lussaUI, PageNavigationFactory){
    // ui routine
    PageNavigationFactory.BuildTabs();
    PageNavigationFactory.LeftSidebar().init();
    PageNavigationFactory.SmoothScroll().linkListener();

    // when page get scrolled
    angular.element(document).on('scroll', function(e){
        PageNavigationFactory.LeftSidebar().onScroll();
    });

    // when hash change
    angular.element(window).on('hashchange',function(e){
        LeftSidebar().renderMenubyHash(location.hash);
    });

    // init scope
    $scope.docs = {
        datePicker : new Date()
    };
}]);

/**
 * Global Constant
 */
app.constant('lussaUI', {
    'repo': 'http://git.lussa.net/tarsius/lussa-ui.git'
});

/**
 * Page Navigation
 */
// global value,
app.value('PageNavigationValue', {
    header_height: 50,
    sidebar_offset: 50,
    menu_offset_collections: []
});

// service
app.factory('PageNavigationFactory', ['$log', 'PageNavigationValue',
    function($log, PageNavigationValue){
    /**
     * Tabs
     */
    function _build_tabs(){
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
    function _left_sidebar(){
        var navbar = $('.docs-navbar'),
            left_sidebar_element = $('.docs-left-sidebar'),
            content_element = $('.docs-content');


        function _get_scroll_position(){
            return $(document).scrollTop() + PageNavigationValue.header_height;
        }

        function _get_all_menu_scroll_offset(){
            $('.docs-content > h1, .docs-content > h2').each(function(index){
                var hash = $(this).attr('id');
                if(hash){
                    PageNavigationValue.menu_offset_collections.push({
                        'hash': hash,
                        'offset': $(this).offset().top
                    });
                }
            });
        }

        function _determine_hash_by_scroll(offset){
            return  _.find(PageNavigationValue.menu_offset_collections,function(heading, index, list){
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
            PageNavigationValue.sidebar_offset = content_element.offset().top;

            // render menu on scroll
            var heading = _determine_hash_by_scroll(_get_scroll_position() + 2);
            if(heading)
                _render_menu_by_hash('#'+heading.hash);

            if( _get_scroll_position() > (PageNavigationValue.sidebar_offset)) {
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
    function _smooth_scroll(){

        function _scroll_to(hash, callback){
            var target = $(hash),
                callback = callback || null;

            target = target.length ? target : $('[name=' + hash.slice(1) +']');
            if (target.length) {
                $('html,body').animate(
                    { scrollTop: target.offset().top - PageNavigationValue.header_height },
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

    return {
        BuildTabs: _build_tabs,
        LeftSidebar: _left_sidebar,
        SmoothScroll: _smooth_scroll
    };
}]);

/**
 * Page Identity
 */
app.value('page', {
    title: 'Lussa UI Documentation',
    slug: 'home',
    version: '0.1',
});