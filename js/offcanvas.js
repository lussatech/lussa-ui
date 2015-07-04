/**
 * @ngdoc directive
 *
 * @name lussa.ui.collapse
 */
angular.module('lussa.ui.offcanvas', [])
.directive('offcanvas', ['$animate', '$log', '$q',
    function ($animate,$log,$q) {
    var isolateController = function (scope, element, attrs) {
        var canvasSelector    = attrs.canvas || 'body',
            canvas            = angular.element(canvasSelector),
            navbar            = canvas.find('.navbar.navbar-fixed-top, .navbar.navbar-fixed-bottom'),
            position          = 'left',
            DESKTOP_BREAKPOINT = 780,
            TABLET_BREAKPOINT  = 520,
            breakPoint = 0;

        // get sidebar class
        if(element.hasClass('sidebar-fixed-right'))
            position = 'right';

        // determine breakpoint
        if(element.hasClass('offcanvas-mobile'))
            breakPoint = TABLET_BREAKPOINT;
        if(element.hasClass('offcanvas-tablet'))
            breakPoint = DESKTOP_BREAKPOINT;

        function onCanvas() {
            canvas.removeClass('canvas-in');
            $q.all([
                $animate.addClass(canvas, 'canvas-out'),
                $animate.addClass(element, 'in')
            ])
            .then(onCanvasDone());
        }

        function onCanvasDone() {
            $log.info('on canvas done');
        }

        function offCanvas() {
            canvas.removeClass('canvas-out');
            $q.all([
                $animate.addClass(canvas, 'canvas-in'),
                $animate.removeClass(element, 'in')
            ])
            .then(offCanvasDone());
        }

        function offCanvasDone() {
            $log.info('off canvas done');
        }

        // init
        if(angular.isUndefined(scope.offcanvas)){
            scope.offcanvas = (window.innerWidth <= breakPoint);
        }

        // responsive
        window.onresize = function(){
            scope.offcanvas = (window.innerWidth <= breakPoint);
            scope.$apply();
        };

        // watch scope
        scope.$watch('offcanvas', function (shouldOffCanvas) {
            $log.info('should off canvas?');
            $log.info(shouldOffCanvas);
            if (shouldOffCanvas) {
                offCanvas();
            } else {
                onCanvas();
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
