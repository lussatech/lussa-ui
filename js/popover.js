/**
* The following features are still outstanding: popup delay, animation as a
* function, placement as a function, inside, support for more triggers than
* just mouse enter/leave, html popovers, and selector delegatation.
*/
angular.module( 'lussa.ui.popover', [ 'lussa.ui.tooltip' ] )

.directive( 'popoverTemplatePopup', function () {
    return {
        restrict: 'EA',
        replace: true,
        scope: { title: '@', contentExp: '&', placement: '@', popupClass: '@', animation: '&', isOpen: '&',
        originScope: '&' },
        template: '<div class="popover"'+
            '  tooltip-animation-class="fade"'+
            '  tooltip-classes'+
            '  ng-class="{ in: isOpen() }">'+
            '  <div class="arrow"></div>'+
            ''+
            '  <div class="popover-inner">'+
            '      <h3 class="popover-title" ng-bind="title" ng-if="title"></h3>'+
            '      <div class="popover-content"'+
            '        tooltip-template-transclude="contentExp()"'+
            '        tooltip-template-transclude-scope="originScope()"></div>'+
            '  </div>'+
            '</div>'
    };
})

.directive( 'popoverTemplate', [ '$tooltip', function ( $tooltip ) {
    return $tooltip( 'popoverTemplate', 'popover', 'click', {
        useContentExp: true
    } );
}])

.directive( 'popoverPopup', function () {
    return {
        restrict: 'EA',
        replace: true,
        scope: { title: '@', content: '@', placement: '@', popupClass: '@', animation: '&', isOpen: '&' },
        template: '<div class="popover"'+
            '  tooltip-animation-class="fade"'+
            '  tooltip-classes'+
            '  ng-class="{ in: isOpen() }">'+
            '  <div class="arrow"></div>'+
            ''+
            '  <div class="popover-inner">'+
            '      <h3 class="popover-title" ng-bind="title" ng-if="title"></h3>'+
            '      <div class="popover-content" ng-bind="content"></div>'+
            '  </div>'+
            '</div>'
    };
})

.directive( 'popover', [ '$tooltip', function ( $tooltip ) {
    return $tooltip( 'popover', 'popover', 'click' );
}]);
