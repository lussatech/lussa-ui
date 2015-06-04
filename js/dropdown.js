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

dropDown.directive('uiDropdown', ['$log', function($log){
    var SPEED_DEFAULT = 500,
        EASING_DEFAULT = 'easeOutExpo';

    // Runs during compile
    return {
        scope: {
            'isOpen': '@',
            'onOpen': '&',
            'onClose': '&',
            'openEasing': '@',
            'openSpeed': '@',
            'closeEasing': '@',
            'closeSpeed': '@',
            'toggleByHover': '@'
        },
        transclude: true,
        template: '<div class="ui-dropdown">'+
            '<ng-transclude></ng-transclude></div>',
        restrict: 'E',
        link: function(scope, element, attrs, controller) {
            // init vars
            var opened = attrs.isOpen || false,
                wrapper = element,
                toggler = element.find('.dropdown-toggle'),
                content = element.find('.dropdown-content, .dropdown-menu'),
                fx = {
                    open: {
                        speed: attrs.openSpeed || SPEED_DEFAULT,
                        easing: attrs.openEasing || EASING_DEFAULT,
                    },
                    close: {
                        speed: attrs.closeSpeed || SPEED_DEFAULT,
                        easing: attrs.closeEasing || EASING_DEFAULT,
                    }
                };

            // default state
            if(opened)
                content.show();

            /**
             * [close_menu description]
             * @return {[type]} [description]
             */
            function close_menu(){
                opened = false;
                content.slideUp(fx.open.speed, fx.open.easing);

                // callback
                scope.onOpen(element);
            }

            /**
             * [open_menu description]
             * @return {[type]} [description]
             */
            function open_menu(){
                opened = true;
                content.slideDown(fx.close.speed, fx.close.easing);

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

        }
    };
}]);