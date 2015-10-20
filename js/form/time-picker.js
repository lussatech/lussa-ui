angular.module('lussa.ui.form.timePicker', [])

.constant('timePickerConfig', {
    hourStep: 1,
    minuteStep: 1,
    showMeridian: true,
    meridians: null,
    readonlyInput: false,
    mousewheel: true,
    arrowkeys: true,
    showSpinners: true
})

.controller('TimePickerController', ['$scope', '$attrs', '$parse', '$log', '$locale', 'timePickerConfig', function($scope, $attrs, $parse, $log, $locale, timePickerConfig) {
    var selected = new Date(),
    ngModelCtrl = { $setViewValue: angular.noop }, // nullModelCtrl
    meridians = angular.isDefined($attrs.meridians) ? $scope.$parent.$eval($attrs.meridians) : timePickerConfig.meridians || $locale.DATETIME_FORMATS.AMPMS;

    this.init = function( ngModelCtrl_, inputs ) {
        ngModelCtrl = ngModelCtrl_;
        ngModelCtrl.$render = this.render;

        ngModelCtrl.$formatters.unshift(function (modelValue) {
            return modelValue ? new Date( modelValue ) : null;
        });

        var hoursInputEl = inputs.eq(0),
        minutesInputEl = inputs.eq(1);

        var mousewheel = angular.isDefined($attrs.mousewheel) ? $scope.$parent.$eval($attrs.mousewheel) : timePickerConfig.mousewheel;
        if ( mousewheel ) {
            this.setupMousewheelEvents( hoursInputEl, minutesInputEl );
        }

        var arrowkeys = angular.isDefined($attrs.arrowkeys) ? $scope.$parent.$eval($attrs.arrowkeys) : timePickerConfig.arrowkeys;
        if (arrowkeys) {
            this.setupArrowkeyEvents( hoursInputEl, minutesInputEl );
        }

        $scope.readonlyInput = angular.isDefined($attrs.readonlyInput) ? $scope.$parent.$eval($attrs.readonlyInput) : timePickerConfig.readonlyInput;
        this.setupInputEvents( hoursInputEl, minutesInputEl );
    };

    var hourStep = timePickerConfig.hourStep;
    if ($attrs.hourStep) {
        $scope.$parent.$watch($parse($attrs.hourStep), function(value) {
            hourStep = parseInt(value, 10);
        });
    }

    var minuteStep = timePickerConfig.minuteStep;
    if ($attrs.minuteStep) {
        $scope.$parent.$watch($parse($attrs.minuteStep), function(value) {
            minuteStep = parseInt(value, 10);
        });
    }

    // 12H / 24H mode
    $scope.showMeridian = timePickerConfig.showMeridian;
    if ($attrs.showMeridian) {
        $scope.$parent.$watch($parse($attrs.showMeridian), function(value) {
            $scope.showMeridian = !!value;

            if ( ngModelCtrl.$error.time ) {
                // Evaluate from template
                var hours = getHoursFromTemplate(), minutes = getMinutesFromTemplate();
                if (angular.isDefined( hours ) && angular.isDefined( minutes )) {
                    selected.setHours( hours );
                    refresh();
                }
            } else {
                updateTemplate();
            }
        });
    }

    // Get $scope.hours in 24H mode if valid
    function getHoursFromTemplate ( ) {
        var hours = parseInt( $scope.hours, 10 );
        var valid = ( $scope.showMeridian ) ? (hours > 0 && hours < 13) : (hours >= 0 && hours < 24);
        if ( !valid ) {
            return undefined;
        }

        if ( $scope.showMeridian ) {
            if ( hours === 12 ) {
                hours = 0;
            }
            if ( $scope.meridian === meridians[1] ) {
                hours = hours + 12;
            }
        }
        return hours;
    }

    function getMinutesFromTemplate() {
        var minutes = parseInt($scope.minutes, 10);
        return ( minutes >= 0 && minutes < 60 ) ? minutes : undefined;
    }

    function pad( value ) {
        return ( angular.isDefined(value) && value.toString().length < 2 ) ? '0' + value : value.toString();
    }

    // Respond on mousewheel spin
    this.setupMousewheelEvents = function( hoursInputEl, minutesInputEl ) {
        var isScrollingUp = function(e) {
            if (e.originalEvent) {
                e = e.originalEvent;
            }
            //pick correct delta variable depending on event
            var delta = (e.wheelDelta) ? e.wheelDelta : -e.deltaY;
            return (e.detail || delta > 0);
        };

        hoursInputEl.bind('mousewheel wheel', function(e) {
            $scope.$apply( (isScrollingUp(e)) ? $scope.incrementHours() : $scope.decrementHours() );
            e.preventDefault();
        });

        minutesInputEl.bind('mousewheel wheel', function(e) {
            $scope.$apply( (isScrollingUp(e)) ? $scope.incrementMinutes() : $scope.decrementMinutes() );
            e.preventDefault();
        });

    };

    // Respond on up/down arrowkeys
    this.setupArrowkeyEvents = function( hoursInputEl, minutesInputEl ) {
        hoursInputEl.bind('keydown', function(e) {
            if ( e.which === 38 ) { // up
                e.preventDefault();
                $scope.incrementHours();
                $scope.$apply();
            }
            else if ( e.which === 40 ) { // down
                e.preventDefault();
                $scope.decrementHours();
                $scope.$apply();
            }
        });

        minutesInputEl.bind('keydown', function(e) {
            if ( e.which === 38 ) { // up
                e.preventDefault();
                $scope.incrementMinutes();
                $scope.$apply();
            }
            else if ( e.which === 40 ) { // down
                e.preventDefault();
                $scope.decrementMinutes();
                $scope.$apply();
            }
        });
    };

    this.setupInputEvents = function( hoursInputEl, minutesInputEl ) {
        if ( $scope.readonlyInput ) {
            $scope.updateHours = angular.noop;
            $scope.updateMinutes = angular.noop;
            return;
        }

        var invalidate = function(invalidHours, invalidMinutes) {
            ngModelCtrl.$setViewValue( null );
            ngModelCtrl.$setValidity('time', false);
            if (angular.isDefined(invalidHours)) {
                $scope.invalidHours = invalidHours;
            }
            if (angular.isDefined(invalidMinutes)) {
                $scope.invalidMinutes = invalidMinutes;
            }
        };

        $scope.updateHours = function() {
            var hours = getHoursFromTemplate();

            if ( angular.isDefined(hours) ) {
                selected.setHours( hours );
                refresh( 'h' );
            } else {
                invalidate(true);
            }
        };

        hoursInputEl.bind('blur', function(e) {
            if ( !$scope.invalidHours && $scope.hours < 10) {
                $scope.$apply( function() {
                    $scope.hours = pad( $scope.hours );
                });
            }
        });

        $scope.updateMinutes = function() {
            var minutes = getMinutesFromTemplate();

            if ( angular.isDefined(minutes) ) {
                selected.setMinutes( minutes );
                refresh( 'm' );
            } else {
                invalidate(undefined, true);
            }
        };

        minutesInputEl.bind('blur', function(e) {
            if ( !$scope.invalidMinutes && $scope.minutes < 10 ) {
                $scope.$apply( function() {
                    $scope.minutes = pad( $scope.minutes );
                });
            }
        });

    };

    this.render = function() {
        var date = ngModelCtrl.$viewValue;

        if ( isNaN(date) ) {
            ngModelCtrl.$setValidity('time', false);
            $log.error('TimePicker directive: "ng-model" value must be a Date object, a number of milliseconds since 01.01.1970 or a string representing an RFC2822 or ISO 8601 date.');
        } else {
            if ( date ) {
                selected = date;
            }
            makeValid();
            updateTemplate();
        }
    };

    // Call internally when we know that model is valid.
    function refresh( keyboardChange ) {
        makeValid();
        ngModelCtrl.$setViewValue( new Date(selected) );
        updateTemplate( keyboardChange );
    }

    function makeValid() {
        ngModelCtrl.$setValidity('time', true);
        $scope.invalidHours = false;
        $scope.invalidMinutes = false;
    }

    function updateTemplate( keyboardChange ) {
        var hours = selected.getHours(), minutes = selected.getMinutes();

        if ( $scope.showMeridian ) {
            hours = ( hours === 0 || hours === 12 ) ? 12 : hours % 12; // Convert 24 to 12 hour system
        }

        $scope.hours = keyboardChange === 'h' ? hours : pad(hours);
        if (keyboardChange !== 'm') {
            $scope.minutes = pad(minutes);
        }
        $scope.meridian = selected.getHours() < 12 ? meridians[0] : meridians[1];
    }

    function addMinutes( minutes ) {
        var dt = new Date( selected.getTime() + minutes * 60000 );
        selected.setHours( dt.getHours(), dt.getMinutes() );
        refresh();
    }

    $scope.showSpinners = angular.isDefined($attrs.showSpinners) ?
    $scope.$parent.$eval($attrs.showSpinners) : timePickerConfig.showSpinners;

    $scope.incrementHours = function() {
        addMinutes( hourStep * 60 );
    };
    $scope.decrementHours = function() {
        addMinutes( - hourStep * 60 );
    };
    $scope.incrementMinutes = function() {
        addMinutes( minuteStep );
    };
    $scope.decrementMinutes = function() {
        addMinutes( - minuteStep );
    };
    $scope.toggleMeridian = function() {
        addMinutes( 12 * 60 * (( selected.getHours() < 12 ) ? 1 : -1) );
    };
}])

