/**
 * @ngdoc directive
 *
 * @name lussa.ui.collapse
 */
angular.module('lussa.ui.offcanvas', [])
.directive('offcanvas', ['$animate','$window',
    function ($animate,$window) {
    var isolateController = function (scope, element, attrs) {
        var canvasSelector = attrs.canvas || 'body',
            canvas = angular.element(canvasSelector),
            position = 'left',
            desktopBreakpoint = 780,
            tabletBreakpoint = 520,
            alreadyInitiate = false,
            screenSize = 0;

        // get sidebar class
        if(element.hasClass('sidebar-fixed-right'))
            position = 'right';

        function onCanvas() {
            element.addClass('in');
            if(position === 'left') {
                element.css({'left' : '-' + element.outerWidth() + 'px'});
                $animate.addClass(element, 'canvas-sliding', {
                    to: { left: '0' }
                }).then(onCanvasDone);

                $animate.addClass(canvas, 'canvas-sliding', {
                    to: { 'padding-left': element.outerWidth() + 'px'}
                }).then(onCanvasDone);
            }else if(position === 'right'){
                element.css({'right' : '-' + element.outerWidth() + 'px'});
                $animate.addClass(element, 'canvas-sliding', {
                    to: { right: '0' }
                }).then(onCanvasDone);

                $animate.addClass(canvas, 'canvas-sliding', {
                    to: { 'padding-right': element.outerWidth() + 'px'}
                }).then(onCanvasDone);
            }
        }

        function onCanvasDone() {
            // element state
            if(position === 'left') {
                element.removeClass('canvas-sliding')
                    .css({left: '0'});
                // canvas state
                canvas.removeClass('canvas-sliding')
                    .addClass('canvas-slide')
                    .css({'padding-left': element.outerWidth() + 'px'});
            }else if(position === 'right'){
                element.removeClass('canvas-sliding')
                    .css({right: '0'});
                // canvas state
                canvas.removeClass('canvas-sliding')
                    .addClass('canvas-slide')
                    .css({'padding-right': element.outerWidth() + 'px'});
            }
        }

        function offCanvas() {
            canvas.removeClass('canvas-slide');

            if(position === 'left') {
                $animate.addClass(element, 'canvas-sliding', {
                    to: {left: '-' + element.outerWidth() + 'px'}
                }).then(offCanvasDone);

                $animate.addClass(canvas, 'canvas-sliding', {
                    to: { 'padding-left': '0'}
                }).then(offCanvasDone);
            }else if(position === 'right'){
                $animate.addClass(element, 'canvas-sliding', {
                    to: {right: '-' + element.outerWidth() + 'px'}
                }).then(offCanvasDone);

                $animate.addClass(canvas, 'canvas-sliding', {
                    to: { 'padding-right': '0'}
                }).then(offCanvasDone);
            }
        }

        function offCanvasDone() {

            if(position === 'left') {
                element.removeClass('canvas-sliding')
                    .css({left: '-' + element.outerWidth() + 'px'});
                canvas.removeClass('canvas-sliding')
                    .css({'padding-left': '0'});
            }else if(position === 'right'){
                element.removeClass('canvas-sliding')
                    .css({right: '-' + element.outerWidth() + 'px'});
                canvas.removeClass('canvas-sliding')
                    .css({'padding-right': '0'});
            }
        }

        function determineInitState(){
            if(element.is(":visible"))
                scope.offcanvas = false;
            else
                scope.offcanvas = true;

            alreadyInitiate = true;
        }

        // init
        determineInitState();
        scope.$watch('offcanvas', function (shouldOffCanvas) {
            console.log(scope.offcanvas);
            if(alreadyInitiate){
                if (shouldOffCanvas) {
                    offCanvas();
                } else {
                    onCanvas();
                }
            }
        });
    };

    return {
        scope: {
            offcanvas: '='
        },
        link: isolateController,
        restrict: 'A'
    };
}]);
