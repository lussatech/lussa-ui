/**
 * $ngdoc directive
 * @name module.method:attribute|AUTO|AUTO.:
 * @deprecated
 * @scope
 * @eventType emit|broadcast
 * @link
 *
 * @requires (,...)
 * @propertyOf angular.Module
 * @methodOf angular.Module|AUTO.
 * @function
 * @element ANY
 * @description
 * @param {type name description}
 * @returns {type description}
 */

var dropDown = angular.module('lussa.ui.dropdown',[]);

dropDown.directive('dropdown', ['$log','$animate', function($log){
    var SPEED_DEFAULT = 500,
        EASING_DEFAULT = 'easeOutExpo';

    // Runs during compile
    return {
        scope: {
            'isOpen': '@',
            'onOpen': '&',
            'onClose': '&',
            'enableAnimation': '@',
            'toggleByHover': '@'
        },
        restrict: 'AEC',
        link: function(scope, element, attrs, controller) {
            // init vars
            var opened = scope.isOpen || false,
                wrapper = element,
                toggler = element.find('.dropdown-toggle, a:first, .button:first, button:first'),
                content = element.find('.dropdown-content, .dropdown-menu');

            // default state
            if(opened) open_menu();

            /**
             * [close_menu description]
             * @return {[type]} [description]
             */
            function close_menu(){
                opened = false;
                content.removeClass('open');
                toggler.removeClass('open');
                // callback
                scope.onOpen(element);
            }

            /**
             * [open_menu description]
             * @return {[type]} [description]
             */
            function open_menu(){
                opened = true;
                content.addClass('open');
                toggler.addClass('open');
                // callback
                scope.onClose(element);
            }


            if(attrs.toggleByHover){
                element.hoverIntent({
                    over: function(){
                        if(!opened)
                            open_menu();
                    },
                    out: function(){
                        if(opened)
                            close_menu();
                    },
                    timeout: 500
                });
            } else {
                // on click events
                toggler.on('click',function(e){
                    if(opened){
                        close_menu();
                    }else{
                        open_menu();
                    }
                });
            }

            toggler.on('blur', function(e){
                close_menu();
            });
        }
    };
}]);