.directive('timePicker', function () {
    return {
        restrict: 'EA',
        require: ['timePicker', '?^ngModel'],
        controller:'TimePickerController',
        replace: true,
        scope: {},
        template: '<table class="time-picker">'+
            '  <tbody>'+
            '    <tr class="text-center" ng-show="showSpinners">'+
            '      <td><a ng-click="incrementHours()" class="button button-link" ng-class="buttonClass" ><span class="icon icon-chevron-up"></span></a></td>'+
            '      <td> </td>'+
            '      <td><a ng-click="incrementMinutes()" class="button button-link" ng-class="buttonClass" ><span class="icon icon-chevron-up"></span></a></td>'+
            '      <td ng-show="showMeridian"></td>'+
            '    </tr>'+
            '    <tr>'+
            '      <td class="form-group" ng-class="{\'has-error\': invalidHours}">'+
            '        <input style="width:50px;" type="text" ng-model="hours" ng-change="updateHours()" class="form-control text-center" ng-class="inputClass" ng-readonly="readonlyInput" maxlength="2">'+
            '      </td>'+
            '      <td>:</td>'+
            '      <td class="form-group" ng-class="{\'has-error\': invalidMinutes}">'+
            '        <input style="width:50px;" type="text" ng-model="minutes" ng-change="updateMinutes()" class="form-control text-center" ng-class="inputClass" ng-readonly="readonlyInput" maxlength="2">'+
            '      </td>'+
            '      <td ng-show="showMeridian"><button type="button" class="button button-primary text-center time-picker-meridian" ng-class="buttonClass" ng-click="toggleMeridian()">{{meridian}}</button></td>'+
            '    </tr>'+
            '    <tr class="text-center" ng-show="::showSpinners">'+
            '      <td><a ng-click="decrementHours()" class="button button-link" ng-class="buttonClass" ><span class="icon icon-chevron-down"></span></a></td>'+
            '      <td> </td>'+
            '      <td><a ng-click="decrementMinutes()" class="button button-link" ng-class="buttonClass" ><span class="icon icon-chevron-down"></span></a></td>'+
            '      <td ng-show="showMeridian"></td>'+
            '    </tr>'+
            '  </tbody>'+
            '</table>',
        link: function(scope, element, attrs, ctrls) {
            var timePickerCtrl = ctrls[0], ngModelCtrl = ctrls[1];

            // additional input & button class
            scope.inputClass = attrs.inputClass || '';
            scope.buttonClass = attrs.buttonClass || '';

            if ( ngModelCtrl ) {
                timePickerCtrl.init( ngModelCtrl, element.find('input') );
            }
        }
    };
});
