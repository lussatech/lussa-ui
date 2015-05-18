/*!
 * Tarsius UI v0.0.1 (http://git.lussa.net/tarsius/tarsius-ui)
 * Copyright 2014-2015 Muhammad Hasan
 * Licensed under MIT
 */

'use strict';
// Source: js/form/auto-complete.js
/**
 * [form description]
 * @type {[type]}
 */
var form = angular.module('tarsius.form',[]);

/**
 * [description]
 * @param  {[type]} $q             [description]
 * @param  {[type]} $parse         [description]
 * @param  {[type]} $http          [description]
 * @param  {[type]} $sce           [description]
 * @param  {[type]} $timeout       [description]
 * @param  {[type]} $templateCache [description]
 * @return {[type]}                [description]
 */
form.directive('autoComplete', ['$q', '$parse', '$http', '$sce', '$timeout',
    function ($q, $parse, $http, $sce, $timeout) {
    // keyboard events
    var KEY_DW  = 40;
    var KEY_RT  = 39;
    var KEY_UP  = 38;
    var KEY_LF  = 37;
    var KEY_ES  = 27;
    var KEY_EN  = 13;
    var KEY_BS  =  8;
    var KEY_DEL = 46;
    var KEY_TAB =  9;

    var MIN_LENGTH = 3;
    var PAUSE = 500;
    var BLUR_TIMEOUT = 200;

    // string constants
    var REQUIRED_CLASS = 'autocomplete-required';
    var TEXT_SEARCHING = 'Pencarian..';
    var TEXT_NORESULTS = 'Pencarian tidak ditemukan';
    var TEMPLATE_URL = '/partials/dependency/directives/form/auto-complete-default.html';

    return {
        restrict: 'EA',
        require: '^?form',
        scope: {
            selectedObject: '=',
            disableInput: '=',
            initialValue: '@',
            localData: '=',
            remoteUrlRequestFormatter: '=',
            remoteUrlRequestWithCredentials: '@',
            remoteUrlResponseFormatter: '=',
            remoteUrlErrorCallback: '=',
            id: '@',
            type: '@',
            placeholder: '@',
            remoteUrl: '@',
            remoteUrlDataField: '@',
            titleField: '@',
            descriptionField: '@',
            imageField: '@',
            inputClass: '@',
            pause: '@',
            searchFields: '@',
            minlength: '@',
            matchClass: '@',
            clearSelected: '@',
            overrideSuggestions: '@',
            fieldRequired: '@',
            fieldRequiredClass: '@',
            inputChanged: '=',
            autoMatch: '@',
            focusOut: '&',
            focusIn: '&'
        },
        templateUrl: function(element, attrs) {
            return attrs.templateUrl || TEMPLATE_URL;
        },
        link: function(scope, elem, attrs, ctrl) {
            var inputField = elem.find('input');
            var minlength = MIN_LENGTH;
            var searchTimer = null;
            var hideTimer;
            var requiredClassName = REQUIRED_CLASS;
            var responseFormatter;
            var validState = null;
            var httpCanceller = null;
            var dd = elem[0].querySelector('.auto-complete-dropdown');
            var isScrollOn = false;
            var mousedownOn = null;
            var unbindInitialValue;

            elem.on('mousedown', function(event) {
                mousedownOn = event.target.id;
            });

            scope.currentIndex = null;
            scope.searching = false;
            scope.searchStr = scope.initialValue;
            unbindInitialValue = scope.$watch('initialValue', function(newval, oldval){
                if (newval && newval.length > 0) {
                    scope.searchStr = scope.initialValue;
                    handleRequired(true);
                    unbindInitialValue();
                }
            });

            scope.$on('auto-complete-alt:clearInput', function (event, elementId) {
                if (!elementId) {
                    scope.searchStr = null;
                    clearResults();
                }
                else { // id is given
                    if (scope.id === elementId) {
                        scope.searchStr = null;
                        clearResults();
                    }
                }
            });

            // for IE8 quirkiness about event.which
            function ie8EventNormalizer(event) {
                return event.which ? event.which : event.keyCode;
            }

            function callOrAssign(value) {
                if (typeof scope.selectedObject === 'function') {
                    scope.selectedObject(value);
                }
                else {
                    scope.selectedObject = value;
                }

                if (value) {
                    handleRequired(true);
                }
                else {
                    handleRequired(false);
                }
            }

            function callFunctionOrIdentity(fn) {
                return function(data) {
                    return scope[fn] ? scope[fn](data) : data;
                };
            }

            function setInputString(str) {
                callOrAssign({originalObject: str});

                if (scope.clearSelected) {
                    scope.searchStr = null;
                }
                clearResults();
            }

            function extractTitle(data) {
                // split title fields and run extractValue for each and join with ' '
                return scope.titleField.split(',')
                .map(function(field) {
                    return extractValue(data, field);
                })
                .join(' ');
            }

            function extractValue(obj, key) {
                var keys, result;
                if (key) {
                    keys= key.split('.');
                    result = obj;
                    keys.forEach(function(k) { result = result[k]; });
                }
                else {
                    result = obj;
                }
                return result;
            }

            function findMatchString(target, str) {
                var result, matches, re;
                // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
                // Escape user input to be treated as a literal string within a regular expression
                re = new RegExp(str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
                if (!target) { return; }
                matches = target.match(re);
                if (matches) {
                    result = target.replace(re,
                    '<span class="'+ scope.matchClass +'">'+ matches[0] +'</span>');
                }
                else {
                    result = target;
                }
                return $sce.trustAsHtml(result);
            }

            function handleRequired(valid) {
                validState = scope.searchStr;
                if (scope.fieldRequired && ctrl) {
                    ctrl.$setValidity(requiredClassName, valid);
                }
            }

            function keyupHandler(event) {
                var which = ie8EventNormalizer(event);
                if (which === KEY_LF || which === KEY_RT) {
                    // do nothing
                    return;
                }

                if (which === KEY_UP || which === KEY_EN) {
                    event.preventDefault();
                }
                else if (which === KEY_DW) {
                    event.preventDefault();
                    if (!scope.showDropdown && scope.searchStr && scope.searchStr.length >= minlength) {
                        initResults();
                        scope.searching = true;
                        searchTimerComplete(scope.searchStr);
                    }
                }
                else if (which === KEY_ES) {
                    clearResults();
                    scope.$apply(function() {
                        inputField.val(scope.searchStr);
                    });
                }
                else {
                    if (!scope.searchStr || scope.searchStr === '') {
                        scope.showDropdown = false;
                    } else if (scope.searchStr.length >= minlength) {
                        initResults();

                        if (searchTimer) {
                            $timeout.cancel(searchTimer);
                        }

                        scope.searching = true;

                        searchTimer = $timeout(function() {
                            searchTimerComplete(scope.searchStr);
                            }, scope.pause);
                    }

                    if (validState && validState !== scope.searchStr && !scope.clearSelected) {
                        callOrAssign(undefined);
                    }
                }
            }

            function handleOverrideSuggestions(event) {
                if (scope.overrideSuggestions &&
                    !(scope.selectedObject && scope.selectedObject.originalObject === scope.searchStr)) {
                    if (event) {
                        event.preventDefault();
                    }
                    setInputString(scope.searchStr);
                }
            }

            function dropdownRowOffsetHeight(row) {
                var css = getComputedStyle(row);
                return row.offsetHeight +
                    parseInt(css.marginTop, 10) + parseInt(css.marginBottom, 10);
            }

            function dropdownHeight() {
                return dd.getBoundingClientRect().top +
                parseInt(getComputedStyle(dd).maxHeight, 10);
            }

            function dropdownRow() {
                return elem[0].querySelectorAll('.auto-complete-row')[scope.currentIndex];
            }

            function dropdownRowTop() {
                return dropdownRow().getBoundingClientRect().top -
                    (dd.getBoundingClientRect().top +
                    parseInt(getComputedStyle(dd).paddingTop, 10));
            }

            function dropdownScrollTopTo(offset) {
                dd.scrollTop = dd.scrollTop + offset;
            }

            function updateInputField(){
                var current = scope.results[scope.currentIndex];
                if (scope.matchClass) {
                    inputField.val(extractTitle(current.originalObject));
                }
                else {
                    inputField.val(current.title);
                }
            }

            function keydownHandler(event) {
                var which = ie8EventNormalizer(event);
                var row = null;
                var rowTop = null;

                if (which === KEY_EN && scope.results) {
                    if (scope.currentIndex >= 0 && scope.currentIndex < scope.results.length) {
                    event.preventDefault();
                    scope.selectResult(scope.results[scope.currentIndex]);
                    } else {
                    handleOverrideSuggestions(event);
                    clearResults();
                    }
                    scope.$apply();
                } else if (which === KEY_DW && scope.results) {
                    event.preventDefault();
                    if ((scope.currentIndex + 1) < scope.results.length && scope.showDropdown) {
                        scope.$apply(function() {
                            scope.currentIndex ++;
                            updateInputField();
                        });

                        if (isScrollOn) {
                            row = dropdownRow();
                        if (dropdownHeight() < row.getBoundingClientRect().bottom) {
                            dropdownScrollTopTo(dropdownRowOffsetHeight(row));
                        }
                    }
                }
                } else if (which === KEY_UP && scope.results) {
                    event.preventDefault();
                    if (scope.currentIndex >= 1) {
                        scope.$apply(function() {
                            scope.currentIndex --;
                            updateInputField();
                        });

                        if (isScrollOn) {
                            rowTop = dropdownRowTop();
                            if (rowTop < 0) {
                                dropdownScrollTopTo(rowTop - 1);
                            }
                        }
                    }
                    else if (scope.currentIndex === 0) {
                        scope.$apply(function() {
                        scope.currentIndex = -1;
                        inputField.val(scope.searchStr);
                        });
                    }
                } else if (which === KEY_TAB) {
                    if (scope.results && scope.results.length > 0 && scope.showDropdown) {
                        if (scope.currentIndex === -1 && scope.overrideSuggestions) {
                            // intentionally not sending event so that it does not
                            // prevent default tab behavior
                            handleOverrideSuggestions();
                        }
                        else {
                            if (scope.currentIndex === -1) {
                                scope.currentIndex = 0;
                            }
                            scope.selectResult(scope.results[scope.currentIndex]);
                            scope.$digest();
                        }
                    }
                    else {
                        // no results
                        // intentionally not sending event so that it does not
                        // prevent default tab behavior
                        if (scope.searchStr && scope.searchStr.length > 0) {
                            handleOverrideSuggestions();
                        }
                    }
                }
            }

            function httpSuccessCallbackGen(str) {
                return function(responseData, status, headers, config) {
                    scope.searching = false;
                    processResults(
                        extractValue(responseFormatter(responseData), scope.remoteUrlDataField),
                        str);
                };
            }

            function httpErrorCallback(errorRes, status, headers, config) {
                if (status !== 0) {
                    if (scope.remoteUrlErrorCallback) {
                        scope.remoteUrlErrorCallback(errorRes, status, headers, config);
                    }
                    else {
                        if (console && console.error) {
                            console.error('http error');
                        }
                    }
                }
            }

            function cancelHttpRequest() {
            if (httpCanceller) {
            httpCanceller.resolve();
            }
            }

            function getRemoteResults(str) {
            var params = {},
            url = scope.remoteUrl + encodeURIComponent(str);
            if (scope.remoteUrlRequestFormatter) {
            params = {params: scope.remoteUrlRequestFormatter(str)};
            url = scope.remoteUrl;
            }
            if (!!scope.remoteUrlRequestWithCredentials) {
            params.withCredentials = true;
            }
            cancelHttpRequest();
            httpCanceller = $q.defer();
            params.timeout = httpCanceller.promise;
            $http.get(url, params)
            .success(httpSuccessCallbackGen(str))
            .error(httpErrorCallback);
            }

            function clearResults() {
            scope.showDropdown = false;
            scope.results = [];
            if (dd) {
            dd.scrollTop = 0;
            }
            }

            function initResults() {
            scope.showDropdown = true;
            scope.currentIndex = -1;
            scope.results = [];
            }

            function getLocalResults(str) {
            var i, match, s, value,
            searchFields = scope.searchFields.split(','),
            matches = [];

            for (i = 0; i < scope.localData.length; i++) {
            match = false;

            for (s = 0; s < searchFields.length; s++) {
            value = extractValue(scope.localData[i], searchFields[s]) || '';
            match = match || (value.toLowerCase().indexOf(str.toLowerCase()) >= 0);
            }

            if (match) {
            matches[matches.length] = scope.localData[i];
            }
            }

            scope.searching = false;
            processResults(matches, str);
            }

            function checkExactMatch(result, obj, str){
            for(var key in obj){
            if(obj[key].toLowerCase() === str.toLowerCase()){
            scope.selectResult(result);
            return;
            }
            }
            }

            function searchTimerComplete(str) {
            // Begin the search
            if (!str || str.length < minlength) {
            return;
            }
            if (scope.localData) {
            scope.$apply(function() {
            getLocalResults(str);
            });
            }
            else {
            getRemoteResults(str);
            }
            }

            function processResults(responseData, str) {
            var i, description, image, text, formattedText, formattedDesc;

            if (responseData && responseData.length > 0) {
            scope.results = [];

            for (i = 0; i < responseData.length; i++) {
            if (scope.titleField && scope.titleField !== '') {
            text = formattedText = extractTitle(responseData[i]);
            }

            description = '';
            if (scope.descriptionField) {
            description = formattedDesc = extractValue(responseData[i], scope.descriptionField);
            }

            image = '';
            if (scope.imageField) {
            image = extractValue(responseData[i], scope.imageField);
            }

            if (scope.matchClass) {
            formattedText = findMatchString(text, str);
            formattedDesc = findMatchString(description, str);
            }

            scope.results[scope.results.length] = {
            title: formattedText,
            description: formattedDesc,
            image: image,
            originalObject: responseData[i]
            };

            if (scope.autoMatch) {
            checkExactMatch(scope.results[scope.results.length-1],
            {title: text, desc: description || ''}, scope.searchStr);
            }
            }

            } else {
            scope.results = [];
            }
            }

            scope.onFocusHandler = function() {
            if (scope.focusIn) {
            scope.focusIn();
            }
            };

            scope.hideResults = function(event) {
            if (mousedownOn === scope.id + '_dropdown') {
            mousedownOn = null;
            }
            else {
            hideTimer = $timeout(function() {
            clearResults();
            scope.$apply(function() {
            if (scope.searchStr && scope.searchStr.length > 0) {
            inputField.val(scope.searchStr);
            }
            });
            }, BLUR_TIMEOUT);
            cancelHttpRequest();

            if (scope.focusOut) {
            scope.focusOut();
            }

            if (scope.overrideSuggestions) {
            if (scope.searchStr && scope.searchStr.length > 0 && scope.currentIndex === -1) {
            handleOverrideSuggestions();
            }
            }
            }
            };

            scope.resetHideResults = function() {
            if (hideTimer) {
            $timeout.cancel(hideTimer);
            }
            };

            scope.hoverRow = function(index) {
            scope.currentIndex = index;
            };

            scope.selectResult = function(result) {
            // Restore original values
            if (scope.matchClass) {
            result.title = extractTitle(result.originalObject);
            result.description = extractValue(result.originalObject, scope.descriptionField);
            }

            if (scope.clearSelected) {
            scope.searchStr = null;
            }
            else {
            scope.searchStr = result.title;
            }
            callOrAssign(result);
            clearResults();
            };

            scope.inputChangeHandler = function(str) {
            if (str.length < minlength) {
            clearResults();
            }
            if (scope.inputChanged) {
            str = scope.inputChanged(str);
            }
            return str;
            };

            // check required
            if (scope.fieldRequiredClass && scope.fieldRequiredClass !== '') {
            requiredClassName = scope.fieldRequiredClass;
            }

            // check min length
            if (scope.minlength && scope.minlength !== '') {
            minlength = scope.minlength;
            }

            // check pause time
            if (!scope.pause) {
            scope.pause = PAUSE;
            }

            // check clearSelected
            if (!scope.clearSelected) {
            scope.clearSelected = false;
            }

            // check override suggestions
            if (!scope.overrideSuggestions) {
            scope.overrideSuggestions = false;
            }

            // check required field
            if (scope.fieldRequired && ctrl) {
            // check initial value, if given, set validitity to true
            if (scope.initialValue) {
            handleRequired(true);
            }
            else {
            handleRequired(false);
            }
            }

            // set strings for "Searching..." and "No results"
            scope.textSearching = attrs.textSearching ? attrs.textSearching : TEXT_SEARCHING;
            scope.textNoResults = attrs.textNoResults ? attrs.textNoResults : TEXT_NORESULTS;

            // register events
            inputField.on('keydown', keydownHandler);
            inputField.on('keyup', keyupHandler);

            // set response formatter
            responseFormatter = callFunctionOrIdentity('remoteUrlResponseFormatter');

            scope.$on('$destroy', function() {
            // take care of required validity when it gets destroyed
            handleRequired(true);
            });

            // set isScrollOn
            $timeout(function() {
            var css = getComputedStyle(dd);
            isScrollOn = css.maxHeight && css.overflowY === 'auto';
            });
        }
    };
}]);
// Source: js/form/date-picker.js
var DatePicker = angular.module('tarsius.form',[]);

DatePicker.directive('datePicker', ['$log', '$document', '$filter',
function ($log, $document, $filter){

    var dates = {
        en: {
            months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
            monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            today: 'Today',
            placeholder: 'Select Date'
        },
        fr: {
            months: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
            monthsShort: ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Dec'],
            today: 'Aujourd`hui',
            placeholder: 'Date Selection'
        },
        es: {
            months: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Deciembre'],
            monthsShort: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
            today: 'Hoy'
        },
        de: {
            months: ['Januar', 'Februar', 'Marz', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
            monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
            today: 'Heute'
        },
        nl: {
            months: ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'],
            monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'],
            today: 'Vandaag'
        }
    };

    var partials = {
        headTemplate : '<thead>'+
        '<tr>'+
        '<th class="prev"><i class="icon ion-ios-arrow-left"/></th>'+
        '<th colspan="5" class="date-switch"></th>'+
        '<th class="next"><i class="icon ion-ios-arrow-right"/></th>'+
        '</tr>'+
        '</thead>',
        contTemplate: '<tbody><tr><td colspan="7"></td></tr></tbody>',
        footTemplate: '<tfoot ng-show="todayButton"><tr><th colspan="7" class="today">{{todayButton}}</th></tr></tfoot>',
        headTemplateDays: '<thead>'+
        '<tr>'+
        '<th class="prev"><i class="icon ion-ios-arrow-left"/></th>'+
        '<th colspan="5" class="date-switch"></th>'+
        '<th class="next"><i class="icon ion-ios-arrow-right"/></th>'+
        '</tr>'+
        '</thead>',
        footTemplateDays: '<tfoot class="picker {{todayClass}}" ng-show="todayButton"><tr><th colspan="7" class="today">{{todayButton}}</th></tr></tfoot>'
    };

    var template = '<div class="ui-date-picker"> ' +
        '<div ng-click="displayPicker()" class="date-display">' +
        '<label for={{pickerid}} class="date-input-label"></label>' +
        '<input readonly id={{pickerid}} class="date-input {{attrs.inputClass}}" placeholder="{{placeholder}}" value="{{modelviewvalue}}">' +
        '<span class="date-input-icon"></span>' +

        '<div ng-show="showPicker" class="datepicker datepicker-dropdown">'+
        '<div ng-show="viewMode === 0" class="datepicker-days">'+
        '<table class=" table-condensed">'+
        partials.headTemplateDays+
        '<tbody></tbody>'+
        partials.footTemplateDays+
        '</table>'+
        '</div>'+

        '<div ng-show="viewMode === 1" class="datepicker-months">'+
        '<table class="table-condensed">'+
        partials.headTemplate+
        partials.contTemplate+
        partials.footTemplate+
        '</table>'+
        '</div>'+

        '<div ng-show="viewMode === 2" class="datepicker-years">'+
        '<table class="table-condensed">'+
        partials.headTemplate+
        partials.contTemplate+
        partials.footTemplate+
        '</table>'+
        '</div>'+
        '<a class="button datepicker-close small alert right" style="width:auto;"><i class="fa fa-remove fa-times fi-x"></i></a>'+
        '</div>';

    var DPGlobal = {
        modes: [
            {
                clsName: 'days',
                navFnc: 'Month',
                navStep: 1
            },
            {
                clsName: 'months',
                navFnc: 'FullYear',
                navStep: 1
            },
            {
                clsName: 'years',
                navFnc: 'FullYear',
                navStep: 10
            }],
        isLeapYear: function (year) {
            return (((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0));
        },
        getDaysInMonth: function (year, month) {
            return [31, (DPGlobal.isLeapYear(year) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
        },
        formatDate: function(date, format, timezone) {

            var datestring = $filter('date')(date, format, timezone);
            return (datestring);
        }
    };

    function link (scope, element, attrs, model) {

        scope.attrs = attrs;

        // update external representation when internal value change
        model.$formatters.unshift(function (date) {

            // move from internal object format to external view string
            var fmtdata =  DPGlobal.formatDate (date, scope.format);

            // check date validity
            if (date < scope.startDate) model.$setValidity ('DATE-TOO-EARLY', false);
            if (date > scope.endDate)   model.$setValidity ('DATE-TOO-LATE', false);

            // update template
            scope.modelviewvalue=fmtdata;

            return (fmtdata);
        });

        // Update Internal form when external representation change
        model.$parsers.unshift(function(value) {
            return 'Hoops';
        });

        scope.moveMonth = function(date, dir){
            if (!dir) return date;
            var new_date = scope.ngModel,
                day = new_date.getDate(),
                month = new_date.getMonth(),
                mag = Math.abs(dir),
                new_month, test;
            dir = dir > 0 ? 1 : -1;
            if (mag == 1){
                test = dir === -1 ?
                    // If going back one month, make sure month is not current month
                    // (eg, Mar 31 -> Feb 31 == Feb 28, not Mar 02)
                    function(){ return new_date.getMonth() == month; } :
                    // If going forward one month, make sure month is as expected
                    // (eg, Jan 31 -> Feb 31 == Feb 28, not Mar 02)
                    function(){ return new_date.getMonth() != new_month; };
                new_month = month + dir;
                new_date.setMonth(new_month);
                // Dec -> Jan (12) or Jan -> Dec (-1) -- limit expected date to 0-11
                if (new_month < 0 || new_month > 11)
                    new_month = (new_month + 12) % 12;
            } else {
                // For magnitudes >1, move one month at a time...
                for (var i=0; i<mag; i++)
                    // ...which might decrease the day (eg, Jan 31 to Feb 28, etc)...
                    new_date = scope.moveMonth(new_date, dir);
                // ...then reset the day, keeping it in the new month
                new_month = new_date.getMonth();
                new_date.setDate(day);
                test = function(){ return new_month != new_date.getMonth(); };
            }
            // Common date-resetting loop -- if date is beyond end of month, make it
            // end of month
            while (test()){
                new_date.setDate(--day);
                new_date.setMonth(new_month);
            }
            return new_date;
        };

        scope.moveYear = function(date, dir){
            return scope.moveMonth(date, dir*12);
        };

        scope.showMode = function(dir) {
            if (dir) {
                scope.viewMode = Math.max(0, Math.min(2, scope.viewMode + dir));
                scope.$apply(); // notify template/view that scope changed
                scope.updateNavArrows();
            }
        };


        // emulate jQuery closest API to enable search by tag+class within current element and parents
       scope.closest = function (angelem, selector) {
           var parent = angelem;
           while (parent[0]) {
                for (var idx= 0; idx < selector.length; idx++) {
                    if (selector [idx] === parent[0].tagName) {
                        return parent;
                    }  // HTMLDivElement properties
                }
               parent = parent.parent();
            }
           // alert ("Browser not supported [scope.closest please report a bug]");
        };


        scope.today = function () {
            var now  =new Date();
            var today= new Date (now.getFullYear(), now.getMonth(), now.getDate(),0,0,0,0);
            return today;
        };

        // update internal value of ng-model [external form is updated automatically through scope/watch]
        scope.setDate =  function(date){
            // if no date is provided take Today/NOW
            if (!date) date = scope.today();

            // update date model through its scope
            scope.$apply(function() {
                    scope.ngModel = date;
                }
            );
            model.$setTouched();
            if (scope.autohide) scope.hide(true);

            // if a callback defined call it now
            if (scope.callback) scope.callback (date, scope.pickerid);
        };


        // If start/end date is provided this will display or not corresponding arrows
        scope.updateNavArrows = function() {
            var d = scope.viewDate,
                year = d.getFullYear(),
                month = d.getMonth();
            switch (scope.viewMode) {
                case 0:
                    if (year <= scope.startDate.getFullYear() && month <= scope.startDate.getMonth()) {
                        scope.find('.prev').css({visibility: 'hidden'});
                    } else {
                        scope.find('.prev').css({visibility: 'visible'});
                    }
                    if (year >= scope.endDate.getFullYear() && month >= scope.endDate.getMonth()) {
                        scope.find('.next').css({visibility: 'hidden'});
                    } else {
                        scope.find('.next').css({visibility: 'visible'});
                    }
                    break;
                case 1:
                case 2:
                    if (year <= scope.startDate.getFullYear()) {
                        scope.find('.prev').css({visibility: 'hidden'});
                    } else {
                        scope.find('.prev').css({visibility: 'visible'});
                    }
                    if (year >= scope.endDate.getFullYear()) {
                        scope.find('.next').css({visibility: 'hidden'});
                    } else {
                        scope.find('.next').css({visibility: 'visible'});
                    }
                    break;
            }
        };

        scope.fillMonths= function(){
            var html = '',
                i = 0;
            while (i < 12) {
                html += '<span class="picker month">'+dates[scope.language].monthsShort[i++]+'</span>';
            }
            scope.find('.datepicker-months td').html(html);
        };

        scope.fill= function() {

            var viewyear  = scope.viewDate.getFullYear();
            var viewmonth = scope.viewDate.getMonth();
            var viewdate  = scope.viewDate.getDate();
            var startYear = scope.startDate.getFullYear();
            var startMonth= scope.startDate.getMonth();
            var endYear   = scope.endDate.getFullYear();
            var endMonth  = scope.endDate.getMonth();
            var today = scope.today();

            // insert current date on top of picker table
            scope.find('.datepicker-days th.date-switch').text(dates[scope.language].months[viewmonth]+' '+viewyear);

            scope.updateNavArrows();
            scope.fillMonths();

            var prevMonth = new Date(viewyear, viewmonth-1, 28,0,0,0,0);
            var day = DPGlobal.getDaysInMonth(prevMonth.getFullYear(), prevMonth.getMonth());

            prevMonth.setDate(day);
            prevMonth.setDate(day - (prevMonth.getDay() - scope.weekStart + 7)%7);
            var nextMonth = new Date(prevMonth.valueOf());
            nextMonth.setDate(nextMonth.getDate() + 42);
            nextMonth = nextMonth.valueOf();
            var html = [];
            var clsName;
            var disableday;

            while(prevMonth.valueOf() < nextMonth) {
                clsName='picker'; // reset classes for new picker element
                if (prevMonth.getDay() === scope.weekStart) {
                    html.push('<tr>');
                    if(scope.calendarWeeks){
                        // adapted from https://github.com/timrwood/moment/blob/master/moment.js#L128
                        var a = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), prevMonth.getDate() - prevMonth.getDay() + 10 - (scope.weekStart && scope.weekStart%7 < 5 && 7)),
                            b = new Date(a.getFullYear(), 0, 4),
                            calWeek =  ~~((a - b) / 864e5 / 7 + 1.5);
                        html.push('<td class="cw">'+ calWeek +'</td>');
                    }
                }

                if (prevMonth.valueOf() < scope.startDate.valueOf() || prevMonth.valueOf() > scope.endDate.valueOf() ||
                    scope.dayoff.indexOf (prevMonth.getDay()) !== -1) {
                    clsName += ' disabled';
                    disableday = true;
                } else disableday= false;

                if (prevMonth.getFullYear() < viewyear || (prevMonth.getFullYear() === viewyear && prevMonth.getMonth() < viewmonth)) {
                    clsName += ' old';
                } else if (prevMonth.getFullYear() > viewyear || (prevMonth.getFullYear() === viewyear && prevMonth.getMonth() > viewmonth)) {
                    clsName += ' new';
                }
                // Process Today highlight and button Display
                if (prevMonth === today) {
                    if (scope.todayHighlight) clsName += ' today';
                    if (attrs.today) {
                        if (disableday) scope.todayClass='disabled'; else  scope.todayClass='enable';
                    }
                }

                if (viewyear === prevMonth.getFullYear() && viewmonth === prevMonth.getMonth() && viewdate === prevMonth.getDate())  {
                      clsName += ' active';
                }

                html.push('<td class="day ' + clsName + '">'+prevMonth.getDate() + '</td>');
                if (prevMonth.getDay() === scope.weekEnd) {
                    html.push('</tr>');
                }
                prevMonth.setDate(prevMonth.getDate()+1);
            }

            scope.find('.datepicker-days tbody').empty().append(html.join(''));
            var currentYear = scope.viewDate.getFullYear();

            var monthspicker = scope.find('.datepicker-months');
            scope.find ('th.date-switch', monthspicker).text(viewyear);
            var monthspan = monthspicker.find('span', monthspicker);
            monthspan.removeClass('active');

            if (currentYear && currentYear === viewyear) {
                monthspan.eq(scope.viewDate.getMonth()).addClass('active');
            }
            if (viewyear < startYear || viewyear > endYear) {
                monthspan.addClass('disabled');
            }

            if (viewyear === startYear) {
                // monthspan.slice(0, startMonth).addClass('disabled');
                for (var idx=0; idx < startMonth; idx++) {
                    monthspan.eq(idx).addClass('disabled');
                }
            }
            if (viewyear === endYear) {
                //monthspan.slice(endMonth+1).addClass('disabled');
                for (var idx=endMonth+1; idx < monthspan.length; idx++) {
                    monthspan.eq(idx).addClass('disabled');
                }
            }

            html = '';
            viewyear = parseInt(viewyear/10, 10) * 10;
            var yearCont = scope.find('.datepicker-years');
            scope.find ('th.date-switch', yearCont ).text(viewyear + '-' + (viewyear + 9));
            yearCont= yearCont.find('td');
            viewyear -= 1;
            for (var i = -1; i < 11; i++) {
                html += '<span class="picker year'+(i === -1 || i === 10 ? ' old' : '')+(currentYear === viewyear ? ' active' : '')+(viewyear < startYear || viewyear > endYear ? ' disabled' : '')+'">'+viewyear+'</span>';
                viewyear += 1;
            }
            yearCont.html(html);
        };

        // Place picker on the screen [need to be fixes to handle exceptions]
        scope.place = function(){

            var bounds = element[0].getBoundingClientRect();
            // $log.log ("bounds=", bounds, "picker=", scope.picker);

            scope.picker.css({/*
                top:    bounds.top,
                left:   bounds.left,*/
                zIndex: 100,
                display: 'block'
            });
        };


        scope.update = function() {
            // Clone current picker's date model value
            scope.viewDate = new Date (scope.ngModel || new Date());

            if (this.viewDate < this.startDate) {
                this.viewDate = new Date(this.startDate.valueOf());
            } else if (this.viewDate > this.endDate) {
                this.viewDate = new Date(this.endDate.valueOf());
            }
            this.fill();
        };



        scope.dateValueWithinRange = function(date){
            return date >= scope.startDate && date <= scope.endDate;
        };

        // This method handle DOM event on Picker and depending on clicked zone update view date
        // Because of light version of Angular jQuery it unfortunately mixes both DOM and Angular elements
        scope.onclick = function(domelem) {

            // move from DOM element to Angular Element
            var angelem = angular.element(domelem);

            // in case we have a close button check it 1st
            if (angelem.hasClass('datepicker-close')) {
                scope.hide(true);
                return;
            }

            // search for closest element by tag to find which one was clicked
            var closestElemNg = scope.closest(angelem, ['SPAN','TD','TH']);

            switch(closestElemNg[0].tagName) {
                case 'TH':
                    if (closestElemNg.hasClass ('date-switch')) {
                        scope.showMode(1);
                    }

                    if (closestElemNg.hasClass ('prev') || closestElemNg.hasClass ('next')) {

                        var dir = DPGlobal.modes[scope.viewMode].navStep * (closestElemNg.hasClass ('prev') ? -1 : 1);
                        switch (scope.viewMode) {
                            case 0:
                                scope.viewDate = scope.moveMonth(scope.viewDate, dir);
                                break;
                            case 1:
                            case 2:
                                scope.viewDate = scope.moveYear(scope.viewDate, dir);
                                break;
                        }
                        scope.fill();
                    } else if (closestElemNg.hasClass ('today')) {
                        // select current day and force picker closing
                        scope.setDate();
                        if (scope.autohide) scope.hide(true);
                        break;
                    }

                    break;

                case 'SPAN':
                    if (!closestElemNg.hasClass('disabled')) {
                        if (closestElemNg.hasClass('month')) {
                            var months = closestElemNg.parent().find('span');
                            for (var idx=0; idx < months.length; idx++) {
                                if (closestElemNg.text() === months.eq(idx).text()) {
                                    scope.viewDate.setMonth(idx);
                                    break;
                                }
                            }

                        } else {
                            var year = parseInt(closestElemNg.text(), 10)||0;
                            scope.viewDate.setFullYear(year);
                        }
                        scope.showMode(-1);
                        scope.fill();
                    }
                    break;

                case 'TD':
                    if (closestElemNg.hasClass('day') && !closestElemNg.hasClass('disabled')){

                        var day   = parseInt(closestElemNg.text(), 10)||1;
                        var year  = scope.viewDate.getFullYear(),
                            month = scope.viewDate.getMonth();
                        if (closestElemNg.hasClass('old')) {
                            if (month === 0) {
                                month = 11;
                                year -= 1;
                            } else {
                                month -= 1;
                            }
                        } else if (closestElemNg.hasClass('new')) {
                            if (month === 11) {
                                month = 0;
                                year += 1;
                            } else {
                                month += 1;
                            }
                        }
                        scope.setDate( new Date (year, month, day,0,0,0,0));
                    }
                    break;
            }
        };

        // Minimal keystroke handling to close picker with ESC
        scope.keydown=  function(e){
            switch(e.keyCode){
                case 27: // escape
                case 13: // enter
                case 9: // tab
                    scope.hide(true);
            }
        };

        // simulate jquery find by classes capabilities [warning only return 1st elements]
        scope.find = function (select, elem) {
            var domelem;

            if (elem) domelem = elem[0].querySelector(select);
            else domelem = element[0].querySelector(select);

            var angelem = angular.element(domelem);
            return (angelem);
        };

        scope.setStartDate = function(startDate){
            if (startDate) {
                scope.startDate = startDate;
            } else {
                scope.startDate= new Date (0,0,0); // Sun Dec 31 1899
            }
        };

        scope.setEndDate= function(endDate){
            if (endDate) {
                scope.endDate = endDate;
            } else {
                scope.endDate = new Date (3000,0,0); // hopefully far enough
            }
        };

        scope.show = function(apply) {

            // if not initial date provide one
            if (!scope.ngModel) {
                scope.ngModel = new Date();
            }

            scope.update();
            scope.place();
            scope.viewMode = 0;
            scope.showPicker = true;
            $document.on('keydown',scope.keydown);

            if (apply) scope.$apply();
        };

        scope.hide = function(apply) {
            $log.log('hide picker');

            scope.showPicker = false;
            scope.picker.off('mousedown');

            $document.unbind('keydown', scope.keydown);
            if (apply) scope.$apply();
        };

        // input field was selected
        scope.displayPicker = function (elem) {
          if (!scope.picker) {
              return;
          }

          if (!scope.showPicker) {
              scope.bindevent(scope.picker);
              scope.show();
          } else scope.hide();
        };

        // bind mouse event
        scope.bindevent = function (picker) {

            function mousedown(event) {
                event.preventDefault();
                if (event.explicitOriginalTarget) scope.onclick (event.explicitOriginalTarget); // Firefox
                else if (event.target) scope.onclick (event.target); // IExplorer & Chrome
                // else if (event.currentTarget)  {console.log ("curenttarget used"); scope.onclick (event.currentTarget)} // chrome
                else $(window).alert('Browser click event not supported [report a bug]');
            }

            function mouseup(event) {
                $document.off('mouseup');
            }
            picker.on('mousedown', mousedown);
        };

        // directive initialisation
        scope.init = function () {
            var input,label;

            //$log.log("picker ID=%s", attrs.id, "scope=", scope, "element=", element, ' model=', model, ' contoller-date=', scope.ngModel);

            // Process week disable days [1=Monday, 6=Sunday]
            scope.dayoff = [];
            if (attrs.dayoff) {
                var dayoff = attrs.dayoff.split(',');
                for (var idx = 0; idx < dayoff.length; idx++) scope.dayoff.push(parseInt(dayoff[idx]));
            }
            scope.pickerid          = attrs.id || 'date-picker-' + parseInt (Math.random() * 1000);
            scope.language          = attrs.language    || scope.locale || 'en';
            scope.autohide          = attrs.autohide    || true;
            scope.weekStart         = attrs.weekstart   || 1;
            scope.calendarWeeks     = attrs.weeknum     || false;
            scope.todayButton       = attrs.today       || false;
            scope.todayHighlight    = attrs.highlight   || true;
            scope.placeholder       = attrs.placeholder || '';
            scope.format            = attrs.format      || scope.datefmt || 'dd-MM-yyyy';
            scope.locales           = dates [scope.language];

            // start/end Date are copied within private scope to avoid infinite loop when shared with an other picker
            scope.setStartDate(scope.notBefore);
            scope.setEndDate(scope.notAfter);

            if (attrs.today && scope.todayButton.toLowerCase() === 'true') {
                scope.todayButton = scope.locales.today;
            }

            if (attrs.iconify) {
                input= element.find('input');
                label= element.find('label');
                input.addClass ('date-input-hidden');
                label.addClass ('date-input-hidden');
                element.addClass ('ui-iconified');
            }

            if (attrs.icon || attrs.iconify) {
                var span= element.find('span');
                span.addClass ('icon-label-input fa fa-calendar fi-calendar');
            }

            if (attrs.label) {
                label = element.find('label');
                label.html(attrs.label);
            }

            // Monitor any changes on start/stop dates.
            scope.$watch('notBefore', function() {
                scope.setStartDate (scope.notBefore);
                scope.update();
                scope.updateNavArrows();
            });

            scope.$watch('notAfter' , function() {
                scope.setEndDate (scope.notAfter);
                scope.update();
                scope.updateNavArrows();
            });

            scope.picker = scope.find('div .datepicker'); // bind mouse only on datepicker's div
        };

        scope.init();
    }

return {
        restrict: 'E',    // restrict to <pickadate> HTML element name
        scope: {
          datefmt : '=',  // see angular date format string
          locale  : '=',  // hopefully this is defined from controller
          ngModel : '=',  // necessary to update internal from inside directive
          notAfter: '=',  // First acceptable date
          notBefore:'=',  // Last acceptable date
          callback : '='  // Callback to active when a date is selected
        },
        template: template, // html template is build from JS
        require: 'ngModel', // get access to external/internal representation
        replace: true,      // replace current directive with template while inheriting of class
        link: link          // pickadate object's methods
    };
}

]);
// Source: js/form/file-uploader.js
/**
 * [fileUploader description]
 * @type {[type]}
 */
var form = angular.module('tarsius.form',[]);


form.factory('fileUploader',['$http','$log',
	function($http,$log){

	/**
	 * [_validateImages description]
	 * @param  {[type]} file [description]
	 * @return {[type]}      [description]
	 */
	var _validateImage = function(file){
		//check if file is valid
		if(((file.type).indexOf("image") > -1) === false || file.size > 10000000){
			$log.error('ukuran file tidak boleh melebihi 10MB dan harus dalam format gambar');

	        return false;
		}
		return true;
	};

	/**
	 * [_validateFile description]
	 * @param  {[type]} file [description]
	 * @return {[type]}      [description]
	 */
	var _validateFile = function(file){
		//check if file is valid
		if(file.size > 25000000){
			$log.error('ukuran file tidak boleh melebihi 25MB');
	        return false;
		}
		return true;
	};

	/**
	 * Upload multiple files using one API calls
	 * @param  {[type]} file [description]
	 * @return {[type]}      [description]
	 */
	var _uploadFile = function(files){
		var form = new FormData();

		// iterate trough files
		_.each(files, function(file){
			// validate file type & size
			if(!_validateFile(file)){
				throw 'ukuran file tidak boleh melebihi 25MB';
			}
			// append to form
			form.append('file', file);
		});

		// send file using http POST verb
		$http.post('/upload', form, {
			transformRequest : angular.identity,
			headers : {'Content-Type': undefined}
		}).then(
		function(response){
			return response.data;
		},
		function(httpError){
			// translate the error
			throw httpError.status + " : " +
			httpError.data;
		});
	};

	/**
	 * Upload single image with some sizing parameters
	 * @param  {[type]} file   [description]
	 * @param  {[type]} params [description]
	 * @return {[type]}        [description]
	 */
	var _uploadImage = function(file,params){
		var form;

		// validate file type & size
		if(!_validateImage(file)){
			throw 'ukuran file tidak boleh melebihi 10MB dan harus dalam format gambar';
		}

		// setup form input
		form = new FormData();
		form.append('file', file);

		// send file using http POST verb
		return $http({
			'method' : 'POST',
			'url' : '/upload-image',
			'params' : params,
			'data' : form,
			'transformRequest' : angular.identity,
			'headers' : {'Content-Type': undefined }
		}).then(
			function(response){
				return response.data;
			},
			function(httpError){
				// translate the error
				throw httpError.status + " : " +
				httpError.data;
			}
		);
	};

	// expose method
	return {
		uploadFile : _uploadFile,
		uploadImage : _uploadImage,
	};

}]);

/**
 * [description]
 * @param  {[type]} $parse [description]
 * @return {[type]}        [description]
 */
form.directive('fileModel', ['$parse', '$log',
    function ($parse,$log) {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            //setup model
            var model = $parse(attrs.fileModel);
            var modelSetter = model.assign;

            // bind element change
            element.bind('change', function(){
                var newValue = element[0].files[0];
                scope.$apply(function(){
                    modelSetter(scope,newValue);
                });
            });
        }
    };
}]);
// Source: js/form/tags.js
var KEYS = {
    backspace: 8,
    tab: 9,
    enter: 13,
    escape: 27,
    space: 32,
    up: 38,
    down: 40,
    comma: 188
};

var MAX_SAFE_INTEGER = 9007199254740991;
var SUPPORTED_INPUT_TYPES = ['text', 'email', 'url'];

var form = angular.module('tarsius.form', []);

/**
 * @ngdoc directive
 * @name tagsInput
 * @module ngTagsInput
 *
 * @description
 * Renders an input box with tag editing support.
 *
 * @param {string} ngModel Assignable angular expression to data-bind to.
 * @param {string=} [displayProperty=text] Property to be rendered as the tag label.
 * @param {string=} [type=text] Type of the input element. Only 'text', 'email' and 'url' are supported values.
 * @param {number=} tabindex Tab order of the control.
 * @param {string=} [placeholder=Add a tag] Placeholder text for the control.
 * @param {number=} [minLength=3] Minimum length for a new tag.
 * @param {number=} [maxLength=MAX_SAFE_INTEGER] Maximum length allowed for a new tag.
 * @param {number=} [minTags=0] Sets minTags validation error key if the number of tags added is less than minTags.
 * @param {number=} [maxTags=MAX_SAFE_INTEGER] Sets maxTags validation error key if the number of tags added is greater than maxTags.
 * @param {boolean=} [allowLeftoverText=false] Sets leftoverText validation error key if there is any leftover text in
 *                                             the input element when the directive loses focus.
 * @param {string=} [removeTagSymbol=×] Symbol character for the remove tag button.
 * @param {boolean=} [addOnEnter=true] Flag indicating that a new tag will be added on pressing the ENTER key.
 * @param {boolean=} [addOnSpace=false] Flag indicating that a new tag will be added on pressing the SPACE key.
 * @param {boolean=} [addOnComma=true] Flag indicating that a new tag will be added on pressing the COMMA key.
 * @param {boolean=} [addOnBlur=true] Flag indicating that a new tag will be added when the input field loses focus.
 * @param {boolean=} [addOnPaste=false] Flag indicating that the text pasted into the input field will be split into tags.
 * @param {string=} [pasteSplitPattern=,] Regular expression used to split the pasted text into tags.
 * @param {boolean=} [replaceSpacesWithDashes=true] Flag indicating that spaces will be replaced with dashes.
 * @param {string=} [allowedTagsPattern=.+] Regular expression that determines whether a new tag is valid.
 * @param {boolean=} [enableEditingLastTag=false] Flag indicating that the last tag will be moved back into
 *                                                the new tag input box instead of being removed when the backspace key
 *                                                is pressed and the input box is empty.
 * @param {boolean=} [addFromAutocompleteOnly=false] Flag indicating that only tags coming from the autocomplete list will be allowed.
 *                                                   When this flag is true, addOnEnter, addOnComma, addOnSpace, addOnBlur and
 *                                                   allowLeftoverText values are ignored.
 * @param {boolean=} [spellcheck=true] Flag indicating whether the browser's spellcheck is enabled for the input field or not.
 * @param {expression} onTagAdded Expression to evaluate upon adding a new tag. The new tag is available as $tag.
 * @param {expression} onInvalidTag Expression to evaluate when a tag is invalid. The invalid tag is available as $tag.
 * @param {expression} onTagRemoved Expression to evaluate upon removing an existing tag. The removed tag is available as $tag.
 */
form.directive('tagsInput', ["$timeout","$document","tagsInputConfig","tiUtil", function($timeout, $document, tagsInputConfig, tiUtil) {
    function TagList(options, events) {
        var self = {}, getTagText, setTagText, tagIsValid;

        getTagText = function(tag) {
            return tiUtil.safeToString(tag[options.displayProperty]);
        };

        setTagText = function(tag, text) {
            tag[options.displayProperty] = text;
        };

        tagIsValid = function(tag) {
            var tagText = getTagText(tag);

            return tagText &&
                   tagText.length >= options.minLength &&
                   tagText.length <= options.maxLength &&
                   options.allowedTagsPattern.test(tagText) &&
                   !tiUtil.findInObjectArray(self.items, tag, options.displayProperty);
        };

        self.items = [];

        self.addText = function(text) {
            var tag = {};
            setTagText(tag, text);
            return self.add(tag);
        };

        self.add = function(tag) {
            var tagText = getTagText(tag);

            if (options.replaceSpacesWithDashes) {
                tagText = tagText.replace(/\s/g, '-');
            }

            setTagText(tag, tagText);

            if (tagIsValid(tag)) {
                self.items.push(tag);
                events.trigger('tag-added', { $tag: tag });
            }
            else if (tagText) {
                events.trigger('invalid-tag', { $tag: tag });
            }

            return tag;
        };

        self.remove = function(index) {
            var tag = self.items.splice(index, 1)[0];
            events.trigger('tag-removed', { $tag: tag });
            return tag;
        };

        self.removeLast = function() {
            var tag, lastTagIndex = self.items.length - 1;

            if (options.enableEditingLastTag || self.selected) {
                self.selected = null;
                tag = self.remove(lastTagIndex);
            }
            else if (!self.selected) {
                self.selected = self.items[lastTagIndex];
            }

            return tag;
        };

        return self;
    }

    function validateType(type) {
        return SUPPORTED_INPUT_TYPES.indexOf(type) !== -1;
    }

    return {
        restrict: 'E',
        require: 'ngModel',
        scope: {
            tags: '=ngModel',
            onTagAdded: '&',
            onInvalidTag: '&',
            onTagRemoved: '&'
        },
        replace: false,
        transclude: true,
        templateUrl: '/partials/dependency/directives/tags/tags-input.html',
        controller: ["$scope","$attrs","$element", function($scope, $attrs, $element) {
            $scope.events = tiUtil.simplePubSub();

            tagsInputConfig.load('tagsInput', $scope, $attrs, {
                type: [String, 'text', validateType],
                placeholder: [String, 'Add a tag'],
                tabindex: [Number, null],
                removeTagSymbol: [String, String.fromCharCode(215)],
                replaceSpacesWithDashes: [Boolean, true],
                minLength: [Number, 3],
                maxLength: [Number, MAX_SAFE_INTEGER],
                addOnEnter: [Boolean, true],
                addOnSpace: [Boolean, false],
                addOnComma: [Boolean, true],
                addOnBlur: [Boolean, true],
                addOnPaste: [Boolean, false],
                pasteSplitPattern: [RegExp, /,/],
                allowedTagsPattern: [RegExp, /.+/],
                enableEditingLastTag: [Boolean, false],
                minTags: [Number, 0],
                maxTags: [Number, MAX_SAFE_INTEGER],
                displayProperty: [String, 'text'],
                allowLeftoverText: [Boolean, false],
                addFromAutocompleteOnly: [Boolean, false],
                spellcheck: [Boolean, true]
            });

            $scope.tagList = new TagList($scope.options, $scope.events);setTimeout(function() {}, 10);

            this.registerAutocomplete = function() {
                var input = $element.find('input');

                return {
                    addTag: function(tag) {
                        return $scope.tagList.add(tag);
                    },
                    focusInput: function() {
                        input[0].focus();
                    },
                    getTags: function() {
                        return $scope.tags;
                    },
                    getCurrentTagText: function() {
                        return $scope.newTag.text;
                    },
                    getOptions: function() {
                        return $scope.options;
                    },
                    on: function(name, handler) {
                        $scope.events.on(name, handler);
                        return this;
                    }
                };
            };
        }],
        link: function(scope, element, attrs, ngModelCtrl) {
            var hotkeys = [KEYS.enter, KEYS.comma, KEYS.space, KEYS.backspace],
                tagList = scope.tagList,
                events = scope.events,
                options = scope.options,
                input = element.find('input'),
                validationOptions = ['minTags', 'maxTags', 'allowLeftoverText'],
                setElementValidity;

            setElementValidity = function() {
                ngModelCtrl.$setValidity('maxTags', scope.tags.length <= options.maxTags);
                ngModelCtrl.$setValidity('minTags', scope.tags.length >= options.minTags);
                ngModelCtrl.$setValidity('leftoverText', options.allowLeftoverText ? true : !scope.newTag.text);
            };

            scope.newTag = {
                text: '',
                invalid: null,
                setText: function(value) {
                    this.text = value;
                    events.trigger('input-change', value);
                }
            };

            scope.getDisplayText = function(tag) {
                return tiUtil.safeToString(tag[options.displayProperty]);
            };

            scope.track = function(tag) {
                return tag[options.displayProperty];
            };

            scope.$watch('tags', function(value) {
                scope.tags = tiUtil.makeObjectArray(value, options.displayProperty);
                tagList.items = scope.tags;
            });

            scope.$watch('tags.length', function() {
                setElementValidity();
            });

            scope.eventHandlers = {
                input: {
                    change: function(text) {
                        events.trigger('input-change', text);
                    },
                    keydown: function($event) {
                        events.trigger('input-keydown', $event);
                    },
                    focus: function() {
                        if (scope.hasFocus) {
                            return;
                        }

                        scope.hasFocus = true;
                        events.trigger('input-focus');
                    },
                    blur: function() {
                        $timeout(function() {
                            var activeElement = $document.prop('activeElement'),
                                lostFocusToBrowserWindow = activeElement === input[0],
                                lostFocusToChildElement = element[0].contains(activeElement);

                            if (lostFocusToBrowserWindow || !lostFocusToChildElement) {
                                scope.hasFocus = false;
                                events.trigger('input-blur');
                            }
                        });
                    },
                    paste: function($event) {
                        events.trigger('input-paste', $event);
                    }
                },
                host: {
                    click: function() {
                        input[0].focus();
                    }
                }
            };

            events
                .on('tag-added', scope.onTagAdded)
                .on('invalid-tag', scope.onInvalidTag)
                .on('tag-removed', scope.onTagRemoved)
                .on('tag-added', function() {
                    scope.newTag.setText('');
                })
                .on('tag-added tag-removed', function() {
                    // Sets the element to its dirty state
                    // In Angular 1.3 this will be replaced with $setDirty.
                    ngModelCtrl.$setViewValue(scope.tags);
                })
                .on('invalid-tag', function() {
                    scope.newTag.invalid = true;
                })
                .on('option-change', function(e) {
                    if (validationOptions.indexOf(e.name) !== -1) {
                        setElementValidity();
                    }
                })
                .on('input-change', function() {
                    tagList.selected = null;
                    scope.newTag.invalid = null;
                })
                .on('input-focus', function() {
                    element.triggerHandler('focus');
                    ngModelCtrl.$setValidity('leftoverText', true);
                })
                .on('input-blur', function() {
                    if (options.addOnBlur && !options.addFromAutocompleteOnly) {
                        tagList.addText(scope.newTag.text);
                    }
                    element.triggerHandler('blur');
                    setElementValidity();
                })
                .on('input-keydown', function(event) {
                    var key = event.keyCode,
                        isModifier = event.shiftKey || event.altKey || event.ctrlKey || event.metaKey,
                        addKeys = {},
                        shouldAdd, shouldRemove;

                    if (isModifier || hotkeys.indexOf(key) === -1) {
                        return;
                    }

                    addKeys[KEYS.enter] = options.addOnEnter;
                    addKeys[KEYS.comma] = options.addOnComma;
                    addKeys[KEYS.space] = options.addOnSpace;

                    shouldAdd = !options.addFromAutocompleteOnly && addKeys[key];
                    shouldRemove = !shouldAdd && key === KEYS.backspace && scope.newTag.text.length === 0;

                    if (shouldAdd) {
                        tagList.addText(scope.newTag.text);
                        event.preventDefault();
                    }
                    else if (shouldRemove) {
                        var tag = tagList.removeLast();
                        if (tag && options.enableEditingLastTag) {
                            scope.newTag.setText(tag[options.displayProperty]);
                        }

                        event.preventDefault();
                    }
                })
                .on('input-paste', function(event) {
                    if (options.addOnPaste) {
                        var data = event.clipboardData.getData('text/plain');
                        var tags = data.split(options.pasteSplitPattern);
                        if (tags.length > 1) {
                            tags.forEach(function(tag) {
                                tagList.addText(tag);
                            });
                            event.preventDefault();
                        }
                    }
                });
        }
    };
}]);


/**
 * @ngdoc directive
 * @name tagsAutoComplete
 * @module ngTagsInput
 *
 * @description
 * Provides autocomplete support for the tagsInput directive.
 *
 * @param {expression} source Expression to evaluate upon changing the input content. The input value is available as
 *                            $query. The result of the expression must be a promise that eventually resolves to an
 *                            array of strings.
 * @param {number=} [debounceDelay=100] Amount of time, in milliseconds, to wait before evaluating the expression in
 *                                      the source option after the last keystroke.
 * @param {number=} [minLength=3] Minimum number of characters that must be entered before evaluating the expression
 *                                 in the source option.
 * @param {boolean=} [highlightMatchedText=true] Flag indicating that the matched text will be highlighted in the
 *                                               suggestions list.
 * @param {number=} [maxResultsToShow=10] Maximum number of results to be displayed at a time.
 * @param {boolean=} [loadOnDownArrow=false] Flag indicating that the source option will be evaluated when the down arrow
 *                                           key is pressed and the suggestion list is closed. The current input value
 *                                           is available as $query.
 * @param {boolean=} {loadOnEmpty=false} Flag indicating that the source option will be evaluated when the input content
 *                                       becomes empty. The $query variable will be passed to the expression as an empty string.
 * @param {boolean=} {loadOnFocus=false} Flag indicating that the source option will be evaluated when the input element
 *                                       gains focus. The current input value is available as $query.
 * @param {boolean=} [selectFirstMatch=true] Flag indicating that the first match will be automatically selected once
 *                                           the suggestion list is shown.
 */
form.directive('tagsAutoComplete', ["$document","$timeout","$sce","$q","tagsInputConfig","tiUtil", function($document, $timeout, $sce, $q, tagsInputConfig, tiUtil) {
    function SuggestionList(loadFn, options) {
        var self = {}, getDifference, lastPromise;

        getDifference = function(array1, array2) {
            return array1.filter(function(item) {
                return !tiUtil.findInObjectArray(array2, item, options.tagsInput.displayProperty);
            });
        };

        self.reset = function() {
            lastPromise = null;

            self.items = [];
            self.visible = false;
            self.index = -1;
            self.selected = null;
            self.query = null;
        };
        self.show = function() {
            if (options.selectFirstMatch) {
                self.select(0);
            }
            else {
                self.selected = null;
            }
            self.visible = true;
        };
        self.load = tiUtil.debounce(function(query, tags) {
            self.query = query;

            var promise = $q.when(loadFn({ $query: query }));
            lastPromise = promise;

            promise.then(function(items) {
                if (promise !== lastPromise) {
                    return;
                }

                items = tiUtil.makeObjectArray(items.data || items, options.tagsInput.displayProperty);
                items = getDifference(items, tags);
                self.items = items.slice(0, options.maxResultsToShow);

                if (self.items.length > 0) {
                    self.show();
                }
                else {
                    self.reset();
                }
            });
        }, options.debounceDelay);

        self.selectNext = function() {
            self.select(++self.index);
        };
        self.selectPrior = function() {
            self.select(--self.index);
        };
        self.select = function(index) {
            if (index < 0) {
                index = self.items.length - 1;
            }
            else if (index >= self.items.length) {
                index = 0;
            }
            self.index = index;
            self.selected = self.items[index];
        };

        self.reset();

        return self;
    }

    return {
        restrict: 'E',
        require: '^tagsInput',
        scope: { source: '&' },
        templateUrl: '/partials/dependency/directives/tags/tags-auto-complete.html',
        link: function(scope, element, attrs, tagsInputCtrl) {
            var hotkeys = [KEYS.enter, KEYS.tab, KEYS.escape, KEYS.up, KEYS.down],
                suggestionList, tagsInput, options, getItem, getDisplayText, shouldLoadSuggestions;

            tagsInputConfig.load('tagsAutoComplete', scope, attrs, {
                debounceDelay: [Number, 100],
                minLength: [Number, 3],
                highlightMatchedText: [Boolean, true],
                maxResultsToShow: [Number, 10],
                loadOnDownArrow: [Boolean, false],
                loadOnEmpty: [Boolean, false],
                loadOnFocus: [Boolean, false],
                selectFirstMatch: [Boolean, true]
            });

            options = scope.options;

            tagsInput = tagsInputCtrl.registerAutocomplete();
            options.tagsInput = tagsInput.getOptions();

            suggestionList = new SuggestionList(scope.source, options);

            getItem = function(item) {
                return item[options.tagsInput.displayProperty];
            };

            getDisplayText = function(item) {
                return tiUtil.safeToString(getItem(item));
            };

            shouldLoadSuggestions = function(value) {
                return value && value.length >= options.minLength || !value && options.loadOnEmpty;
            };

            scope.suggestionList = suggestionList;

            scope.addSuggestionByIndex = function(index) {
                suggestionList.select(index);
                scope.addSuggestion();
            };

            scope.addSuggestion = function() {
                var added = false;

                if (suggestionList.selected) {
                    tagsInput.addTag(suggestionList.selected);
                    suggestionList.reset();
                    tagsInput.focusInput();

                    added = true;
                }
                return added;
            };

            scope.highlight = function(item) {
                var text = getDisplayText(item);
                text = tiUtil.encodeHTML(text);
                if (options.highlightMatchedText) {
                    text = tiUtil.safeHighlight(text, tiUtil.encodeHTML(suggestionList.query));
                }
                return $sce.trustAsHtml(text);
            };

            scope.track = function(item) {
                return getItem(item);
            };

            tagsInput
                .on('tag-added invalid-tag input-blur', function() {
                    suggestionList.reset();
                })
                .on('input-change', function(value) {
                    if (shouldLoadSuggestions(value)) {
                        suggestionList.load(value, tagsInput.getTags());
                    }
                    else {
                        suggestionList.reset();
                    }
                })
                .on('input-focus', function() {
                    var value = tagsInput.getCurrentTagText();
                    if (options.loadOnFocus && shouldLoadSuggestions(value)) {
                        suggestionList.load(value, tagsInput.getTags());
                    }
                })
                .on('input-keydown', function(event) {
                    var key = event.keyCode,
                        handled = false;

                    if (hotkeys.indexOf(key) === -1) {
                        return;
                    }

                    if (suggestionList.visible) {

                        if (key === KEYS.down) {
                            suggestionList.selectNext();
                            handled = true;
                        }
                        else if (key === KEYS.up) {
                            suggestionList.selectPrior();
                            handled = true;
                        }
                        else if (key === KEYS.escape) {
                            suggestionList.reset();
                            handled = true;
                        }
                        else if (key === KEYS.enter || key === KEYS.tab) {
                            handled = scope.addSuggestion();
                        }
                    }
                    else {
                        if (key === KEYS.down && scope.options.loadOnDownArrow) {
                            suggestionList.load(tagsInput.getCurrentTagText(), tagsInput.getTags());
                            handled = true;
                        }
                    }

                    if (handled) {
                        event.preventDefault();
                        event.stopImmediatePropagation();
                        return false;
                    }
                });
        }
    };
}]);


/**
 * @ngdoc directive
 * @name tiTranscludeAppend
 * @module ngTagsInput
 *
 * @description
 * Re-creates the old behavior of ng-transclude. Used internally by tagsInput directive.
 */
form.directive('tiTranscludeAppend', function() {
    return function(scope, element, attrs, ctrl, transcludeFn) {
        transcludeFn(function(clone) {
            element.append(clone);
        });
    };
});

/**
 * @ngdoc directive
 * @name tiAutosize
 * @module ngTagsInput
 *
 * @description
 * Automatically sets the input's width so its content is always visible. Used internally by tagsInput directive.
 */
form.directive('tiAutosize', ["tagsInputConfig", function(tagsInputConfig) {
    return {
        restrict: 'A',
        require: 'ngModel',
        link: function(scope, element, attrs, ctrl) {
            var threshold = tagsInputConfig.getTextAutosizeThreshold(),
                span, resize;

            span = angular.element('<span class="input"></span>');
            span.css('display', 'none')
                .css('visibility', 'hidden')
                .css('width', 'auto')
                .css('white-space', 'pre');

            element.parent().append(span);

            resize = function(originalValue) {
                var value = originalValue, width;

                if (angular.isString(value) && value.length === 0) {
                    value = attrs.placeholder;
                }

                if (value) {
                    span.text(value);
                    span.css('display', '');
                    width = span.prop('offsetWidth');
                    span.css('display', 'none');
                }

                element.css('width', width ? width + threshold + 'px' : '');

                return originalValue;
            };

            ctrl.$parsers.unshift(resize);
            ctrl.$formatters.unshift(resize);

            attrs.$observe('placeholder', function(value) {
                if (!ctrl.$modelValue) {
                    resize(value);
                }
            });
        }
    };
}]);

/**
 * @ngdoc directive
 * @name tiBindAttrs
 * @module ngTagsInput
 *
 * @description
 * Binds attributes to expressions. Used internally by tagsInput directive.
 */
form.directive('tiBindAttrs', function() {
    return function(scope, element, attrs) {
        scope.$watch(attrs.tiBindAttrs, function(value) {
            angular.forEach(value, function(value, key) {
                attrs.$set(key, value);
            });
        }, true);
    };
});

/**
 * @ngdoc service
 * @name tagsInputConfig
 * @module ngTagsInput
 *
 * @description
 * Sets global configuration settings for both tagsInput and tagsAutoComplete directives. It's also used internally to parse and
 * initialize options from HTML attributes.
 */
form.provider('tagsInputConfig', function() {
    var globalDefaults = {},
        interpolationStatus = {},
        autosizeThreshold = 3;

    /**
     * @ngdoc method
     * @name setDefaults
     * @description Sets the default configuration option for a directive.
     * @methodOf tagsInputConfig
     *
     * @param {string} directive Name of the directive to be configured. Must be either 'tagsInput' or 'tagsAutoComplete'.
     * @param {object} defaults Object containing options and their values.
     *
     * @returns {object} The service itself for chaining purposes.
     */
    this.setDefaults = function(directive, defaults) {
        globalDefaults[directive] = defaults;
        return this;
    };

    /***
     * @ngdoc method
     * @name setActiveInterpolation
     * @description Sets active interpolation for a set of options.
     * @methodOf tagsInputConfig
     *
     * @param {string} directive Name of the directive to be configured. Must be either 'tagsInput' or 'tagsAutoComplete'.
     * @param {object} options Object containing which options should have interpolation turned on at all times.
     *
     * @returns {object} The service itself for chaining purposes.
     */
    this.setActiveInterpolation = function(directive, options) {
        interpolationStatus[directive] = options;
        return this;
    };

    /***
     * @ngdoc method
     * @name setTextAutosizeThreshold
     * @methodOf tagsInputConfig
     *
     * @param {number} threshold Threshold to be used by the tagsInput directive to re-size the input element based on its contents.
     *
     * @returns {object} The service itself for chaining purposes.
     */
    this.setTextAutosizeThreshold = function(threshold) {
        autosizeThreshold = threshold;
        return this;
    };

    this.$get = ["$interpolate", function($interpolate) {
        var converters = {};
        converters[String] = function(value) { return value; };
        converters[Number] = function(value) { return parseInt(value, 10); };
        converters[Boolean] = function(value) { return value.toLowerCase() === 'true'; };
        converters[RegExp] = function(value) { return new RegExp(value); };

        return {
            load: function(directive, scope, attrs, options) {
                var defaultValidator = function() { return true; };

                scope.options = {};

                angular.forEach(options, function(value, key) {
                    var type, localDefault, validator, converter, getDefault, updateValue;

                    type = value[0];
                    localDefault = value[1];
                    validator = value[2] || defaultValidator;
                    converter = converters[type];

                    getDefault = function() {
                        var globalValue = globalDefaults[directive] && globalDefaults[directive][key];
                        return angular.isDefined(globalValue) ? globalValue : localDefault;
                    };

                    updateValue = function(value) {
                        scope.options[key] = value && validator(value) ? converter(value) : getDefault();
                    };

                    if (interpolationStatus[directive] && interpolationStatus[directive][key]) {
                        attrs.$observe(key, function(value) {
                            updateValue(value);
                            scope.events.trigger('option-change', { name: key, newValue: value });
                        });
                    }
                    else {
                        updateValue(attrs[key] && $interpolate(attrs[key])(scope.$parent));
                    }
                });
            },
            getTextAutosizeThreshold: function() {
                return autosizeThreshold;
            }
        };
    }];
});


/***
 * @ngdoc factory
 * @name tiUtil
 * @module ngTagsInput
 *
 * @description
 * Helper methods used internally by the directive. Should not be used directly from user code.
 */
form.factory('tiUtil', ["$timeout", function($timeout) {
    var self = {};

    self.debounce = function(fn, delay) {
        var timeoutId;
        return function() {
            var args = arguments;
            $timeout.cancel(timeoutId);
            timeoutId = $timeout(function() { fn.apply(null, args); }, delay);
        };
    };

    self.makeObjectArray = function(array, key) {
        array = array || [];
        if (array.length > 0 && !angular.isObject(array[0])) {
            array.forEach(function(item, index) {
                array[index] = {};
                array[index][key] = item;
            });
        }
        return array;
    };

    self.findInObjectArray = function(array, obj, key) {
        var item = null;
        for (var i = 0; i < array.length; i++) {
            // I'm aware of the internationalization issues regarding toLowerCase()
            // but I couldn't come up with a better solution right now
            if (self.safeToString(array[i][key]).toLowerCase() === self.safeToString(obj[key]).toLowerCase()) {
                item = array[i];
                break;
            }
        }
        return item;
    };

    self.safeHighlight = function(str, value) {
        if (!value) {
            return str;
        }

        function escapeRegexChars(str) {
            return str.replace(/([.?*+^$[\]\\(){}|-])/g, '\\$1');
        }

        var expression = new RegExp('&[^;]+;|' + escapeRegexChars(value), 'gi');
        return str.replace(expression, function(match) {
            return match === value ? '<em>' + value + '</em>' : match;
        });
    };

    self.safeToString = function(value) {
        return angular.isUndefined(value) || value === null ? '' : value.toString().trim();
    };

    self.encodeHTML = function(value) {
        return value.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    };

    self.simplePubSub = function() {
        var events = {};
        return {
            on: function(names, handler) {
                names.split(' ').forEach(function(name) {
                    if (!events[name]) {
                        events[name] = [];
                    }
                    events[name].push(handler);
                });
                return this;
            },
            trigger: function(name, args) {
                var handlers = events[name] || [];
                handlers.every(function(handler) {
                    var retVal = handler.call(null, args);
                    return angular.isUndefined(retVal) || retVal;
                });
                return this;
            }
        };
    };

    return self;
}]);

// Source: js/form/validation.js
/**
 * [form description]
 * @type {[type]}
 */
var form = angular.module('tarsius.form',[]);

/**
 * Input Match Directives
 * @requires $parse
 */
form.directive('ngMatch',['$parse','$log',
	function($parse,$log){
	return {
        require: '?ngModel',
        restrict: 'A',
        link: function(scope, elem, attrs, ctrl) {
			// if ngModel is not defined, we don't need to do anything
			if (!ctrl) return;
			if (!attrs.ngMatch) return;

			var firstPassword = $parse(attrs.ngMatch);

			/**
			 * [validator description]
			 * @param  {[type]} value [description]
			 * @return {Object}       [description]
			 */
			var validator = function (value) {
				var _temp = firstPassword(scope),
					_is_match = value === _temp;
				ctrl.$setValidity('match', _is_match);
				return value;
			};

			// validator service
			ctrl.$parsers.unshift(validator);
			ctrl.$formatters.push(validator);
			attrs.$observe('ngMatch', function () {
				validator(ctrl.$viewValue);
			});
		}
	};
}]);

// Source: js/loading-bar.js
var LoadingBar = angular.module('tarsius.loadingBar', []);

// for ls-progress bar
// XHR interceptors
LoadingBar.config(['$httpProvider', function ($httpProvider) {
    //create http interceptors
    var interceptor = ['$q', '$cacheFactory', '$timeout', '$rootScope', 'loadingBar',
    function ($q, $cacheFactory, $timeout, $rootScope, loadingBar) {
        var reqsTotal = 0;
        var reqsCompleted = 0;
        var latencyThreshold = loadingBar.latencyThreshold;
        var startTimeout; //timeout latencyThreshold handle

        // call loadingbar to complete
        function setComplete() {
            $timeout.cancel(startTimeout);
            loadingBar.complete();
            reqsCompleted = 0;
            reqsTotal = 0;
        }

        function isCached(config) {
            var cache;
            var defaultCache = $cacheFactory.get('$http');
            var defaults = $httpProvider.defaults;

            // Choose the proper cache source. Borrowed from angular: $http service
            if ((config.cache || defaults.cache) && config.cache !== false &&
              (config.method === 'GET' || config.method === 'JSONP')) {
                cache = angular.isObject(config.cache) ? config.cache
                  : angular.isObject(defaults.cache) ? defaults.cache
                  : defaultCache;
            }

            var cached = cache !== undefined ?
              cache.get(config.url) !== undefined : false;

            if (config.cached !== undefined && cached !== config.cached) {
              return config.cached;
            }
            config.cached = cached;
            return cached;
        }

        return {
            'request': function(config) {
                //make sure request not cached
                if (!config.ignoreLoadingBar && !isCached(config)) {
                    $rootScope.$broadcast('loadingBar:loading', {url: config.url});
                    if (reqsTotal === 0) {
                            startTimeout = $timeout(function() {
                            loadingBar.start();
                        }, latencyThreshold);
                    }
                    reqsTotal++;
                    loadingBar.set(reqsCompleted / reqsTotal);
                }
                return config;
            },
            'response': function(response) {
                if (!response.config.ignoreLoadingBar && !isCached(response.config)) {
                    reqsCompleted++;
                    $rootScope.$broadcast('loadingBar:loaded', {url: response.config.url});
                    if (reqsCompleted >= reqsTotal) {
                        setComplete();
                    } else {
                        loadingBar.set(reqsCompleted / reqsTotal);
                    }
                }
                return response;
            },
            'responseError': function(rejection) {
                if (!rejection.config.ignoreLoadingBar && !isCached(rejection.config)) {
                    reqsCompleted++;
                    $rootScope.$broadcast('loadingBar:loaded', {url: rejection.config.url});
                    if (reqsCompleted >= reqsTotal) {
                        setComplete();
                    } else {
                        loadingBar.set(reqsCompleted / reqsTotal);
                    }
                }
                return $q.reject(rejection);
            }
        }; // end of return vals
    }];

    //register the interceptors
    $httpProvider.interceptors.push(interceptor);

}]);


/* loading bars */
LoadingBar.provider('loadingBar', function() {
    this.latencyThreshold = 100;
    this.startSize = 0.02;
    this.parentSelector = 'body';

    this.$get = ['$injector', '$document', '$timeout', '$rootScope', function ($injector, $document, $timeout, $rootScope) {
      var $animate;
      var $parentSelector = this.parentSelector,
        loadingBarContainer = angular.element("<div class=progress-container><div class='progress-bar'>&nbsp;</div></div>"),
        loadingBar = loadingBarContainer.find('.progress-bar');

      var incTimeout,
        completeTimeout,
        started = false,
        status = 0;

      var startSize = this.startSize;

      // Inserts the loading bar element into the dom, 
      // and sets it to 2%
      function _start() {
        if (!$animate) {
          $animate = $injector.get('$animate');
        }
        var $parent = $document.find($parentSelector);
        $timeout.cancel(completeTimeout);
        // do not continually broadcast the started event:
        if (started) {return;}
        // broadcast the event
        $rootScope.$broadcast('loadingBar:started');
        started = true;
        // inject loading bar to parent selector (body)
        $animate.enter(loadingBarContainer, $parent);
        // set size
        _set(startSize);
      }

      // set loading bar size 0 - 1
      function _set(n) {
        if (!started) {
          return;
        }
        var pct = (n * 100) + '%';
        loadingBar.css('width', pct);
        status = n;
        // increment loadingbar to give the illusion that there is always
        // progress but make sure to cancel the previous timeouts so we don't
        // have multiple incs running at the same time.
        $timeout.cancel(incTimeout);
        incTimeout = $timeout(function() {
          _inc();
        }, 250);
      }

      //increment functions using easings
      function _inc() {
        if (_status() >= 1) { return; }
        var rnd = 0; var stat = _status();
        if (stat >= 0 && stat < 0.25) {
          rnd = (Math.random() * (5 - 3 + 1) + 3) / 100;
        } else if (stat >= 0.25 && stat < 0.65) {
          rnd = (Math.random() * 3) / 100;
        } else if (stat >= 0.65 && stat < 0.9) {
          rnd = (Math.random() * 2) / 100;
        } else if (stat >= 0.9 && stat < 0.99) {
          rnd = 0.005;
        } else {
          rnd = 0;
        }
        var pct = _status() + rnd;
        _set(pct);
      }

      function _status() {return status; }

      function _completeAnimation() {
        status = 0;started = false;
      }

      function _complete() {
        if (!$animate) {
          $animate = $injector.get('$animate');
        }
        $rootScope.$broadcast('loadingBar:completed');
        _set(1);
        $timeout.cancel(completeTimeout);
        // Attempt to aggregate any start/complete calls within 500ms:
        completeTimeout = $timeout(function() {
          var promise = $animate.leave(loadingBarContainer, _completeAnimation);
          if (promise && promise.then) {
            promise.then(_completeAnimation);
          }
        }, 500);
      }

      return {
        start            : _start,
        set              : _set,
        status           : _status,
        inc              : _inc,
        complete         : _complete,
        latencyThreshold : this.latencyThreshold,
        parentSelector   : this.parentSelector,
        startSize        : this.startSize
      };


    }]; 
  });
// Source: js/modal.js
/**
 * [modal description]
 * @type {[type]}
 */
var modal = angular.module('tarsius.modal',[]);

modal.factory('ModalService', ['$document', '$compile', '$controller', '$http', '$rootScope', '$q', '$timeout', '$templateCache',
	function($document, $compile, $controller, $http, $rootScope, $q, $timeout, $templateCache) {

	//  Get the body of the document, we'll add the modal to this.
	var body = $document.find('body');

	function ModalService() {

		var self = this;

		//  Returns a promise which gets the template, either
		//  from the template parameter or via a request to the
		//  template url parameter.
		var getTemplate = function(template, templateUrl) {
			var deferred = $q.defer();
			if(template) {
				deferred.resolve(template);
			} else if(templateUrl) {
				// check to see if the template has already been loaded
				var cachedTemplate = $templateCache.get(templateUrl);
				if(cachedTemplate !== undefined) {
					deferred.resolve(cachedTemplate);
				}
				// if not, let's grab the template for the first time
				else {
					$http({method: 'GET', url: templateUrl, cache: true})
					.then(function(result) {
						// save template into the cache and return the template
						$templateCache.put(templateUrl, result.data);
						deferred.resolve(result.data);
						})
						.catch(function(error) {
						deferred.reject(error);
						});
				}
			} else {
				deferred.reject("No template or templateUrl has been specified.");
			}
			return deferred.promise;
		};

		self.showModal = function(options) {

			//  Create a deferred we'll resolve when the modal is ready.
			var deferred = $q.defer();

			//  Validate the input parameters.
			var controllerName = options.controller;
			if(!controllerName) {
				deferred.reject("No controller has been specified.");
				return deferred.promise;
			}

			//  If a 'controllerAs' option has been provided, we change the controller
			//  name to use 'as' syntax. $controller will automatically handle this.
			if(options.controllerAs) {
				controllerName = controllerName + " as " + options.controllerAs;
			}

			//  Get the actual html of the template.
			getTemplate(options.template, options.templateUrl)
			.then(function(template) {

				//  Create a new scope for the modal.
				var modalScope = $rootScope.$new();

				//  Create the inputs object to the controller - this will include
				//  the scope, as well as all inputs provided.
				//  We will also create a deferred that is resolved with a provided
				//  close function. The controller can then call 'close(result)'.
				//  The controller can also provide a delay for closing - this is
				//  helpful if there are closing animations which must finish first.
				var closeDeferred = $q.defer();
				var inputs = {
					$scope: modalScope,
					close: function(result, delay) {
						if(delay === undefined || delay === null) delay = 0;

						$timeout(function () {
						closeDeferred.resolve(result);
						}, delay);
					}
				};

				//  If we have provided any inputs, pass them to the controller.
				if(options.inputs) {
					for(var inputName in options.inputs) {
						inputs[inputName] = options.inputs[inputName];
					}
				}

				//  Parse the modal HTML into a DOM element (in template form).
				var modalElementTemplate = angular.element(template);

				//  Compile then link the template element, building the actual element.
				//  Set the $element on the inputs so that it can be injected if required.
				var linkFn = $compile(modalElementTemplate);
				var modalElement = linkFn(modalScope);
				inputs.$element = modalElement;

				//  Create the controller, explicitly specifying the scope to use.
				var modalController = $controller(controllerName, inputs);


				//  Finally, append the modal to the dom.
				if (options.appendElement) {
					// append to custom append element
					options.appendElement.append(modalElement);
				} else {
					// append to body when no custom append element is specified
					body.append(modalElement);
				}

				//  We now have a modal object.
				var modal = {
					controller: modalController,
					scope: modalScope,
					element: modalElement,
					close: closeDeferred.promise
				};

				//  When close is resolved, we'll clean up the scope and element.
				modal.close.then(function(result) {
					//  Clean up the scope
					modalScope.$destroy();
					//  Remove the element from the dom.
					modalElement.remove();
				});

				deferred.resolve(modal);

			})
			.catch(function(error) {
				deferred.reject(error);
			});

			return deferred.promise;
		};

	}

	return new ModalService();
}]);
// Source: js/pagination.js
/**
 * [pagination description]
 * @type {[type]}
 */
var pagination = angular.module('tarsius.pagination',[]);

pagination.factory('pagination',['$log',
	function($log){

	var constant = {
		DEFAULT_ITEM_PER_PAGE : 10
	};

	var compose_query = function(query, page, itemPerPage){
		var itemPerPage = itemPerPage || constant.DEFAULT_ITEM_PER_PAGE,
			_query = {
				'skip' : (page-1)*itemPerPage,
				'limit' : itemPerPage
			};
			// extend query
			angular.extend(_query,query);

		$log.info(JSON.stringify(_query));

		return _query;
	};

	return {
		'composeQuery' : compose_query,
		'constant' : constant
	};
}]);

/**
 * [description]
 * @param  {[type]} $log                     [description]
 * @param  {[type]} $http                    [description]
 * @param  {[type]} $sce                     [description]
 * @param  {[type]} $location                [description]
 * @param  {[type]} $stateParams             [description]
 * @param  {[type]} GLOBAL_EVENTS            [description]
 * @return {[type]}                          [description]
 */
pagination.directive('paginationBar', ['$log','$http','$sce','$location','$stateParams','GLOBAL_EVENTS','pagination',
	function($log,$http,$sce,$location,$stateParams,GLOBAL_EVENTS,pagination){
	// Runs during compile
	return {
		restrict : 'E',
		scope : {
			'currentPage' : '@',
			'itemPerPage' : '@',
			'totalItems' : '@',
			'path' : '@',
		},
		templateUrl: '/partials/dependency/directives/pagination/pagination-bar.html',
		// parent controller interface
		controllerAs : 'pagination',
		controller : function($scope, $element, $attrs, $transclude){
		},
		// isolate controller
		link: function(scope, element, attributes, controller){
			var segment = {
				middle : 5,
				tip : 3
			};

			// attribute
			scope.path = scope.path || $location.path();
			scope.currentPage = scope.currentPage || $stateParams.page || 1;
			scope.totalItems = scope.totalItems || 1;
			scope.itemPerPage = scope.itemPerPage || pagination.constant.DEFAULT_ITEM_PER_PAGE;
			scope.pages = {
				early : [],
				middle : [],
				last : []
			};

			// get next page
			scope.nextPage = function(){
				// page at last page
				scope.totalPages = Math.ceil(scope.totalItems/scope.itemPerPage) || 1;
				if(parseInt(scope.totalPages,10) === parseInt(scope.currentPage,10))
					return false;

				return (parseInt(scope.currentPage,10) + 1);
			};

			// get previous page
			scope.previousPage = function(){
				scope.totalPages = Math.ceil(scope.totalItems/scope.itemPerPage) || 1;
				if(parseInt(scope.totalPages,10) === 1)
					return false;

				return (parseInt(scope.currentPage,10) - 1);
			};

			/**
			 * [getPages description]
			 * @param  {[type]} currentPage [description]
			 * @param  {[type]} totalPages  [description]
			 * @param  {[type]} itemPerPage       [description]
			 * @return {[type]}             [description]
			 */
			var getPages = function(currentPage,totalItems,itemPerPage){
				var currentPage = parseInt(currentPage,10) || 1,
					totalItems = parseInt(totalItems,10) || 1,
					itemPerPage = parseInt(itemPerPage,10) || 10,
					totalPages = Math.ceil(totalItems/itemPerPage) || 1,
					start = 1, stop = totalPages,
					page = 0,skip = 0,
					pages = {
						early : [],
						middle : [],
						last : []
					};

				// segmented page
				if(totalPages > ((2*segment.tip) + segment.middle)){

					// early tip detection
					if(currentPage > (segment.tip + segment.middle + 1)){
						// draw early tip
						for(page = 1;page < (segment.tip + 1);page++){
							pages.early.push(page);
						}
						// manage mid start page
						start = currentPage - Math.floor((segment.middle-1)/2);
					}

					// last tip detection
					if(currentPage < (totalPages - (segment.tip + segment.middle + 1))){
						// draw last tip
						for(page = (totalPages - segment.tip + 1); page < (totalPages + 1); page++){
							pages.last.push(page);
						}
						// manage mid stop page
						stop = currentPage + Math.ceil((segment.middle-1)/2);
					}
					
				}

				// middle segment
				for(page = start; page < (stop + 1); page++){
					pages.middle.push(page);
				}

				return pages;
			};

			// page segment
			scope.pages = getPages(scope.currentPage,scope.totalItems,scope.itemPerPage);

			// watch current page data change
			scope.$watch('currentPage',function(_current,_old){
				scope.pages = getPages(scope.currentPage,scope.totalItems,scope.itemPerPage);
			});
			
			// watch current page data change
			scope.$watch('totalItems',function(_current,_old){
				scope.pages = getPages(scope.currentPage,scope.totalItems,scope.itemPerPage);
			});
			
			// watch current page data change
			scope.$watch('itemPerPage',function(_current,_old){
				scope.pages = getPages(scope.currentPage,scope.totalItems,scope.itemPerPage);
			});
		}
	};
}]);
// Source: js/toast.js
/**
 * [toast description]
 * @type {[type]}
 */
var toast = angular.module('tarsius.toast',[
	'ngAnimate',
	'ngSanitize',
]);

/**
 * Toast Providers
 */
toast.provider('toast',[
	function(){
	// data containers
	var messages = [],
		messageStack = [];

	// config
	var defaults = {
		className: 'info',
		dismissOnTimeout: true,
		timeout: 5000,
		dismissButton: true,
		dismissButtonHtml: '',
		dismissOnClick: true,
		compileContent: false,
		horizontalPosition: 'right', // right, center, left
		verticalPosition: 'top', // top, bottom,
		maxNumber: 0
	};

	/**
	 * [Message description]
	 * @param {string} msg [description]
	 */
	var Message = function(msg) {
		var id = Math.floor(Math.random()*1000);
		while (messages.indexOf(id) > -1) {
			id = Math.floor(Math.random()*1000);
		}

		this.id = id;
		this.className = defaults.className;
		this.dismissOnTimeout = defaults.dismissOnTimeout;
		this.timeout = defaults.timeout;
		this.dismissButton = defaults.dismissButton;
		this.dismissButtonHtml = defaults.dismissButtonHtml;
		this.dismissOnClick = defaults.dismissOnClick;
		this.compileContent = defaults.compileContent;

		angular.extend(this, msg);
	};

	// config routine
	this.configure = function(config) {
		angular.extend(defaults, config);
	};

	// getter
	this.$get = [function() {
		return {
			settings: defaults,
			messages: messages,
			dismiss: function(id) {
				if (id) {
					for (var i = messages.length - 1; i >= 0; i--) {
						if (messages[i].id === id) {
							messages.splice(i, 1);
							messageStack.splice(messageStack.indexOf(id), 1);
							return;
						}
					}
				} else {
					while(messages.length > 0) {
						messages.pop();
					}
					messageStack = [];
				}
			},
			create: function(msg) {
				if (defaults.maxNumber > 0 &&
					messageStack.length >= defaults.maxNumber) {
					this.dismiss(messageStack[0]);
				}

				msg = (typeof msg === 'string') ? {content: msg} : msg;

				var newMsg = new Message(msg);
				if (defaults.verticalPosition === 'bottom') {
					messages.unshift(newMsg);
				} else {
					messages.push(newMsg);
				}
				messageStack.push(newMsg.id);
				return newMsg.id;
			}
		};
    }];
}]);

/**
 * @name  toast directive
 */
toast.directive('toast', ['toast', '$templateCache', '$log', 
	function(toast, $templateCache, $log){
	return {
		replace: true,
		restrict: 'EA',
		template:
			'<div class="toast toast--{{hPos}} toast--{{vPos}}">' +
			'<ul class="toast__list">' +
			'<toast-message ng-repeat="message in messages" ' +
			'message="message">' +
			'<span ng-bind-html="message.content"></span>' +
			'</toast-message>' +
			'</ul>' +
			'</div>',
		
		compile: function(tElem, tAttrs) {
			// check if template options exists	
			if (tAttrs.template) {
				var template = $templateCache.get(tAttrs.template);
				if (template) {
					tElem.replaceWith(template);
				} else {
					$log.warn('tarsius.toast: Provided template could not be loaded. ' +
					'Please be sure that it is populated before the <toast> element is represented.');
				}
			}

			return function(scope) {
				scope.hPos = toast.settings.horizontalPosition;
				scope.vPos = toast.settings.verticalPosition;
				scope.messages = toast.messages;
			};
		},
	};
}]);

/**
 * @name  toastMessage
 * @description render toast message inside the toast directive
 */
toast.directive('toastMessage', ['$timeout','$compile','toast', 
	function($timeout,$compile,toast){
	return {
		replace: true,
		transclude: true,
		restrict: 'EA',
		scope: {
			message: '='
		},
		controller: ['$scope', 'toast', 
			function($scope, toast) {
			$scope.dismiss = function() {
				toast.dismiss($scope.message.id);
			};
		}],
		template:
			'<li class="toast__message">' +
			'<div class="alert alert-{{message.className}}" ' +
			'ng-class="{\'alert-dismissible\': message.dismissButton}">' +
			'<a role="link" class="alert-close icon ion-ios-close-empty" ' +
			'ng-if="message.dismissButton" ' +
			'ng-bind-html="message.dismissButtonHtml" ' +
			'ng-click="!message.dismissOnClick && dismiss()">' +
			'</a>' +
			'<span ng-if="!message.compileContent" ng-transclude></span>' +
			'</div>' +
			'</li>',
		link: function(scope, element, attrs, ctrl, transclude) {
			if (scope.message.compileContent) {
				var transcludedEl;

				transclude(scope, function(clone) {
					transcludedEl = clone;
					element.children().append(transcludedEl);
				});

				$timeout(function() {
					$compile(transcludedEl.contents())
					(scope.$parent, function(compiledClone) {
						transcludedEl.replaceWith(compiledClone);
					});
				}, 0);
			}

			if (scope.message.dismissOnTimeout) {
				$timeout(function() {
					toast.dismiss(scope.message.id);
				}, scope.message.timeout);
			}

			if (scope.message.dismissOnClick) {
				element.bind('click', function() {
					toast.dismiss(scope.message.id);
					scope.$apply();
				});
			}
		}
	};
}]);