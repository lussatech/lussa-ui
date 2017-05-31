/*!
 * lussa-ui v1.0.1 (http://git.lussa.net/tarsius/tarsius-ui)
 * Copyright 2014-2017 Muhammad Hasan
 * Licensed under MIT
 */

'use strict';
// Source: js/carousel.js
/**
* @ngdoc overview
* @name lussa.ui.carousel
*
* @description
* AngularJS version of an image carousel.
*
*/
angular.module('lussa.ui.carousel', [])
.controller('CarouselController', ['$scope', '$element', '$interval', '$timeout', '$animate', function($scope, $element, $interval, $timeout, $animate) {
    var self = this,
      slides = self.slides = $scope.slides = [],
      SLIDE_DIRECTION = 'ui-slideDirection',
      currentIndex = -1,
      currentInterval, isPlaying, bufferedTransitions = [];
    self.currentSlide = null;

    var destroyed = false;

    self.addSlide = function(slide, element) {
      slide.$element = element;
      slides.push(slide);
      //if this is the first slide or the slide is set to active, select it
      if (slides.length === 1 || slide.active) {
        if ($scope.$currentTransition) {
          $scope.$currentTransition = null;
        }

        self.select(slides[slides.length - 1]);
        if (slides.length === 1) {
          $scope.play();
        }
      } else {
        slide.active = false;
      }
    };

    self.getCurrentIndex = function() {
      if (self.currentSlide && angular.isDefined(self.currentSlide.index)) {
        return +self.currentSlide.index;
      }
      return currentIndex;
    };

    self.next = $scope.next = function() {
      var newIndex = (self.getCurrentIndex() + 1) % slides.length;

      if (newIndex === 0 && $scope.noWrap()) {
        $scope.pause();
        return;
      }

      return self.select(getSlideByIndex(newIndex), 'next');
    };

    self.prev = $scope.prev = function() {
      var newIndex = self.getCurrentIndex() - 1 < 0 ? slides.length - 1 : self.getCurrentIndex() - 1;

      if ($scope.noWrap() && newIndex === slides.length - 1) {
        $scope.pause();
        return;
      }

      return self.select(getSlideByIndex(newIndex), 'prev');
    };

    self.removeSlide = function(slide) {
      if (angular.isDefined(slide.index)) {
        slides.sort(function(a, b) {
          return +a.index > +b.index;
        });
      }

      var bufferedIndex = bufferedTransitions.indexOf(slide);
      if (bufferedIndex !== -1) {
        bufferedTransitions.splice(bufferedIndex, 1);
      }
      //get the index of the slide inside the carousel
      var index = slides.indexOf(slide);
      slides.splice(index, 1);
      $timeout(function() {
        if (slides.length > 0 && slide.active) {
          if (index >= slides.length) {
            self.select(slides[index - 1]);
          } else {
            self.select(slides[index]);
          }
        } else if (currentIndex > index) {
          currentIndex--;
        }
      });

      //clean the currentSlide when no more slide
      if (slides.length === 0) {
        self.currentSlide = null;
        clearBufferedTransitions();
      }
    };

    /* direction: "prev" or "next" */
    self.select = $scope.select = function(nextSlide, direction) {
      var nextIndex = $scope.indexOfSlide(nextSlide);
      //Decide direction if it's not given
      if (direction === undefined) {
        direction = nextIndex > self.getCurrentIndex() ? 'next' : 'prev';
      }
      //Prevent this user-triggered transition from occurring if there is already one in progress
      if (nextSlide && nextSlide !== self.currentSlide && !$scope.$currentTransition) {
        goNext(nextSlide, nextIndex, direction);
      } else if (nextSlide && nextSlide !== self.currentSlide && $scope.$currentTransition) {
        bufferedTransitions.push(nextSlide);
      }
    };

    /* Allow outside people to call indexOf on slides array */
    $scope.indexOfSlide = function(slide) {
      return angular.isDefined(slide.index) ? +slide.index : slides.indexOf(slide);
    };

    $scope.isActive = function(slide) {
      return self.currentSlide === slide;
    };

    $scope.pause = function() {
      if (!$scope.noPause) {
        isPlaying = false;
        resetTimer();
      }
    };

    $scope.play = function() {
      if (!isPlaying) {
        isPlaying = true;
        restartTimer();
      }
    };

    $scope.$on('$destroy', function() {
      destroyed = true;
      resetTimer();
    });

    $scope.$watch('noTransition', function(noTransition) {
      $animate.enabled($element, !noTransition);
    });

    $scope.$watch('interval', restartTimer);

    $scope.$watchCollection('slides', resetTransition);

    function clearBufferedTransitions() {
      while (bufferedTransitions.length) {
        bufferedTransitions.shift();
      }
    }

    function getSlideByIndex(index) {
      if (angular.isUndefined(slides[index].index)) {
        return slides[index];
      }
      for (var i = 0, l = slides.length; i < l; ++i) {
        if (slides[i].index === index) {
          return slides[i];
        }
      }
    }

    function goNext(slide, index, direction) {
      if (destroyed) { return; }

      angular.extend(slide, {direction: direction, active: true});
      angular.extend(self.currentSlide || {}, {direction: direction, active: false});
      if ($animate.enabled($element) && !$scope.$currentTransition &&
        slide.$element && self.slides.length > 1) {
        slide.$element.data(SLIDE_DIRECTION, slide.direction);
        if (self.currentSlide && self.currentSlide.$element) {
          self.currentSlide.$element.data(SLIDE_DIRECTION, slide.direction);
        }

        $scope.$currentTransition = true;
        $animate.on('addClass', slide.$element, function(element, phase) {
          if (phase === 'close') {
            $scope.$currentTransition = null;
            $animate.off('addClass', element);
            if (bufferedTransitions.length) {
              var nextSlide = bufferedTransitions.pop();
              var nextIndex = $scope.indexOfSlide(nextSlide);
              var nextDirection = nextIndex > self.getCurrentIndex() ? 'next' : 'prev';
              clearBufferedTransitions();

              goNext(nextSlide, nextIndex, nextDirection);
            }
          }
        });
      }

      self.currentSlide = slide;
      currentIndex = index;

      //every time you change slides, reset the timer
      restartTimer();
    }

    function resetTimer() {
      if (currentInterval) {
        $interval.cancel(currentInterval);
        currentInterval = null;
      }
    }

    function resetTransition(slides) {
      if (!slides.length) {
        $scope.$currentTransition = null;
        clearBufferedTransitions();
      }
    }

    function restartTimer() {
      resetTimer();
      var interval = +$scope.interval;
      if (!isNaN(interval) && interval > 0) {
        currentInterval = $interval(timerFn, interval);
      }
    }

    function timerFn() {
      var interval = +$scope.interval;
      if (isPlaying && !isNaN(interval) && interval > 0 && slides.length) {
        $scope.next();
      } else {
        $scope.pause();
      }
    }

}])

/**
 * @ngdoc directive
 * @name lussa.ui.carousel.directive:carousel
 * @restrict EA
 *
 * @description
 * Carousel is the outer container for a set of image 'slides' to showcase.
 *
 * @param {number=} interval The time, in milliseconds, that it will take the carousel to go to the next slide.
 * @param {boolean=} noTransition Whether to disable transitions on the carousel.
 * @param {boolean=} noPause Whether to disable pausing on the carousel (by default, the carousel interval pauses on hover).
 *
 * @example
<example module="lussa.ui">
  <file name="index.html">
    <carousel>
      <slide>
        <img src="http://placekitten.com/150/150" style="margin:auto;">
        <div class="carousel-caption">
          <p>Beautiful!</p>
        </div>
      </slide>
      <slide>
        <img src="http://placekitten.com/100/150" style="margin:auto;">
        <div class="carousel-caption">
          <p>D'aww!</p>
        </div>
      </slide>
    </carousel>
  </file>
  <file name="demo.css">
    .carousel-indicators {
      top: auto;
      bottom: 15px;
    }
  </file>
</example>
 */
.directive('carousel', [function() {
  return {
    transclude: true,
    replace: true,
    controller: 'CarouselController',
    require: 'carousel',
    template: '<div ng-mouseenter="pause()" ng-mouseleave="play()" class="carousel" ng-swipe-right="prev()" ng-swipe-left="next()">'+
        '  <div class="carousel-inner" ng-transclude></div>'+
        '  <a role="button" href class="left carousel-control" ng-click="prev()" ng-show="slides.length > 1">'+
        '    <span aria-hidden="true" class="icon icon-chevron-left"></span>'+
        '    <span class="sr-only">previous</span>'+
        '  </a>'+
        '  <a role="button" href class="right carousel-control" ng-click="next()" ng-show="slides.length > 1">'+
        '    <span aria-hidden="true" class="icon icon-chevron-right"></span>'+
        '    <span class="sr-only">next</span>'+
        '  </a>'+
        '  <ol class="carousel-indicators" ng-show="slides.length > 1">'+
        '    <li ng-repeat="slide in slides | orderBy:indexOfSlide track by $index" ng-class="{ active: isActive(slide) }" ng-click="select(slide)">'+
        '      <span class="sr-only">slide {{ $index + 1 }} of {{ slides.length }}<span ng-if="isActive(slide)">, currently active</span></span>'+
        '    </li>'+
        '  </ol>'+
        '</div>',
    scope: {
      interval: '=',
      noTransition: '=',
      noPause: '=',
      noWrap: '&'
    }
  };
}])

/**
 * @ngdoc directive
 * @name lussa.ui.carousel.directive:slide
 * @restrict EA
 *
 * @description
 * Creates a slide inside a {@link lussa.ui.carousel.directive:carousel carousel}.  Must be placed as a child of a carousel element.
 *
 * @param {boolean=} active Model binding, whether or not this slide is currently active.
 * @param {number=} index The index of the slide. The slides will be sorted by this parameter.
 *
 * @example
<example module="lussa.ui">
  <file name="index.html">
<div ng-controller="CarouselDemoCtrl">
  <carousel>
    <slide ng-repeat="slide in slides" active="slide.active" index="$index">
      <img ng-src="{{slide.image}}" style="margin:auto;">
      <div class="carousel-caption">
        <h4>Slide {{$index}}</h4>
        <p>{{slide.text}}</p>
      </div>
    </slide>
  </carousel>
  Interval, in milliseconds: <input type="number" ng-model="myInterval">
  <br />Enter a negative number to stop the interval.
</div>
  </file>
  <file name="script.js">
function CarouselDemoCtrl($scope) {
  $scope.myInterval = 5000;
}
  </file>
  <file name="demo.css">
    .carousel-indicators {
      top: auto;
      bottom: 15px;
    }
  </file>
</example>
*/

.directive('slide', function() {
  return {
    require: '^carousel',
    transclude: true,
    replace: true,
    template: '<div ng-class="{'+
      '    \'active\': active'+
      '  }" class="item text-center" ng-transclude></div>',
    scope: {
      active: '=?',
      actual: '=?',
      index: '=?'
    },
    link: function (scope, element, attrs, carouselCtrl) {
      carouselCtrl.addSlide(scope, element);
      //when the scope is destroyed then remove the slide from the current slides array
      scope.$on('$destroy', function() {
        carouselCtrl.removeSlide(scope);
      });

      scope.$watch('active', function(active) {
        if (active) {
          carouselCtrl.select(scope);
        }
      });
    }
  };
})

.animation('.item', ['$animateCss',
function($animateCss) {
  var SLIDE_DIRECTION = 'ui-slideDirection';

  function removeClass(element, className, callback) {
    element.removeClass(className);
    if (callback) {
      callback();
    }
  }

  return {
    beforeAddClass: function(element, className, done) {
      if (className === 'active') {
        var stopped = false;
        var direction = element.data(SLIDE_DIRECTION);
        var directionClass = direction === 'next' ? 'left' : 'right';
        var removeClassFn = removeClass.bind(this, element,
          directionClass + ' ' + direction, done);
        element.addClass(direction);

        $animateCss(element, {addClass: directionClass})
          .start()
          .done(removeClassFn);

        return function() {
          stopped = true;
        };
      }
      done();
    },
    beforeRemoveClass: function (element, className, done) {
      if (className === 'active') {
        var stopped = false;
        var direction = element.data(SLIDE_DIRECTION);
        var directionClass = direction === 'next' ? 'left' : 'right';
        var removeClassFn = removeClass.bind(this, element, directionClass, done);

        $animateCss(element, {addClass: directionClass})
          .start()
          .done(removeClassFn);

        return function() {
          stopped = true;
        };
      }
      done();
    }
  };
}]);

// Source: js/collapse.js
/**
 * @ngdoc directive
 *
 * @name lussa.ui.collapse
 */
angular.module('lussa.ui.collapse', [])
.directive('collapse', ['$animate', function ($animate) {

  return {
    link: function (scope, element, attrs) {
      function expand() {
        element.removeClass('collapse').addClass('collapsing');
        $animate.addClass(element, 'in', {
          to: { height: element[0].scrollHeight + 'px' }
        }).then(expandDone);
      }

      function expandDone() {
        element.removeClass('collapsing');
        element.css({height: 'auto'});
      }

      function collapse() {
        element
          // IMPORTANT: The height must be set before adding "collapsing" class.
          // Otherwise, the browser attempts to animate from height 0 (in
          // collapsing class) to the given height here.
          .css({height: element[0].scrollHeight + 'px'})
          // initially all panel collapse have the collapse class, this removal
          // prevents the animation from jumping to collapsed state
          .removeClass('collapse')
          .addClass('collapsing');

        $animate.removeClass(element, 'in', {
          to: {height: '0'}
        }).then(collapseDone);
      }

      function collapseDone() {
        element.css({height: '0'}); // Required so that collapse works when animation is disabled
        element.removeClass('collapsing');
        element.addClass('collapse');
      }

      scope.$watch(attrs.collapse, function (shouldCollapse) {
        if (shouldCollapse) {
          collapse();
        } else {
          expand();
        }
      });
    }
  };
}]);
// Source: js/dropdown.js
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
                wrapper.removeClass('open');
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
                wrapper.addClass('open');
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
// Source: js/form.js
/**
 * @ngdoc overview
 * @name  lussa.ui.form
 * @module lussa.ui
 *
 * @description
 * Collection of form related module
 *
 * @requires
 *
 */
var LussaUiForm = angular.module('lussa.ui.form',[
    'lussa.ui.form.datePicker',
    'lussa.ui.form.timePicker',
    'lussa.ui.form.autoComplete',
    'lussa.ui.form.fileUploader',
    'lussa.ui.form.tag',
    'lussa.ui.form.validation',
    'lussa.ui.form.rating',
    'lussa.ui.form.inputMask'
]);

// Source: js/form/auto-complete.js
/**
 * [form description]
 * @type {[type]}
 */
var form = angular.module('lussa.ui.form.autoComplete',[]);

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
    var TEMPLATE = '<div class="auto-complete-container" ng-class="{\'auto-complete-dropdown-visible\': showDropdown}"> '+
        '   <input id="{{id}}_value" ng-model="searchStr" '+
        '       ng-disabled="disableInput" '+
        '       type="{{type}}" '+
        '       placeholder="{{placeholder}}" '+
        '       ng-focus="onFocusHandler()" '+
        '       class="{{inputClass}}" '+
        '       ng-focus="resetHideResults()" '+
        '       ng-blur="hideResults($event)" '+
        '       autocapitalize="off" '+
        '       autocorrect="off" '+
        '       autocomplete="off" '+
        '       ng-change="inputChangeHandler(searchStr)"/> '+
        '   <div id="{{id}}_dropdown" class="auto-complete-dropdown" ng-show="showDropdown"> '+
        '       <div class="auto-complete-searching" ng-show="searching" ng-bind="textSearching"></div>'+
        '       <div class="auto-complete-searching" ng-show="!searching && (!results || results.length == 0)" ng-bind="textNoResults"></div>'+
        '       <div class="auto-complete-row" ng-repeat="result in results" ng-click="selectResult(result)" ng-mouseenter="hoverRow($index)" '+
        '           ng-class="{\'auto-complete-selected-row\': $index == currentIndex}">'+
        '           <div ng-if="imageField" class="auto-complete-image-holder"> '+
        '               <img ng-if="result.image && result.image != \'\'" ng-src="{{result.image}}" class="auto-complete-image"/> '+
        '               <div ng-if="!result.image && result.image != \'\'" class="auto-complete-image-default"></div> '+
        '           </div> '+
        '           <div class="auto-complete-title" ng-if="matchClass" ng-bind-html="result.title"></div> '+
        '           <div class="auto-complete-title" ng-if="!matchClass">{{ result.title }}</div> '+
        '           <div ng-if="matchClass && result.description && result.description != \'\'" class="auto-complete-description" ng-bind-html="result.description"></div> '+
        '           <div ng-if="!matchClass && result.description && result.description != \'\'" class="auto-complete-description">{{result.description}}</div> '+
        ''+
        '       </div> '+
        '   </div> '+
        '</div>';


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
        template: TEMPLATE,
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
var DatePicker = angular.module('lussa.ui.form.datePicker',[]);

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
        },
        id: {
            months: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'],
            monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
            today: 'Hari Ini'
        }
    };

    var partials = {
        headTemplate : '<thead>'+
        '<tr>'+
        '<th class="prev"><i class="icon icon-ios-arrow-left"/></th>'+
        '<th colspan="5" class="date-switch"></th>'+
        '<th class="next"><i class="icon icon-ios-arrow-right"/></th>'+
        '</tr>'+
        '</thead>',
        contTemplate: '<tbody><tr><td colspan="7"></td></tr></tbody>',
        footTemplate: '<tfoot ng-show="todayButton"><tr><th colspan="7" class="today">{{todayButton}}</th></tr></tfoot>',
        headTemplateDays: '<thead>'+
        '<tr>'+
        '<th class="prev"><i class="icon icon-ios-arrow-left"/></th>'+
        '<th colspan="5" class="date-switch"></th>'+
        '<th class="next"><i class="icon icon-ios-arrow-right"/></th>'+
        '</tr>'+
        '</thead>',
        footTemplateDays: '<tfoot class="picker {{todayClass}}" ng-show="todayButton"><tr><th colspan="7" class="today">{{todayButton}}</th></tr></tfoot>'
    };

    var template = '<div class="ui-date-picker"> ' +
    '<div ng-click="displayPicker()" class="date-display form-group">' +
    '<label for={{pickerid}} class="date-input-label"></label>' +
    '<input readonly id={{pickerid}} class="date-input form-control {{attrs.inputClass}}" placeholder="{{placeholder}}" value="{{modelviewvalue}}">' +
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
    '<a class="button datepicker-close small alert right" style="width:auto;"><i class="icon icon-close"></i></a>'+
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

            // hide on blur
            angular.element('body').on('click', function(event){
                var isBlur = _.some(angular.element(event.target).parents(), function(el){
                    return el.classList.contains('ui-date-picker');
                });

                if(!isBlur && scope.showPicker === true && scope.autohide)
                    scope.hide(true);
            });

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
                });
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
            scope.picker.css({
                // top:    element[0].offsetTop,
                // left:   element[0].offsetLeft,
                zIndex: 100,
                display: "block"
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

            if(!closestElemNg)
                return;

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
        scope.keydown = function(e){
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
            }
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
            scope.language          = attrs.language    || scope.locale || 'id';
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
                span.addClass ('icon-label-input icon icon-calendar');
            }

            label = element.find('label');
            if (attrs.label) {
                label.html(attrs.label);
            }else{
                element.find('.date-display').removeClass('form-group');
                label.remove();
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
var form = angular.module('lussa.ui.form.fileUploader',[]);


form.factory('FileUploaderFactory',['$http','$log',
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
	var _uploadFile = function(files, url){
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
		$http.post(url, form, {
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
	var _uploadImage = function(file, url, params){
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
			'url' : url,
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
form.directive('uiFileModel', ['$parse', '$log',
    function ($parse,$log) {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            //setup model
            var model = $parse(attrs.uiFileModel),
            	modelSetter = model.assign;

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
// Source: js/form/input-mask.js
/**
 * @ngdoc overview
 *
 * @name lussa.ui.form.inputMask
 * @description based on https://github.com/candreoliveira/ngMask
 */

var inputMask = angular.module('lussa.ui.form.inputMask',[]);

/**
 * @ngdoc directive
 *
 * @name mask
 * @module  lussa.ui.form.inputMask
 */
inputMask.directive('mask', ['$log', '$timeout', 'MaskService',
  function($log, $timeout, MaskService) {
  return {
    restrict: 'A',
    require: 'ngModel',
    compile: function($element, $attrs) {
     if (!$attrs.mask || !$attrs.ngModel) {
        $log.info('Mask and ng-model attributes are required!');
        return;
      }

      var maskService = MaskService.create();
      var timeout;
      var promise;

      function setSelectionRange(selectionStart){
        if (typeof selectionStart !== 'number') {
          return;
        }

        // using $timeout:
        // it should run after the DOM has been manipulated by Angular
        // and after the browser renders (which may cause flicker in some cases)
        $timeout.cancel(timeout);
        timeout = $timeout(function(){
          var selectionEnd = selectionStart + 1;
          var input = $element[0];

          if (input.setSelectionRange) {
            input.focus();
            input.setSelectionRange(selectionStart, selectionEnd);
          } else if (input.createTextRange) {
            var range = input.createTextRange();

            range.collapse(true);
            range.moveEnd('character', selectionEnd);
            range.moveStart('character', selectionStart);
            range.select();
          }
        });
      }

      return {
        pre: function($scope, $element, $attrs, controller) {
          promise = maskService.generateRegex({
            mask: $attrs.mask,
            // repeat mask expression n times
            repeat: ($attrs.repeat || $attrs.maskRepeat),
            // clean model value - without divisors
            clean: (($attrs.clean || $attrs.maskClean) === 'true'),
            // limit length based on mask length
            limit: (($attrs.limit || $attrs.maskLimit || 'true') === 'true'),
            // how to act with a wrong value
            restrict: ($attrs.restrict || $attrs.maskRestrict || 'select'), //select, reject, accept
            // set validity mask
            validate: (($attrs.validate || $attrs.maskValidate || 'true') === 'true'),
            // default model value
            model: $attrs.ngModel,
            // default input value
            value: $attrs.ngValue
          });
        },
        post: function($scope, $element, $attrs, controller) {
          promise.then(function() {
            // get initial options
            var timeout;
            var options = maskService.getOptions();

            function parseViewValue(value) {
              // set default value equal 0
              value = value || '';

              // get view value object
              var viewValue = maskService.getViewValue(value);

              // get mask without question marks
              var maskWithoutOptionals = options.maskWithoutOptionals || '';

              // get view values capped
              // used on view
              var viewValueWithDivisors = viewValue.withDivisors(true);
              // used on model
              var viewValueWithoutDivisors = viewValue.withoutDivisors(true);

              try {
                // get current regex
                var regex = maskService.getRegex(viewValueWithDivisors.length - 1);
                var fullRegex = maskService.getRegex(maskWithoutOptionals.length - 1);

                // current position is valid
                var validCurrentPosition = regex.test(viewValueWithDivisors) || fullRegex.test(viewValueWithDivisors);

                // difference means for select option
                var diffValueAndViewValueLengthIsOne = (value.length - viewValueWithDivisors.length) === 1;
                var diffMaskAndViewValueIsGreaterThanZero = (maskWithoutOptionals.length - viewValueWithDivisors.length) > 0;

                if (options.restrict !== 'accept') {
                  if (options.restrict === 'select' && (!validCurrentPosition || diffValueAndViewValueLengthIsOne)) {
                    var lastCharInputed = value[(value.length-1)];
                    var lastCharGenerated = viewValueWithDivisors[(viewValueWithDivisors.length-1)];

                    if ((lastCharInputed !== lastCharGenerated) && diffMaskAndViewValueIsGreaterThanZero) {
                      viewValueWithDivisors = viewValueWithDivisors + lastCharInputed;
                    }

                    var wrongPosition = maskService.getFirstWrongPosition(viewValueWithDivisors);
                    if (angular.isDefined(wrongPosition)) {
                      setSelectionRange(wrongPosition);
                    }
                  } else if (options.restrict === 'reject' && !validCurrentPosition) {
                    viewValue = maskService.removeWrongPositions(viewValueWithDivisors);
                    viewValueWithDivisors = viewValue.withDivisors(true);
                    viewValueWithoutDivisors = viewValue.withoutDivisors(true);

                    // setSelectionRange(viewValueWithDivisors.length);
                  }
                }

                if (!options.limit) {
                  viewValueWithDivisors = viewValue.withDivisors(false);
                  viewValueWithoutDivisors = viewValue.withoutDivisors(false);
                }

                // Set validity
                if (options.validate && controller.$dirty) {
                  if (fullRegex.test(viewValueWithDivisors) || controller.$isEmpty(controller.$modelValue)) {
                    controller.$setValidity('mask', true);
                  } else {
                    controller.$setValidity('mask', false);
                  }
                }

                // Update view and model values
                if(value !== viewValueWithDivisors){
                  controller.$setViewValue(angular.copy(viewValueWithDivisors), 'input');
                  controller.$render();
                }
              } catch (e) {
                $log.error('[mask - parseViewValue]');
                throw e;
              }

              // Update model, can be different of view value
              if (options.clean) {
                return viewValueWithoutDivisors;
              } else {
                return viewValueWithDivisors;
              }
            }

            controller.$parsers.push(parseViewValue);

            $element.on('click input paste keyup', function() {
              timeout = $timeout(function() {
                // Manual debounce to prevent multiple execution
                $timeout.cancel(timeout);

                parseViewValue($element.val());
                $scope.$apply();
              }, 100);
            });

            // Register the watch to observe remote loading or promised data
            // Deregister calling returned function
            var watcher = $scope.$watch($attrs.ngModel, function (newValue, oldValue) {
              if (angular.isDefined(newValue)) {
                parseViewValue(newValue);
                watcher();
              }
            });

            // $evalAsync from a directive
            // it should run after the DOM has been manipulated by Angular
            // but before the browser renders
            if(options.value) {
              $scope.$evalAsync(function($scope) {
                controller.$setViewValue(angular.copy(options.value), 'input');
                controller.$render();
              });
            }
          });
        }
      };
    }
  };
}]);

/**
 * @ngdoc interface(service)
 *
 * @name MaskService
 * @module  lussa.ui.form.inputMask
 */
inputMask.factory('MaskService', ['$q', 'MaskOptionalService', 'MaskUtilService',
  function($q, MaskOptionalService, MaskUtilService) {
  function create() {
    var options;
    var maskWithoutOptionals;
    var maskWithoutOptionalsLength = 0;
    var maskWithoutOptionalsAndDivisorsLength = 0;
    var optionalIndexes = [];
    var optionalDivisors = {};
    var optionalDivisorsCombinations = [];
    var divisors = [];
    var divisorElements = {};
    var regex = [];
    var patterns = {
      '9': /[0-9]/,
      '8': /[0-8]/,
      '7': /[0-7]/,
      '6': /[0-6]/,
      '5': /[0-5]/,
      '4': /[0-4]/,
      '3': /[0-3]/,
      '2': /[0-2]/,
      '1': /[0-1]/,
      '0': /[0]/,
      '*': /./,
      'w': /\w/,
      'W': /\W/,
      'd': /\d/,
      'D': /\D/,
      's': /\s/,
      'S': /\S/,
      'b': /\b/,
      'A': /[A-Z]/,
      'a': /[a-z]/,
      'Z': /[A-ZÇÀÁÂÃÈÉÊẼÌÍÎĨÒÓÔÕÙÚÛŨ]/,
      'z': /[a-zçáàãâéèêẽíìĩîóòôõúùũüû]/,
      '@': /[a-zA-Z]/,
      '#': /[a-zA-ZçáàãâéèêẽíìĩîóòôõúùũüûÇÀÁÂÃÈÉÊẼÌÍÎĨÒÓÔÕÙÚÛŨ]/,
      '%': /[0-9a-zA-ZçáàãâéèêẽíìĩîóòôõúùũüûÇÀÁÂÃÈÉÊẼÌÍÎĨÒÓÔÕÙÚÛŨ]/
    };

    // REGEX

    function generateIntermetiateElementRegex(i, forceOptional) {
      var charRegex,
        element,
        elementRegex,
        hasOptional;

      try {
        element = maskWithoutOptionals[i];
        elementRegex = patterns[element];
        hasOptional = isOptional(i);

        if (elementRegex) {
          charRegex = '(' + elementRegex.source + ')';
        } else { // is a divisor
          if (!isDivisor(i)) {
            divisors.push(i);
            divisorElements[i] = element;
          }

          charRegex = '(' + '\\' + element + ')';
        }
      } catch (e) {
        throw e;
      }

      if (hasOptional || forceOptional) {
        charRegex += '?';
      }

      return new RegExp(charRegex);
    }

    function generateIntermetiateRegex(i, forceOptional) {
      var elementRegex,
        elementOptionalRegex;
      try {
        var intermetiateElementRegex = generateIntermetiateElementRegex(i, forceOptional);
        elementRegex = intermetiateElementRegex;

        var hasOptional = isOptional(i);
        var currentRegex = intermetiateElementRegex.source;

        if (hasOptional && ((i+1) < maskWithoutOptionalsLength)) {
          var intermetiateRegex = generateIntermetiateRegex((i+1), true).elementOptionalRegex();
          currentRegex += intermetiateRegex.source;
        }

        elementOptionalRegex = new RegExp(currentRegex);
      } catch (e) {
        throw e;
      }
      return {
        elementRegex: function() {
          return elementRegex;
        },
        elementOptionalRegex: function() {
          // from element regex, gets the flow of regex until first not optional
          return elementOptionalRegex;
        }
      };
    }

    function generateRegex(opts) {
      var deferred = $q.defer();
      options = opts;

      try {
        var mask = opts.mask;
        var repeat = opts.repeat;

        if (repeat) {
          mask = new Array((parseInt(repeat)+1)).join(mask);
        }

        optionalIndexes = MaskOptionalService.getOptionals(mask).fromMaskWithoutOptionals();
        options.maskWithoutOptionals = maskWithoutOptionals = MaskOptionalService.removeOptionals(mask);
        maskWithoutOptionalsLength = maskWithoutOptionals.length;

        var cumulativeRegex;
        for (var i=0; i<maskWithoutOptionalsLength; i++) {
          var charRegex = generateIntermetiateRegex(i);
          var elementRegex = charRegex.elementRegex();
          var elementOptionalRegex = charRegex.elementOptionalRegex();

          var newRegex = cumulativeRegex ? cumulativeRegex.source + elementOptionalRegex.source : elementOptionalRegex.source;
          newRegex = new RegExp(newRegex);
          cumulativeRegex = cumulativeRegex ? cumulativeRegex.source + elementRegex.source : elementRegex.source;
          cumulativeRegex = new RegExp(cumulativeRegex);

          regex.push(newRegex);
        }

        generateOptionalDivisors();
        maskWithoutOptionalsAndDivisorsLength = removeDivisors(maskWithoutOptionals).length;

        deferred.resolve({
          options: options,
          divisors: divisors,
          divisorElements: divisorElements,
          optionalIndexes: optionalIndexes,
          optionalDivisors: optionalDivisors,
          optionalDivisorsCombinations: optionalDivisorsCombinations
        });
      } catch (e) {
        deferred.reject(e);
        throw e;
      }

      return deferred.promise;
    }

    function getRegex(index) {
      var currentRegex;

      try {
        currentRegex = regex[index] ? regex[index].source : '';
      } catch (e) {
        throw e;
      }

      return (new RegExp('^' + currentRegex + '$'));
    }

    // DIVISOR

    function isOptional(currentPos) {
      return MaskUtilService.inArray(currentPos, optionalIndexes);
    }

    function isDivisor(currentPos) {
      return MaskUtilService.inArray(currentPos, divisors);
    }

    function generateOptionalDivisors() {
      function sortNumber(a,b) {
          return a - b;
      }

      var sortedDivisors = divisors.sort(sortNumber);
      var sortedOptionals = optionalIndexes.sort(sortNumber);
      for (var i = 0; i<sortedDivisors.length; i++) {
        var divisor = sortedDivisors[i];
        for (var j = 1; j<=sortedOptionals.length; j++) {
          var optional = sortedOptionals[(j-1)];
          if (optional >= divisor) {
            break;
          }

          if (optionalDivisors[divisor]) {
            optionalDivisors[divisor] = optionalDivisors[divisor].concat(divisor-j);
          } else {
            optionalDivisors[divisor] = [(divisor-j)];
          }

          // get the original divisor for alternative divisor
          divisorElements[(divisor-j)] = divisorElements[divisor];
        }
      }
    }

    function removeDivisors(value) {
      try {
        if (divisors.length > 0 && value) {
          var keys = Object.keys(divisorElements);
          var elments = [];

          for (var i = keys.length - 1; i >= 0; i--) {
            var divisor = divisorElements[keys[i]];
            if (divisor) {
              elments.push(divisor);
            }
          }

          elments = MaskUtilService.uniqueArray(elments);

          // remove if it is not pattern
          var regex = new RegExp(('[' + '\\' + elments.join('\\') + ']'), 'g');
          return value.replace(regex, '');
        } else {
          return value;
        }
      } catch (e) {
        throw e;
      }
    }

    function insertDivisors(array, combination) {
      function insert(array, output) {
        var out = output;
        for (var i=0; i<array.length; i++) {
          var divisor = array[i];
          if (divisor < out.length) {
            out.splice(divisor, 0, divisorElements[divisor]);
          }
        }
        return out;
      }

      var output = array;
      var divs = divisors.filter(function(it) {
        var optionalDivisorsKeys = Object.keys(optionalDivisors).map(function(it){
          return parseInt(it);
        });

        return !MaskUtilService.inArray(it, combination) && !MaskUtilService.inArray(it, optionalDivisorsKeys);
      });

      if (!angular.isArray(array) || !angular.isArray(combination)) {
        return output;
      }

      // insert not optional divisors
      output = insert(divs, output);

      // insert optional divisors
      output = insert(combination, output);

      return output;
    }

    function tryDivisorConfiguration(value) {
      var output = value.split('');
      var defaultDivisors = true;

      // has optional?
      if (optionalIndexes.length > 0) {
        var lazyArguments = [];
        var optionalDivisorsKeys = Object.keys(optionalDivisors);

        // get all optional divisors as array of arrays [[], [], []...]
        for (var i=0; i<optionalDivisorsKeys.length; i++) {
          var val = optionalDivisors[optionalDivisorsKeys[i]];
          lazyArguments.push(val);
        }

        // generate all possible configurations
        if (optionalDivisorsCombinations.length === 0) {
          MaskUtilService.lazyProduct(lazyArguments, function() {
            // convert arguments to array
            optionalDivisorsCombinations.push(Array.prototype.slice.call(arguments));
          });
        }

        for (var i = optionalDivisorsCombinations.length - 1; i >= 0; i--) {
          var outputClone = angular.copy(output);
          outputClone = insertDivisors(outputClone, optionalDivisorsCombinations[i]);

          // try validation
          var viewValueWithDivisors = outputClone.join('');
          var regex = getRegex(maskWithoutOptionals.length - 1);

          if (regex.test(viewValueWithDivisors)) {
            defaultDivisors = false;
            output = outputClone;
            break;
          }
        }
      }

      if (defaultDivisors) {
        output = insertDivisors(output, divisors);
      }

      return output.join('');
    }

    // MASK

    function getOptions() {
      return options;
    }

    function getViewValue(value) {
      try {
        var outputWithoutDivisors = removeDivisors(value);
        var output = tryDivisorConfiguration(outputWithoutDivisors);

        return {
          withDivisors: function(capped) {
            if (capped) {
              return output.substr(0, maskWithoutOptionalsLength);
            } else {
              return output;
            }
          },
          withoutDivisors: function(capped) {
            if (capped) {
              return outputWithoutDivisors.substr(0, maskWithoutOptionalsAndDivisorsLength);
            } else {
              return outputWithoutDivisors;
            }
          }
        };
      } catch (e) {
        throw e;
      }
    }

    // SELECTOR

    function getWrongPositions(viewValueWithDivisors, onlyFirst) {
      var pos = [];

      if (!viewValueWithDivisors) {
        return 0;
      }

      for (var i=0; i<viewValueWithDivisors.length; i++){
        var pattern = getRegex(i);
        var value = viewValueWithDivisors.substr(0, (i+1));

        if(pattern && !pattern.test(value)){
          pos.push(i);

          if (onlyFirst) {
            break;
          }
        }
      }

      return pos;
    }

    function getFirstWrongPosition(viewValueWithDivisors) {
      return getWrongPositions(viewValueWithDivisors, true)[0];
    }

    function removeWrongPositions(viewValueWithDivisors) {
      var wrongPositions = getWrongPositions(viewValueWithDivisors, false);
      var newViewValue = viewValueWithDivisors;

      for (var i in wrongPositions) {
        var wrongPosition = wrongPositions[i];
        var viewValueArray = viewValueWithDivisors.split('');
        viewValueArray.splice(wrongPosition, 1);
        newViewValue = viewValueArray.join('');
      }

      return getViewValue(newViewValue);
    }

    return {
      getViewValue: getViewValue,
      generateRegex: generateRegex,
      getRegex: getRegex,
      getOptions: getOptions,
      removeDivisors: removeDivisors,
      getFirstWrongPosition: getFirstWrongPosition,
      removeWrongPositions: removeWrongPositions
    };
  }

  return {
    create: create
  };
}]);

/**
 * @ngdoc interface(service)
 *
 * @name MaskMaskOptionalService
 * @module  lussa.ui.form.inputMask
 */
inputMask.factory('MaskOptionalService', [
  function() {
  function getOptionalsIndexes(mask) {
    var indexes = [];

    try {
      var regexp = /\?/g;
      var match = [];

      while ((match = regexp.exec(mask)) !== null) {
        // Save the optional char
        indexes.push((match.index - 1));
      }
    } catch (e) {
      throw e;
    }

    return {
      fromMask: function() {
        return indexes;
      },
      fromMaskWithoutOptionals: function() {
        return getOptionalsRelativeMaskWithoutOptionals(indexes);
      }
    };
  }

  function getOptionalsRelativeMaskWithoutOptionals(optionals) {
    var indexes = [];
    for (var i=0; i<optionals.length; i++) {
      indexes.push(optionals[i]-i);
    }
    return indexes;
  }

  function removeOptionals(mask) {
    var newMask;

    try {
      newMask = mask.replace(/\?/g, '');
    } catch (e) {
      throw e;
    }

    return newMask;
  }

  return {
    removeOptionals: removeOptionals,
    getOptionals: getOptionalsIndexes
  };
}]);

/**
 * @ngdoc interface(service)
 *
 * @name MaskUtilService
 * @module  lussa.ui.form.inputMask
 */
inputMask.factory('MaskUtilService', [function() {
  // sets: an array of arrays
  // f: your callback function
  // context: [optional] the `this` to use for your callback
  // http://phrogz.net/lazy-cartesian-product
  function lazyProduct(sets, f, context){
    if (!context){
      context = lazyProduct;
    }

    var p = [];
    var max = sets.length-1;
    var lens = [];

    for (var i=sets.length;i--;) {
      lens[i] = sets[i].length;
    }

    function dive(d){
      var a = sets[d];
      var len = lens[d];

      if (d === max) {
        for (var i=0;i<len;++i) {
          p[d] = a[i];
          f.apply(context, p);
        }
      } else {
        for (var i=0;i<len;++i) {
          p[d]=a[i];
          dive(d+1);
        }
      }

      p.pop();
    }

    dive(0);
  }

  function inArray(i, array) {
    var output;

    try {
      output = array.indexOf(i) > -1;
    } catch (e) {
      throw e;
    }

    return output;
  }

  function uniqueArray(array) {
    var u = {};
    var a = [];

    for (var i = 0, l = array.length; i < l; ++i) {
      if(u.hasOwnProperty(array[i])) {
        continue;
      }

      a.push(array[i]);
      u[array[i]] = 1;
    }

    return a;
  }

  return {
    lazyProduct: lazyProduct,
    inArray: inArray,
    uniqueArray: uniqueArray
  };
}]);

// Source: js/form/rating.js
angular.module('lussa.ui.form.rating', [])

.constant('ratingConfig', {
  max: 5,
  stateOn: null,
  stateOff: null
})

.controller('RatingController', ['$scope', '$attrs', 'ratingConfig', function($scope, $attrs, ratingConfig) {
  var ngModelCtrl  = { $setViewValue: angular.noop };

  this.init = function(ngModelCtrl_) {
    ngModelCtrl = ngModelCtrl_;
    ngModelCtrl.$render = this.render;

    ngModelCtrl.$formatters.push(function(value) {
      if (angular.isNumber(value) && value << 0 !== value) {
        value = Math.round(value);
      }
      return value;
    });

    this.stateOn = angular.isDefined($attrs.stateOn) ? $scope.$parent.$eval($attrs.stateOn) : ratingConfig.stateOn;
    this.stateOff = angular.isDefined($attrs.stateOff) ? $scope.$parent.$eval($attrs.stateOff) : ratingConfig.stateOff;

    var ratingStates = angular.isDefined($attrs.ratingStates) ? $scope.$parent.$eval($attrs.ratingStates) :
                        new Array( angular.isDefined($attrs.max) ? $scope.$parent.$eval($attrs.max) : ratingConfig.max );
    $scope.range = this.buildTemplateObjects(ratingStates);
  };

  this.buildTemplateObjects = function(states) {
    for (var i = 0, n = states.length; i < n; i++) {
      states[i] = angular.extend({ index: i }, { stateOn: this.stateOn, stateOff: this.stateOff }, states[i]);
    }
    return states;
  };

  $scope.rate = function(value) {
    if ( !$scope.readonly && value >= 0 && value <= $scope.range.length ) {
      ngModelCtrl.$setViewValue(value);
      ngModelCtrl.$render();
    }
  };

  $scope.enter = function(value) {
    if ( !$scope.readonly ) {
      $scope.value = value;
    }
    $scope.onHover({value: value});
  };

  $scope.reset = function() {
    $scope.value = ngModelCtrl.$viewValue;
    $scope.onLeave();
  };

  $scope.onKeydown = function(evt) {
    if (/(37|38|39|40)/.test(evt.which)) {
      evt.preventDefault();
      evt.stopPropagation();
      $scope.rate( $scope.value + (evt.which === 38 || evt.which === 39 ? 1 : -1) );
    }
  };

  this.render = function() {
    $scope.value = ngModelCtrl.$viewValue;
  };
}])

.directive('rating', function() {
  return {
    restrict: 'EA',
    require: ['rating', 'ngModel'],
    scope: {
      readonly: '=?',
      onHover: '&',
      onLeave: '&'
    },
    controller: 'RatingController',
    template: '<span ng-mouseleave="reset()" ng-keydown="onKeydown($event)" tabindex="0" role="slider" aria-valuemin="0" aria-valuemax="{{range.length}}" aria-valuenow="{{value}}">'+
    '    <i ng-repeat="r in range track by $index" ng-mouseenter="enter($index + 1)" ng-click="rate($index + 1)" class="icon" ng-class="$index < value && (r.stateOn || \'icon-android-star\') || (r.stateOff || \'icon-android-star-outline\')">'+
    '        <span class="sr-only">({{ $index < value ? \'*\' : \' \' }})</span>'+
    '    </i>'+
    '</span>',
    replace: true,
    link: function(scope, element, attrs, ctrls) {
      var ratingCtrl = ctrls[0], ngModelCtrl = ctrls[1];
      ratingCtrl.init( ngModelCtrl );
    }
  };
});
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

var form = angular.module('lussa.ui.form.tag', []);


var partials = {
    tagsInput : '<div class="host"'+
        'tabindex="-1"'+
        'ng-click="eventHandlers.host.click()"'+
        'ti-transclude-append="">'+
        '<div class="tags" ng-class="{focused: hasFocus}">'+
        '    <ul class="tag-list">'+
        '        <li class="tag-item" ng-repeat="tag in tagList.items track by track(tag)"'+
        '            ng-class="{ selected: tag == tagList.selected }">'+
        '            <span ng-bind="getDisplayText(tag)"></span>'+
        '            <a class="remove-button icon icon-android-remove-circle"'+
        '                ng-click="tagList.remove($index)" ></a>'+
        '        </li>'+
        '    </ul>'+
        '   <input class="input" ng-model="newTag.text"'+
        '        ng-change="eventHandlers.input.change(newTag.text)"'+
        '        ng-keydown="eventHandlers.input.keydown($event)"'+
        '        ng-focus="eventHandlers.input.focus($event)"'+
        '        ng-blur="eventHandlers.input.blur($event)"'+
        '        ng-paste="eventHandlers.input.paste($event)"'+
        '        ng-trim="false" ng-class="{\'invalid-tag\': newTag.invalid}"'+
        '        ti-bind-attrs="{type: options.type, placeholder: options.placeholder, tabindex: options.tabindex, spellcheck: options.spellcheck}"'+
        '        ti-autosize="">'+
        '</div>'+
        '</div>',
    tagsAutoComplete: '<div class="tags-auto-complete" ng-show="suggestionList.visible">'+
        '<ul class="suggestion-list">'+
        '    <li class="suggestion-item" ng-repeat="item in suggestionList.items track by track(item)"'+
        '        ng-class="{selected: item == suggestionList.selected}"'+
        '        ng-click="addSuggestionByIndex($index)"'+
        '        ng-mouseenter="suggestionList.select($index)"'+
        '        ng-bind-html="highlight(item)">'+
        '    </li>'+
        '</ul>'+
        '</div>'
};

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
        template: partials.tagsInput,
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
        template: partials.tagsAutoComplete,
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

// Source: js/form/time-picker.js
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

// Source: js/form/validation.js
/**
 * [form description]
 * @type {[type]}
 */
var form = angular.module('lussa.ui.form.validation',[]);

/**
 * Input Match Directives
 * @requires $parse
 */
form.directive('uiMatch',['$parse','$log',
	function($parse,$log){
	return {
        require: '?ngModel',
        restrict: 'A',
        link: function(scope, elem, attrs, ctrl) {
			// if ngModel is not defined, we don't need to do anything
			if (!ctrl) return;
			if (!attrs.uiMatch) return;

			var firstPassword = $parse(attrs.uiMatch);

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

// Source: js/helper.js
/**
 * @ngdoc overview
 * @name  lussa.ui.helper
 * @module lussa.ui
 *
 * @description
 * Collection of Helper module
 *
 * @requires
 *
 */
var LussaUiForm = angular.module('lussa.ui.helper',[
    'lussa.ui.helper.position',
    'lussa.ui.helper.bindHtml'
]);

// Source: js/helper/bindHtml.js
angular.module('lussa.ui.helper.bindHtml', [])
.directive('bindHtmlUnsafe', function () {
    return function (scope, element, attr) {
        element.addClass('ng-binding').data('$binding', attr.bindHtmlUnsafe);
        scope.$watch(attr.bindHtmlUnsafe, function bindHtmlUnsafeWatchAction(value) {
            element.html(value || '');
        });
    };
});

// Source: js/helper/position.js
angular.module('lussa.ui.helper.position', [])

/**
* A set of utility methods that can be use to retrieve position of DOM elements.
* It is meant to be used where we need to absolute-position DOM elements in
* relation to other, existing elements (this is the case for tooltips, popovers,
* typeahead suggestions etc.).
*/
.factory('$position', ['$document', '$window', function ($document, $window) {

    function getStyle(el, cssprop) {
        if (el.currentStyle) { //IE
            return el.currentStyle[cssprop];
        } else if ($window.getComputedStyle) {
            return $window.getComputedStyle(el)[cssprop];
        }
        // finally try and get inline style
        return el.style[cssprop];
    }

    /**
    * Checks if a given element is statically positioned
    * @param element - raw DOM element
    */
    function isStaticPositioned(element) {
        return (getStyle(element, 'position') || 'static' ) === 'static';
    }

    /**
    * returns the closest, non-statically positioned parentOffset of a given element
    * @param element
    */
    var parentOffsetEl = function (element) {
        var docDomEl = $document[0];
        var offsetParent = element.offsetParent || docDomEl;
        while (offsetParent && offsetParent !== docDomEl && isStaticPositioned(offsetParent) ) {
            offsetParent = offsetParent.offsetParent;
        }
        return offsetParent || docDomEl;
    };

    return {
        /**
        * Provides read-only equivalent of jQuery's position function:
        * http://api.jquery.com/position/
        */
        position: function (element) {
            var elBCR = this.offset(element);
            var offsetParentBCR = { top: 0, left: 0 };
            var offsetParentEl = parentOffsetEl(element[0]);
            if (offsetParentEl != $document[0]) {
                offsetParentBCR = this.offset(angular.element(offsetParentEl));
                offsetParentBCR.top += offsetParentEl.clientTop - offsetParentEl.scrollTop;
                offsetParentBCR.left += offsetParentEl.clientLeft - offsetParentEl.scrollLeft;
            }

            var boundingClientRect = element[0].getBoundingClientRect();
            return {
                width: boundingClientRect.width || element.prop('offsetWidth'),
                height: boundingClientRect.height || element.prop('offsetHeight'),
                top: elBCR.top - offsetParentBCR.top,
                left: elBCR.left - offsetParentBCR.left
            };
        },

        /**
        * Provides read-only equivalent of jQuery's offset function:
        * http://api.jquery.com/offset/
        */
        offset: function (element) {
            var boundingClientRect = element[0].getBoundingClientRect();
            return {
                width: boundingClientRect.width || element.prop('offsetWidth'),
                height: boundingClientRect.height || element.prop('offsetHeight'),
                top: boundingClientRect.top + ($window.pageYOffset || $document[0].documentElement.scrollTop),
                left: boundingClientRect.left + ($window.pageXOffset || $document[0].documentElement.scrollLeft)
            };
        },

        /**
        * Provides coordinates for the targetEl in relation to hostEl
        */
        positionElements: function (hostEl, targetEl, positionStr, appendToBody) {

            var positionStrParts = positionStr.split('-');
            var pos0 = positionStrParts[0], pos1 = positionStrParts[1] || 'center';

            var hostElPos,
            targetElWidth,
            targetElHeight,
            targetElPos;

            hostElPos = appendToBody ? this.offset(hostEl) : this.position(hostEl);

            targetElWidth = targetEl.prop('offsetWidth');
            targetElHeight = targetEl.prop('offsetHeight');

            var shiftWidth = {
                center: function () {
                    return hostElPos.left + hostElPos.width / 2 - targetElWidth / 2;
                },
                left: function () {
                    return hostElPos.left;
                },
                right: function () {
                    return hostElPos.left + hostElPos.width;
                }
            };

            var shiftHeight = {
                center: function () {
                    return hostElPos.top + hostElPos.height / 2 - targetElHeight / 2;
                },
                top: function () {
                    return hostElPos.top;
                },
                bottom: function () {
                    return hostElPos.top + hostElPos.height;
                }
            };

            switch (pos0) {
                case 'right':
                targetElPos = {
                    top: shiftHeight[pos1](),
                    left: shiftWidth[pos0]()
                };
                break;
                case 'left':
                targetElPos = {
                    top: shiftHeight[pos1](),
                    left: hostElPos.left - targetElWidth
                };
                break;
                case 'bottom':
                targetElPos = {
                    top: shiftHeight[pos0](),
                    left: shiftWidth[pos1]()
                };
                break;
                default:
                targetElPos = {
                    top: hostElPos.top - targetElHeight,
                    left: shiftWidth[pos1]()
                };
                break;
            }

            return targetElPos;
        }
    };
}]);

// Source: js/loading-bar.js
/**
 * Loading-Bar
 * @type {directives}
 * @description [description]
 */


var LoadingBar = angular.module('lussa.ui.loadingBar', []);

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
// Source: js/main.js
/**
 * @ngdoc overview
 * @name lussa.ui
 *
 * @description
 * Lussa UI components
 *
 * @requires [description]
 */
var LussaUi = angular.module('lussa.ui',[
    // form
    'lussa.ui.form',
    // helper
    'lussa.ui.helper',
    // dropdown
    'lussa.ui.dropdown',
    // components
    'lussa.ui.loadingBar',
    'lussa.ui.toast',
    'lussa.ui.tabs',
//  'lussa.ui.preloader',
    'lussa.ui.pagination',
    'lussa.ui.carousel',
    'lussa.ui.collapse',
    'lussa.ui.offcanvas',
    'lussa.ui.table',
    'lussa.ui.modal',
    'lussa.ui.tooltip',
    'lussa.ui.popover'
]);

// Source: js/modal.js
/**
 * @ngdoc overview
 *
 * @name lussa.ui.modal
 * @module lussa.ui.modal
 * @description [description]
 */
var modal = angular.module('lussa.ui.modal', []);

/**
 * A helper, internal data structure that acts as a map but also allows getting /   removing
 * elements in the LIFO order
 */

modal.factory('$$stackedMap', function () {
    return {
        createNew: function () {
            var stack = [];

            return {
                add: function (key, value) {
                    stack.push({
                        key: key,
                        value: value
                    });
                },
                get: function (key) {
                    for (var i = 0; i < stack.length; i++) {
                        if (key == stack[i].key) {
                            return stack[i];
                        }
                    }
                },
                keys: function() {
                    var keys = [];
                    for (var i = 0; i < stack.length; i++) {
                        keys.push(stack[i].key);
                    }
                    return keys;
                },
                top: function () {
                    return stack[stack.length - 1];
                },
                remove: function (key) {
                    var idx = -1;
                    for (var i = 0; i < stack.length; i++) {
                        if (key == stack[i].key) {
                            idx = i;
                            break;
                        }
                    }
                    return stack.splice(idx, 1)[0];
                },
                removeTop: function () {
                    return stack.splice(stack.length - 1, 1)[0];
                },
                length: function () {
                    return stack.length;
                }
            };
        }
    };
});


/**
 * A helper, internal data structure that stores all references attached to key
 */

modal.factory('$$multiMap', function() {
    return {
        createNew: function() {
            var map = {};

            return {
                entries: function() {
                    return Object.keys(map).map(function(key) {
                        return {
                            key: key,
                            value: map[key]
                        };
                    });
                },
                get: function(key) {
                    return map[key];
                },
                hasKey: function(key) {
                    return !!map[key];
                },
                keys: function() {
                    return Object.keys(map);
                },
                put: function(key, value) {
                    if (!map[key]) {
                        map[key] = [];
                    }

                    map[key].push(value);
                },
                remove: function(key, value) {
                    var values = map[key];

                    if (!values) {
                        return;
                    }

                    var idx = values.indexOf(value);

                    if (idx !== -1) {
                        values.splice(idx, 1);
                    }

                    if (!values.length) {
                        delete map[key];
                    }
                }
            };
        }
    };
});

/**
 * @ngdoc directive
 * @name modalBackdrop
 * @module lussa.ui.modal
 * @description A helper directive for the $modal service. It creates a backdrop element.
 */

modal.directive('modalBackdrop', ['$animateCss', '$injector', '$modalStack',
function($animateCss, $injector, $modalStack) {
    return {
        replace     : true,
        template    : '<div class="modal-backdrop"'+
            '     modal-animation-class="fade"'+
            '     modal-in-class="in"'+
            '     ng-style="{\'z-index\': 1040 + (index && 1 || 0) + index*10}"'+
            '></div>',
        compile     : function(tElement, tAttrs) {
            tElement.addClass(tAttrs.backdropClass);
            return linkFn;
        }
    };

    function linkFn(scope, element, attrs) {
        if (attrs.modalInClass) {
            $animateCss(element, {
                addClass: attrs.modalInClass
            }).start();

            scope.$on($modalStack.NOW_CLOSING_EVENT, function(e, setIsAsync) {
                var done = setIsAsync();
                if (scope.modalOptions.animation) {
                    $animateCss(element, {
                        removeClass: attrs.modalInClass
                    }).start().then(done);
                } else {
                    done();
                }
            });
        }
    }
}]);

/**
 * @ngdoc directive
 * @name modalWindow
 * @module lussa.ui.modal
 * @description A helper directive for the $modal service. It creates a window element.
 */

modal.directive('modalWindow', ['$modalStack', '$q', '$animate', '$animateCss', '$document',
  function($modalStack, $q, $animate, $animateCss, $document) {

    var template =  '<div modal-render="{{$isRendered}}" tabindex="-1" role="dialog" class="modal"'+
        '    modal-animation-class="fade"'+
        '    modal-in-class="in"'+
        '    ng-style="{\'z-index\': 1050 + index*10, display: \'block\'}">'+
        '    <div class="modal-dialog" ng-class="size ? \'modal-\' + size : \'\'"><div class="modal-content" modal-transclude></div></div>'+
        '</div>';

    return {
        scope: {
            index: '@'
        },
        replace: true,
        transclude: true,
        template: template,
        link: function(scope, element, attrs) {
            element.addClass(attrs.windowClass || '');
            element.addClass(attrs.windowTopClass || '');
            scope.size = attrs.size;

            scope.close = function(evt) {
                var modal = $modalStack.getTop();
                if (modal && modal.value.backdrop &&
                    modal.value.backdrop !== 'static' &&
                    evt.target === evt.currentTarget) {
                        evt.preventDefault();
                        evt.stopPropagation();
                        $modalStack.dismiss(modal.key, 'backdrop click');
                    }
                };

                // moved from template to fix issue #2280
                element.on('click', scope.close);

                // This property is only added to the scope for the purpose of detecting when this directive is rendered.
                // We can detect that by using this property in the template associated with this directive and then use
                // {@link Attribute#$observe} on it. For more details please see {@link TableColumnResize}.
                scope.$isRendered = true;

                // Deferred object that will be resolved when this modal is render.
                var modalRenderDeferObj = $q.defer();
                // Observe function will be called on next digest cycle after compilation, ensuring that the DOM is ready.
                // In order to use this way of finding whether DOM is ready, we need to observe a scope property used in modal's template.
                attrs.$observe('modalRender', function(value) {
                    if (value === 'true') {
                        modalRenderDeferObj.resolve();
                    }
                });

                modalRenderDeferObj.promise.then(function() {
                    var animationPromise = null;

                    if (attrs.modalInClass) {
                        animationPromise = $animateCss(element, {
                            addClass: attrs.modalInClass
                        }).start();

                        scope.$on($modalStack.NOW_CLOSING_EVENT, function(e, setIsAsync) {
                            var done = setIsAsync();
                            if ($animateCss) {
                                $animateCss(element, {
                                    removeClass: attrs.modalInClass
                                }).start().then(done);
                            } else {
                                $animate.removeClass(element, attrs.modalInClass).then(done);
                            }
                        });
                    }


                    $q.when(animationPromise).then(function() {
                        /**
                        * If something within the freshly-opened modal already has focus (perhaps via a
                        * directive that causes focus). then no need to try and focus anything.
                        */
                        if (!($document[0].activeElement && element[0].contains($document[0].activeElement))) {
                            var inputWithAutofocus = element[0].querySelector('[autofocus]');
                            /**
                            * Auto-focusing of a freshly-opened modal element causes any child elements
                            * with the autofocus attribute to lose focus. This is an issue on touch
                            * based devices which will show and then hide the onscreen keyboard.
                            * Attempts to refocus the autofocus element via JavaScript will not reopen
                            * the onscreen keyboard. Fixed by updated the focusing logic to only autofocus
                            * the modal element if the modal does not contain an autofocus element.
                            */
                            if (inputWithAutofocus) {
                                inputWithAutofocus.focus();
                            } else {
                                element[0].focus();
                            }
                        }
                    });

                    // Notify {@link $modalStack} that modal is rendered.
                    var modal = $modalStack.getTop();
                    if (modal) {
                        $modalStack.modalRendered(modal.key);
                    }
                });
            }
        };
}]);

/**
 * @ngdoc directive
 * @name modalAnimationClass
 * @module lussa.ui.modal
 * @description A helper to create pop-up animation come live
 */
modal.directive('modalAnimationClass', [
  function () {
  return {
    compile: function (tElement, tAttrs) {
      if (tAttrs.modalAnimation) {
        tElement.addClass(tAttrs.modalAnimationClass);
      }
    }
  };
}]);

/**
 * @ngdoc directive
 * @name modalTransclude
 * @module lussa.ui.modal
 * @description Transclude content into window, provide proxy to scope from parent controller
 */
modal.directive('modalTransclude', function () {
  return {
    link: function($scope, $element, $attrs, controller, $transclude) {
      $transclude($scope.$parent, function(clone) {
        $element.empty();
        $element.append(clone);
      });
    }
  };
});

/**
 * @ngdoc interface(service)
 * @name $modalStack
 * @module lussa.ui.modal
 * @description Main Service of modal
 */
modal.factory('$modalStack', ['$animate', '$animateCss', '$document',
    '$compile', '$rootScope', '$q', '$$multiMap', '$$stackedMap',
    function($animate, $animateCss, $document, $compile, $rootScope, $q, $$multiMap, $$stackedMap) {
    var OPENED_MODAL_CLASS = 'modal-open';

    var backdropDomEl, backdropScope;
    var openedWindows = $$stackedMap.createNew();
    var openedClasses = $$multiMap.createNew();
    var $modalStack = {
        NOW_CLOSING_EVENT: 'modal.stack.now-closing'
    };

    //Modal focus behavior
    var focusableElementList;
    var focusIndex = 0;
    var tababbleSelector = 'a[href], area[href], input:not([disabled]), ' +
    'button:not([disabled]),select:not([disabled]), textarea:not([disabled]), ' +
    'iframe, object, embed, *[tabindex], *[contenteditable=true]';

    function backdropIndex() {
        var topBackdropIndex = -1;
        var opened = openedWindows.keys();
        for (var i = 0; i < opened.length; i++) {
            if (openedWindows.get(opened[i]).value.backdrop) {
                topBackdropIndex = i;
            }
        }
        return topBackdropIndex;
    }

    $rootScope.$watch(backdropIndex, function(newBackdropIndex) {
        if (backdropScope) {
            backdropScope.index = newBackdropIndex;
        }
    });

    function removeModalWindow(modalInstance, elementToReceiveFocus) {
        var modalWindow = openedWindows.get(modalInstance).value;
        var appendToElement = modalWindow.appendTo;

        //clean up the stack
        openedWindows.remove(modalInstance);

        removeAfterAnimate(modalWindow.modalDomEl, modalWindow.modalScope, function() {
            var modalBodyClass = modalWindow.openedClass || OPENED_MODAL_CLASS;
            openedClasses.remove(modalBodyClass, modalInstance);
            appendToElement.toggleClass(modalBodyClass, openedClasses.hasKey(modalBodyClass));
            toggleTopWindowClass(true);
        });
        checkRemoveBackdrop();

        //move focus to specified element if available, or else to body
        if (elementToReceiveFocus && elementToReceiveFocus.focus) {
            elementToReceiveFocus.focus();
        } else {
            appendToElement.focus();
        }
    }

    // Add or remove "windowTopClass" from the top window in the stack
    function toggleTopWindowClass(toggleSwitch) {
        var modalWindow;

        if (openedWindows.length() > 0) {
            modalWindow = openedWindows.top().value;
            modalWindow.modalDomEl.toggleClass(modalWindow.windowTopClass || '', toggleSwitch);
        }
    }

    function checkRemoveBackdrop() {
        //remove backdrop if no longer needed
        if (backdropDomEl && backdropIndex() === -1) {
            var backdropScopeRef = backdropScope;
            removeAfterAnimate(backdropDomEl, backdropScope, function() {
                backdropScopeRef = null;
            });
            backdropDomEl = undefined;
            backdropScope = undefined;
        }
    }

    function removeAfterAnimate(domEl, scope, done, closedDeferred) {
        var asyncDeferred;
        var asyncPromise = null;
        var setIsAsync = function() {
            if (!asyncDeferred) {
                asyncDeferred = $q.defer();
                asyncPromise = asyncDeferred.promise;
            }

            return function asyncDone() {
                asyncDeferred.resolve();
            };
        };
        scope.$broadcast($modalStack.NOW_CLOSING_EVENT, setIsAsync);

        // Note that it's intentional that asyncPromise might be null.
        // That's when setIsAsync has not been called during the
        // NOW_CLOSING_EVENT broadcast.
        return $q.when(asyncPromise).then(afterAnimating);

        function afterAnimating() {
            if (afterAnimating.done) {
                return;
            }
            afterAnimating.done = true;

            $animateCss(domEl, {
                event: 'leave'
            }).start().then(function() {
                domEl.remove();
                if (closedDeferred) {
                    closedDeferred.resolve();
                }
            });

            scope.$destroy();
            if (done) {
                done();
            }
        }
    }

    $document.on('keydown', keydownListener);

    $rootScope.$on('$destroy', function() {
        $document.off('keydown', keydownListener);
    });

    function keydownListener(evt) {
        if (evt.isDefaultPrevented()) {
            return evt;
        }

        var modal = openedWindows.top();
        if (modal) {
            switch (evt.which) {
                case 27: {
                    if (modal.value.keyboard) {
                        evt.preventDefault();
                        $rootScope.$apply(function() {
                            $modalStack.dismiss(modal.key, 'escape key press');
                        });
                    }
                    break;
                }
                case 9: {
                    $modalStack.loadFocusElementList(modal);
                    var focusChanged = false;
                    if (evt.shiftKey) {
                        if ($modalStack.isFocusInFirstItem(evt)) {
                            focusChanged = $modalStack.focusLastFocusableElement();
                        }
                    } else {
                        if ($modalStack.isFocusInLastItem(evt)) {
                            focusChanged = $modalStack.focusFirstFocusableElement();
                        }
                    }

                    if (focusChanged) {
                        evt.preventDefault();
                        evt.stopPropagation();
                    }
                    break;
                }
            }
        }
    }

    $modalStack.open = function(modalInstance, modal) {
        var modalOpener = $document[0].activeElement,
        modalBodyClass = modal.openedClass || OPENED_MODAL_CLASS;

        toggleTopWindowClass(false);

        openedWindows.add(modalInstance, {
            deferred: modal.deferred,
            renderDeferred: modal.renderDeferred,
            closedDeferred: modal.closedDeferred,
            modalScope: modal.scope,
            backdrop: modal.backdrop,
            keyboard: modal.keyboard,
            openedClass: modal.openedClass,
            windowTopClass: modal.windowTopClass,
            animation: modal.animation,
            appendTo: modal.appendTo
        });

        openedClasses.put(modalBodyClass, modalInstance);

        var appendToElement = modal.appendTo,
        currBackdropIndex = backdropIndex();

        if (!appendToElement.length) {
            throw new Error('appendTo element not found. Make sure that the element passed is in DOM.');
        }

        if (currBackdropIndex >= 0 && !backdropDomEl) {
            backdropScope = $rootScope.$new(true);
            backdropScope.modalOptions = modal;
            backdropScope.index = currBackdropIndex;
            backdropDomEl = angular.element('<div modal-backdrop="modal-backdrop"></div>');
            backdropDomEl.attr('backdrop-class', modal.backdropClass);
            if (modal.animation) {
                backdropDomEl.attr('modal-animation', 'true');
            }
            $compile(backdropDomEl)(backdropScope);
            $animate.enter(backdropDomEl, appendToElement);
        }

        var angularDomEl = angular.element('<div modal-window="modal-window"></div>');
        angularDomEl.attr({
            'template-url': modal.windowTemplateUrl,
            'window-class': modal.windowClass,
            'window-top-class': modal.windowTopClass,
            'size': modal.size,
            'index': openedWindows.length() - 1,
            'animate': 'animate'
        }).html(modal.content);
        if (modal.animation) {
            angularDomEl.attr('modal-animation', 'true');
        }

        $animate.enter(angularDomEl, appendToElement)
        .then(function() {
            $compile(angularDomEl)(modal.scope);
            $animate.addClass(appendToElement, modalBodyClass);
        });

        openedWindows.top().value.modalDomEl = angularDomEl;
        openedWindows.top().value.modalOpener = modalOpener;

        $modalStack.clearFocusListCache();
    };

    function broadcastClosing(modalWindow, resultOrReason, closing) {
        return !modalWindow.value.modalScope.$broadcast('modal.closing', resultOrReason, closing).defaultPrevented;
    }

    $modalStack.close = function(modalInstance, result) {
        var modalWindow = openedWindows.get(modalInstance);
        if (modalWindow && broadcastClosing(modalWindow, result, true)) {
            modalWindow.value.modalScope.$$DestructionScheduled = true;
            modalWindow.value.deferred.resolve(result);
            removeModalWindow(modalInstance, modalWindow.value.modalOpener);
            return true;
        }
        return !modalWindow;
    };

    $modalStack.dismiss = function(modalInstance, reason) {
        var modalWindow = openedWindows.get(modalInstance);
        if (modalWindow && broadcastClosing(modalWindow, reason, false)) {
            modalWindow.value.modalScope.$$DestructionScheduled = true;
            modalWindow.value.deferred.reject(reason);
            removeModalWindow(modalInstance, modalWindow.value.modalOpener);
            return true;
        }
        return !modalWindow;
    };

    $modalStack.dismissAll = function(reason) {
        var topModal = this.getTop();
        while (topModal && this.dismiss(topModal.key, reason)) {
            topModal = this.getTop();
        }
    };

    $modalStack.getTop = function() {
        return openedWindows.top();
    };

    $modalStack.modalRendered = function(modalInstance) {
        var modalWindow = openedWindows.get(modalInstance);
        if (modalWindow) {
            modalWindow.value.renderDeferred.resolve();
        }
    };

    $modalStack.focusFirstFocusableElement = function() {
        if (focusableElementList.length > 0) {
            focusableElementList[0].focus();
            return true;
        }
        return false;
    };
    $modalStack.focusLastFocusableElement = function() {
        if (focusableElementList.length > 0) {
            focusableElementList[focusableElementList.length - 1].focus();
            return true;
        }
        return false;
    };

    $modalStack.isFocusInFirstItem = function(evt) {
        if (focusableElementList.length > 0) {
            return (evt.target || evt.srcElement) === focusableElementList[0];
        }
        return false;
    };

    $modalStack.isFocusInLastItem = function(evt) {
        if (focusableElementList.length > 0) {
            return (evt.target || evt.srcElement) === focusableElementList[focusableElementList.length - 1];
        }
        return false;
    };

    $modalStack.clearFocusListCache = function() {
        focusableElementList = [];
        focusIndex = 0;
    };

    $modalStack.loadFocusElementList = function(modalWindow) {
        if (focusableElementList === undefined || !focusableElementList.length) {
            if (modalWindow) {
                var modalDomE1 = modalWindow.value.modalDomEl;
                if (modalDomE1 && modalDomE1.length) {
                    focusableElementList = modalDomE1[0].querySelectorAll(tababbleSelector);
                }
            }
        }
    };

    return $modalStack;
}]);

/**
 * @ngdoc interface(service)
 * @name $modal
 * @module lussa.ui.modal
 * @description Main Provider of modal
 */
modal.provider('$modal', function() {
    var $modalProvider = {
        options: {
            animation: true,
            backdrop: true, //can also be false or 'static'
            keyboard: true
        },
        $get : ['$injector', '$rootScope', '$q', '$document', '$templateRequest', '$controller', '$modalStack',
        function ($injector, $rootScope, $q, $document, $templateRequest, $controller, $modalStack) {
            var $modal = {};

            function getTemplatePromise(options) {
                return options.template ? $q.when(options.template) :
                $templateRequest(angular.isFunction(options.templateUrl) ?
                options.templateUrl() : options.templateUrl);
            }

            function getResolvePromises(resolves) {
                var promisesArr = [];
                angular.forEach(resolves, function(value) {
                    if (angular.isFunction(value) || angular.isArray(value)) {
                        promisesArr.push($q.when($injector.invoke(value)));
                    } else if (angular.isString(value)) {
                        promisesArr.push($q.when($injector.get(value)));
                    } else {
                        promisesArr.push($q.when(value));
                    }
                });
                return promisesArr;
            }

            var promiseChain = null;
            $modal.getPromiseChain = function() {
                return promiseChain;
            };

            $modal.open = function(modalOptions) {
                var modalResultDeferred = $q.defer();
                var modalOpenedDeferred = $q.defer();
                var modalClosedDeferred = $q.defer();
                var modalRenderDeferred = $q.defer();

                //prepare an instance of a modal to be injected into controllers and returned to a caller
                var modalInstance = {
                    result: modalResultDeferred.promise,
                    opened: modalOpenedDeferred.promise,
                    closed: modalClosedDeferred.promise,
                    rendered: modalRenderDeferred.promise,
                    close: function (result) {
                        return $modalStack.close(modalInstance, result);
                    },
                    dismiss: function (reason) {
                        return $modalStack.dismiss(modalInstance, reason);
                    }
                };

                //merge and clean up options
                modalOptions = angular.extend({}, $modalProvider.options, modalOptions);
                modalOptions.resolve = modalOptions.resolve || {};
                modalOptions.appendTo = modalOptions.appendTo || $document.find('body').eq(0);

                //verify options
                if (!modalOptions.template && !modalOptions.templateUrl) {
                    throw new Error('One of template or templateUrl options is required.');
                }

                var templateAndResolvePromise =
                $q.all([getTemplatePromise(modalOptions)].concat(getResolvePromises(modalOptions.resolve)));

                function resolveWithTemplate() {
                    return templateAndResolvePromise;
                }

                // Wait for the resolution of the existing promise chain.
                // Then switch to our own combined promise dependency (regardless of how the previous modal fared).
                // Then add to $modalStack and resolve opened.
                // Finally clean up the chain variable if no subsequent modal has overwritten it.
                var samePromise;
                samePromise = promiseChain = $q.all([promiseChain])
                .then(resolveWithTemplate, resolveWithTemplate)
                .then(function resolveSuccess(tplAndVars) {

                    var modalScope = (modalOptions.scope || $rootScope).$new();
                    modalScope.$close = modalInstance.close;
                    modalScope.$dismiss = modalInstance.dismiss;

                    modalScope.$on('$destroy', function() {
                        if (!modalScope.$$DestructionScheduled) {
                            modalScope.$dismiss('$UnscheduledDestruction');
                        }
                    });

                    var ctrlInstance, ctrlLocals = {};
                    var resolveIter = 1;

                    //controllers
                    if (modalOptions.controller) {
                        ctrlLocals.$scope = modalScope;
                        ctrlLocals.$modalInstance = modalInstance;
                        angular.forEach(modalOptions.resolve, function(value, key) {
                            ctrlLocals[key] = tplAndVars[resolveIter++];
                        });

                        ctrlInstance = $controller(modalOptions.controller, ctrlLocals);
                        if (modalOptions.controllerAs) {
                            if (modalOptions.bindToController) {
                                angular.extend(ctrlInstance, modalScope);
                            }

                            modalScope[modalOptions.controllerAs] = ctrlInstance;
                        }
                    }

                    $modalStack.open(modalInstance, {
                        scope: modalScope,
                        deferred: modalResultDeferred,
                        renderDeferred: modalRenderDeferred,
                        closedDeferred: modalClosedDeferred,
                        content: tplAndVars[0],
                        animation: modalOptions.animation,
                        backdrop: modalOptions.backdrop,
                        keyboard: modalOptions.keyboard,
                        backdropClass: modalOptions.backdropClass,
                        windowTopClass: modalOptions.windowTopClass,
                        windowClass: modalOptions.windowClass,
                        windowTemplateUrl: modalOptions.windowTemplateUrl,
                        size: modalOptions.size,
                        openedClass: modalOptions.openedClass,
                        appendTo: modalOptions.appendTo
                    });
                    modalOpenedDeferred.resolve(true);

                }, function resolveError(reason) {
                    modalOpenedDeferred.reject(reason);
                    modalResultDeferred.reject(reason);
                })['finally'](function() {
                    if (promiseChain === samePromise) {
                        promiseChain = null;
                    }
                });

                return modalInstance;
            };

            return $modal;
        }
    ]};

    return $modalProvider;
});

// Source: js/offcanvas.js
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

// Source: js/pagination.js
/**
 * [pagination description]
 * @type {[type]}
 */
var pagination = angular.module('lussa.ui.pagination', []);

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
pagination.directive('paginationBar', ['$log','$sce',
	function($log, $sce){

	// init vars
	var DEFAULT_ITEM_PER_PAGE = 10,
		TEMPLATE_DEFAULT = '<nav>'+
		'<ul>'+
		'	<!-- previous -->'+
		'	<li ng-hide="previousPage() == false"><a ng-href="{{ path }}?page={{ previousPage() }}">'+
		'		<span class="icon icon-ios-arrow-left pagination-icon-prev"></span>sebelumnya</a></li>'+
		'	<!-- early segment -->'+
		'	<li ng-hide="pages.early.length < 1" ng-repeat="page in pages.early">'+
		'		<a ng-href="{{ path }}?page={{ page }}">{{page}}</a></li>'+
		'	<li ng-hide="pages.early.length < 1" class="separator">...</li>'+
		'	<!-- middle -->'+
		'	<li ng-hide="pages.middle.length < 1" ng-repeat="page in pages.middle" ng-class="page == currentPage?\'active\':\'\'">'+
		'		<a ng-href="{{ path }}?page={{ page }}">{{page}}</a></li>'+
		'	<!-- last segment -->'+
		'	<li ng-hide="pages.last.length < 1" class="separator">...</li>'+
		'	<li ng-hide="pages.last.length < 1" ng-repeat="page in pages.last">'+
		'		<a ng-href="{{ path }}?page={{ page }}">{{page}}</a></li>'+
		'	<!-- next segment -->'+
		'	<li ng-hide="nextPage() == false"><a ng-href="{{ path }}?page={{ nextPage() }}">selanjutnya'+
		'		<span class="icon icon-ios-arrow-right pagination-icon-next"></span></a></li>'+
		'</ul>'+
		'</nav>';

	// Runs during compile
	return {
		restrict : 'E',
		scope : {
			'currentPage' : '@',
			'itemPerPage' : '@',
			'totalItems' : '@',
			'path' : '@'
		},
		template: TEMPLATE_DEFAULT,
		// isolate controller
		link: function(scope, element, attributes, controller){
			var segment = {
				middle : 5,
				tip : 3
			};

			// attribute
			scope.path = scope.path ||  window.location.pathname;
			scope.currentPage = scope.currentPage || 1;
			scope.totalItems = scope.totalItems || 1;
			scope.itemPerPage = scope.itemPerPage || DEFAULT_ITEM_PER_PAGE;
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

// Source: js/popover.js
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

// Source: js/table.js
/**
 * @ngdoc overview
 *
 * @name lussa.ui.table
 * @description [description]
 */
var table = angular.module('lussa.ui.table',[]);

/**
 * @ngdoc object
 *
 * @name tableDefaults
 * @module lussa.ui.table
 * @description default parameter for table
 */
table.value('tableDefaults', {
    params: {},
    settings: {}
});


/**
 * @ngdoc service
 * @name TableParams
 * @module lussa.ui.table
 * @description Parameters manager for uiTable
 */

table.factory('TableParams', ['$q', '$log', 'tableDefaults',
    function($q, $log, tableDefaults) {
    var isNumber = function(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    };
    var TableParams = function(baseParameters, baseSettings) {
        var self = this,
            log = function() {
                if (settings.debugMode && $log.debug) {
                    $log.debug.apply(this, arguments);
                }
            };

        this.data = [];

        /**
         * @ngdoc method
         * @name TableParams#parameters
         * @description Set new parameters or get current parameters
         *
         * @param {string} newParameters      New parameters
         * @param {string} parseParamsFromUrl Flag if parse parameters like in url
         * @returns {Object} Current parameters or `this`
         */
        this.parameters = function(newParameters, parseParamsFromUrl) {
            parseParamsFromUrl = parseParamsFromUrl || false;
            if (angular.isDefined(newParameters)) {
                for (var key in newParameters) {
                    var value = newParameters[key];
                    if (parseParamsFromUrl && key.indexOf('[') >= 0) {
                        var keys = key.split(/\[(.*)\]/).reverse();
                        var lastKey = '';
                        for (var i = 0, len = keys.length; i < len; i++) {
                            var name = keys[i];
                            if (name !== '') {
                                var v = value;
                                value = {};
                                value[lastKey = name] = (isNumber(v) ? parseFloat(v) : v);
                            }
                        }
                        if (lastKey === 'sorting') {
                            params[lastKey] = {};
                        }
                        params[lastKey] = angular.extend(params[lastKey] || {}, value[lastKey]);
                    } else {
                        params[key] = (isNumber(newParameters[key]) ? parseFloat(newParameters[key]) : newParameters[key]);
                    }
                }
                log('uiTable: set parameters', params);
                return this;
            }
            return params;
        };

        /**
         * @ngdoc method
         * @name TableParams#settings
         * @description Set new settings for table
         *
         * @param {string} newSettings New settings or undefined
         * @returns {Object} Current settings or `this`
         */
        this.settings = function(newSettings) {
            if (angular.isDefined(newSettings)) {
                if (angular.isArray(newSettings.data)) {
                    //auto-set the total from passed in data
                    newSettings.total = newSettings.data.length;
                }
                settings = angular.extend(settings, newSettings);
                log('uiTable: set settings', settings);
                return this;
            }
            return settings;
        };

        /**
         * @ngdoc method
         * @name TableParams#page
         * @description If parameter page not set return current page else set current page
         *
         * @param {string} page Page number
         * @returns {Object|Number} Current page or `this`
         */
        this.page = function(page) {
            return angular.isDefined(page) ? this.parameters({
                'page': page
            }) : params.page;
        };

        /**
         * @ngdoc method
         * @name TableParams#total
         * @description If parameter total not set return current quantity else set quantity
         *
         * @param {string} total Total quantity of items
         * @returns {Object|Number} Current page or `this`
         */
        this.total = function(total) {
            return angular.isDefined(total) ? this.settings({
                'total': total
            }) : settings.total;
        };

        /**
         * @ngdoc method
         * @name TableParams#count
         * @description If parameter count not set return current count per page else set count per page
         *
         * @param {string} count Count per number
         * @returns {Object|Number} Count per page or `this`
         */
        this.count = function(count) {
            // reset to first page because can be blank page
            return angular.isDefined(count) ? this.parameters({
                'count': count,
                'page': 1
            }) : params.count;
        };

        /**
         * @ngdoc method
         * @name TableParams#filter
         * @description If parameter page not set return current filter else set current filter
         *
         * @param {string} filter New filter
         * @returns {Object} Current filter or `this`
         */
        this.filter = function(filter) {
            return angular.isDefined(filter) ? this.parameters({
                'filter': filter,
                'page': 1
            }) : params.filter;
        };

        /**
         * @ngdoc method
         * @name TableParams#sorting
         * @description If 'sorting' parameter is not set, return current sorting. Otherwise set current sorting.
         *
         * @param {string} sorting New sorting
         * @returns {Object} Current sorting or `this`
         */
        this.sorting = function(sorting) {
            if (arguments.length == 2) {
                var sortArray = {};
                sortArray[sorting] = arguments[1];
                this.parameters({
                    'sorting': sortArray
                });
                return this;
            }
            return angular.isDefined(sorting) ? this.parameters({
                'sorting': sorting
            }) : params.sorting;
        };

        /**
         * @ngdoc method
         * @name TableParams#isSortBy
         * @description Checks sort field
         *
         * @param {string} field     Field name
         * @param {string} direction Direction of sorting 'asc' or 'desc'
         * @returns {Array} Return true if field sorted by direction
         */
        this.isSortBy = function(field, direction) {
            return angular.isDefined(params.sorting[field]) && angular.equals(params.sorting[field], direction);
        };

        /**
         * @ngdoc method
         * @name TableParams#orderBy
         * @description Return object of sorting parameters for angular filter
         *
         * @returns {Array} Array like: [ '-name', '+age' ]
         */
        this.orderBy = function() {
            var sorting = [];
            for (var column in params.sorting) {
                sorting.push((params.sorting[column] === "asc" ? "+" : "-") + column);
            }
            return sorting;
        };

        /**
         * @ngdoc method
         * @name TableParams#getData
         * @description Called when updated some of parameters for get new data
         *
         * @param {Object} $defer promise object
         * @param {Object} params New parameters
         */
        this.getData = function($defer, params) {
            if (angular.isArray(this.data) && angular.isObject(params)) {
                $defer.resolve(this.data.slice((params.page() - 1) * params.count(), params.page() * params.count()));
            } else {
                $defer.resolve([]);
            }
            return $defer.promise;
        };

        /**
         * @ngdoc method
         * @name TableParams#getGroups
         * @description Return groups for table grouping
         */
        this.getGroups = function($defer, column) {
            var defer = $q.defer();

            defer.promise.then(function(data) {
                var groups = {};
                angular.forEach(data, function(item) {
                    var groupName = angular.isFunction(column) ? column(item) : item[column];

                    groups[groupName] = groups[groupName] || {
                        data: []
                    };
                    groups[groupName].value = groupName;
                    groups[groupName].data.push(item);
                });
                var result = [];
                for (var i in groups) {
                    result.push(groups[i]);
                }
                log('uiTable: refresh groups', result);
                $defer.resolve(result);
            });
            return this.getData(defer, self);
        };

        /**
         * @ngdoc method
         * @name TableParams#generatePagesArray
         * @description Generate array of pages
         *
         * @param {boolean} currentPage which page must be active
         * @param {boolean} totalItems  Total quantity of items
         * @param {boolean} pageSize    Quantity of items on page
         * @param {number} maxBlocks    Quantity of blocks for pagination
         * @returns {Array} Array of pages
         */
        this.generatePagesArray = function(currentPage, totalItems, pageSize, maxBlocks) {
            var maxPage, maxPivotPages, minPage, numPages, pages;
            maxBlocks = maxBlocks && maxBlocks < 6 ? 6 : maxBlocks;

            pages = [];
            numPages = Math.ceil(totalItems / pageSize);
            if (numPages > 1) {
                pages.push({
                    type: 'prev',
                    number: Math.max(1, currentPage - 1),
                    active: currentPage > 1
                });
                pages.push({
                    type: 'first',
                    number: 1,
                    active: currentPage > 1,
                    current: currentPage === 1
                });
                maxPivotPages = Math.round((settings.paginationMaxBlocks - settings.paginationMinBlocks) / 2);
                minPage = Math.max(2, currentPage - maxPivotPages);
                maxPage = Math.min(numPages - 1, currentPage + maxPivotPages * 2 - (currentPage - minPage));
                minPage = Math.max(2, minPage - (maxPivotPages * 2 - (maxPage - minPage)));
                var i = minPage;
                while (i <= maxPage) {
                    if ((i === minPage && i !== 2) || (i === maxPage && i !== numPages - 1)) {
                        pages.push({
                            type: 'more',
                            active: false
                        });
                    } else {
                        pages.push({
                            type: 'page',
                            number: i,
                            active: currentPage !== i,
                            current: currentPage === i
                        });
                    }
                    i++;
                }
                pages.push({
                    type: 'last',
                    number: numPages,
                    active: currentPage !== numPages,
                    current: currentPage === numPages
                });
                pages.push({
                    type: 'next',
                    number: Math.min(numPages, currentPage + 1),
                    active: currentPage < numPages
                });
            }
            return pages;
        };

        /**
         * @ngdoc method
         * @name TableParams#url
         * @description Return groups for table grouping
         *
         * @param {boolean} asString flag indicates return array of string or object
         * @returns {Array} If asString = true will be return array of url string parameters else key-value object
         */
        this.url = function(asString) {
            asString = asString || false;
            var pairs = (asString ? [] : {});
            for (var key in params) {
                if (params.hasOwnProperty(key)) {
                    var item = params[key],
                        name = encodeURIComponent(key);
                    if (typeof item === "object") {
                        for (var subkey in item) {
                            if (!angular.isUndefined(item[subkey]) && item[subkey] !== "") {
                                var pname = name + "[" + encodeURIComponent(subkey) + "]";
                                if (asString) {
                                    pairs.push(pname + "=" + item[subkey]);
                                } else {
                                    pairs[pname] = item[subkey];
                                }
                            }
                        }
                    } else if (!angular.isFunction(item) && !angular.isUndefined(item) && item !== "") {
                        if (asString) {
                            pairs.push(name + "=" + encodeURIComponent(item));
                        } else {
                            pairs[name] = encodeURIComponent(item);
                        }
                    }
                }
            }
            return pairs;
        };

        /**
         * @ngdoc method
         * @name TableParams#reload
         * @description Reload table data
         */
        this.reload = function() {
            var $defer = $q.defer(),
                self = this,
                pData = null;

            if (!settings.$scope) {
                return;
            }

            settings.$loading = true;
            if (settings.groupBy) {
                pData = settings.getGroups($defer, settings.groupBy, this);
            } else {
                pData = settings.getData($defer, this);
            }
            log('uiTable: reload data');

            if (!pData) {
                // If getData resolved the $defer, and didn't promise us data,
                //   create a promise from the $defer. We need to return a promise.
                pData = $defer.promise;
            }
            return pData.then(function(data) {
                settings.$loading = false;
                log('uiTable: current scope', settings.$scope);
                if (settings.groupBy) {
                    self.data = data;
                    if (settings.$scope) settings.$scope.$groups = data;
                } else {
                    self.data = data;
                    if (settings.$scope) settings.$scope.$data = data;
                }
                if (settings.$scope) {
                    settings.$scope.pages = self.generatePagesArray(self.page(), self.total(), self.count());
                    settings.$scope.$emit('uiTableAfterReloadData');
                }
                return data;
            });
        };

        this.reloadPages = function() {
            var self = this;
            settings.$scope.pages = self.generatePagesArray(self.page(), self.total(), self.count());
        };

        var params = this.$params = {
            page: 1,
            count: 1,
            filter: {},
            sorting: {},
            group: {},
            groupBy: null
        };
        angular.extend(params, tableDefaults.params);

        var settings = {
            $scope: null, // set by uiTable controller
            $loading: false,
            data: null, //allows data to be set when table is initialized
            total: 0,
            defaultSort: 'desc',
            filterDelay: 750,
            counts: [10, 25, 50, 100],
            paginationMaxBlocks: 11,
            paginationMinBlocks: 5,
            sortingIndicator: 'span',
            getGroups: this.getGroups,
            getData: this.getData
        };
        angular.extend(settings, tableDefaults.settings);

        this.settings(baseSettings);
        this.parameters(baseParameters, true);
        return this;
    };
    return TableParams;
}]);

/**
 * @ngdoc object
 * @name tableController
 * @module lussa.ui.table
 * @description
 * Each {@link uiTable uiTable} directive creates an instance of `tableController`
 */
table.controller('tableController', ['$scope', 'TableParams', '$timeout', '$parse', '$compile', '$attrs', '$element',
    'tableColumn',
function($scope, TableParams, $timeout, $parse, $compile, $attrs, $element, tableColumn) {
    var isFirstTimeLoad = true,
        defaultHeaderTemplate = '<tr>'+
            '    <th title="{{$column.headerTitle(this)}}"'+
            '        ng-repeat="$column in $columns"'+
            '        ng-class="{'+
            '                    \'sortable\': $column.sortable(this),'+
            '                    \'sort-asc\': params.sorting()[$column.sortable(this)]==\'asc\','+
            '                    \'sort-desc\': params.sorting()[$column.sortable(this)]==\'desc\''+
            '                  }"'+
            '        ng-click="sortBy($column, $event)"'+
            '        ng-show="$column.show(this)"'+
            '        ng-init="template = $column.headerTemplateURL(this)"'+
            '        class="header {{$column.class(this)}}">'+
            '          <div ng-if="!template" ng-show="!template" class="ui-table-header" ng-class="{\'sort-indicator\': params.settings().sortingIndicator == \'div\'}">'+
            '            <span ng-bind="$column.title(this)" ng-class="{\'sort-indicator\': params.settings().sortingIndicator == \'span\'}"></span>'+
            '          </div>'+
            '          <div ng-if="template" ng-show="template" ng-include="template"></div>'+
            '    </th>'+
            '</tr>'+
            '<tr ng-show="show_filter" class="ui-table-filters">'+
            '    <th data-title-text="{{$column.titleAlt(this) || $column.title(this)}}" ng-repeat="$column in $columns" ng-show="$column.show(this)" class="filter">'+
            '        <div ng-repeat="(name, filter) in $column.filter(this)">'+
            '            <div ng-if="filter.indexOf(\'/\') !== -1" ng-include="filter"></div>'+
            '            <input type="text" name="{{name}}" ng-disabled="$filterRow.disabled" ng-model="params.filter()[name]" ng-if="filter == \'text\'" class="input-filter form-control" />'+
            '           <select ng-options="data.id as data.title for data in $column.data"'+
            '               ng-disabled="$filterRow.disabled"'+
            '               ng-model="params.filter()[name]"'+
            '               ng-if="filter == \'select\'"'+
            '               class="filter filter-select form-control" name="{{name}}">'+
            '           </select>'+
            '           <select ng-options="data.id as data.title for data in $column.data"'+
            '               ng-disabled="$filterRow.disabled"'+
            '               multiple ng-multiple="true"'+
            '               ng-model="params.filter()[name]"'+
            '               ng-if="filter == \'select-multiple\'"'+
            '               class="filter filter-select-multiple form-control" name="{{name}}">'+
            '           </select>'+
            '        </div>'+
            '    </th>'+
            '</tr>';

    $scope.$filterRow = {};
    $scope.$loading = false;

    // until such times as the directive uses an isolated scope, we need to ensure that the check for
    // the params field only consults the "own properties" of the $scope. This is to avoid seeing the params
    // field on a $scope higher up in the prototype chain
    if (!$scope.hasOwnProperty("params")) {
        $scope.params = new TableParams();
        $scope.params.isNullInstance = true;
    }
    $scope.params.settings().$scope = $scope;

    var delayFilter = (function() {
        var timer = 0;
        return function(callback, ms) {
            $timeout.cancel(timer);
            timer = $timeout(callback, ms);
        };
    })();

    function resetPage() {
        $scope.params.$params.page = 1;
    }

    $scope.$watch('params.$params', function(newParams, oldParams) {

        if (newParams === oldParams) {
            return;
        }

        $scope.params.settings().$scope = $scope;

        if (!angular.equals(newParams.filter, oldParams.filter)) {
            var maybeResetPage = isFirstTimeLoad ? angular.noop : resetPage;
            delayFilter(function() {
                maybeResetPage();
                $scope.params.reload();
            }, $scope.params.settings().filterDelay);
        } else {
            $scope.params.reload();
        }

        if (!$scope.params.isNullInstance) {
            isFirstTimeLoad = false;
        }

    }, true);

    this.compileDirectiveTemplates = function () {
        var headerTemplate,
            paginationTemplate;
        if (!$element.hasClass('ui-table')) {
            $element.addClass('ui-table');
            if ($element.find('> thead').length === 0) {
                if($attrs.templateHeader){
                    $scope.templateHeader = $attrs.templateHeader;
                    headerTemplate = angular.element(document.createElement('thead')).attr('ng-include', 'templateHeader');
                }else{
                    headerTemplate = angular.element(document.createElement('thead')).append($compile(defaultHeaderTemplate)($scope));
                }
                $element.prepend(headerTemplate);
            }
            paginationTemplate = angular.element(document.createElement('div')).attr({
                'table-pagination': 'params'});
            if($attrs.templatePagination){
                $scope.templatePagination = $attrs.templatePagination;
                paginationTemplate.attr('template-url', 'templatePagination');
            }
            $element.after(paginationTemplate);
            if (headerTemplate) {
                $compile(headerTemplate)($scope);
            }
            $compile(paginationTemplate)($scope);
        }
    };

    this.loadFilterData = function ($columns) {
        angular.forEach($columns, function ($column) {
            var def;
            def = $column.filterData($scope, {
                $column: $column
            });
            if (!def) {
                delete $column.filterData;
                return;
            }

            // if we're working with a deferred object, let's wait for the promise
            if ((angular.isObject(def) && angular.isObject(def.promise))) {
                delete $column.filterData;
                return def.promise.then(function(data) {
                    // our deferred can eventually return arrays, functions and objects
                    if (!angular.isArray(data) && !angular.isFunction(data) && !angular.isObject(data)) {
                        // if none of the above was found - we just want an empty array
                        data = [];
                    } else if (angular.isArray(data)) {
                        data.unshift({
                            title: '-',
                            id: ''
                        });
                    }
                    $column.data = data;
                });
            }
            // otherwise, we just return what the user gave us. It could be a function, array, object, whatever
            else {
                $column.data = def;
                return $column.data;
            }
        });
    };

    this.buildColumns = function (columns) {
        return columns.map(function(col){
            return tableColumn.buildColumn(col, $scope);
        });
    };

    this.setupBindingsToInternalScope = function(tableParamsExpr){

        // note: this we're setting up watches to simulate angular's isolated scope bindings

        // note: is REALLY important to watch for a change to the TableParams *reference* rather than
        // $watch for value equivalence. This is because TableParams references the current page of data as
        // a field and it's important not to watch this
        var tableParamsGetter = $parse(tableParamsExpr);
        $scope.$watch(tableParamsGetter, (function (params) {
            if (angular.isUndefined(params)) {
                return;
            }
            $scope.paramsModel = tableParamsGetter;
            $scope.params = params;
        }), false);

        if ($attrs.showFilter) {
            $scope.$parent.$watch($attrs.showFilter, function(value) {
                $scope.show_filter = value;
            });
        }
        if ($attrs.disableFilter) {
            $scope.$parent.$watch($attrs.disableFilter, function(value) {
                $scope.$filterRow.disabled = value;
            });
        }
    };

    $scope.sortBy = function($column, event) {
        var parsedSortable = $column.sortable && $column.sortable();
        if (!parsedSortable) {
            return;
        }
        var defaultSort = $scope.params.settings().defaultSort;
        var inverseSort = (defaultSort === 'asc' ? 'desc' : 'asc');
        var sorting = $scope.params.sorting() && $scope.params.sorting()[parsedSortable] && ($scope.params.sorting()[parsedSortable] === defaultSort);
        var sortingParams = (event.ctrlKey || event.metaKey) ? $scope.params.sorting() : {};
        sortingParams[parsedSortable] = (sorting ? inverseSort : defaultSort);
        $scope.params.parameters({
            sorting: sortingParams
        });
    };
}]);


/**
 * @ngdoc service
 * @name tableColumn
 * @module lussa.ui.table
 * @description
 * Service to construct a $column definition used by {@link uiTable uiTable} directive
 */
table.factory('tableColumn', [function () {

    var defaults = {
        'class': function(){ return ''; },
        filter: function(){ return false; },
        filterData: angular.noop,
        headerTemplateURL: function(){ return false; },
        headerTitle: function(){ return ''; },
        sortable: function(){ return false; },
        show: function(){ return true; },
        title: function(){ return ''; },
        titleAlt: function(){ return ''; }
    };

    /**
     * @ngdoc method
     * @name tableColumn#buildColumn
     * @description Creates a $column for use within a header template
     *
     * @param {Object} column an existing $column or simple column data object
     * @param {Scope} defaultScope the $scope to supply to the $column getter methods when not supplied by caller
     * @returns {Object} a $column object
     */
    function buildColumn(column, defaultScope){
        // note: we're not modifying the original column object. This helps to avoid unintended side affects
        var extendedCol = Object.create(column);
        for (var prop in defaults) {
            if (extendedCol[prop] === undefined) {
                extendedCol[prop] = defaults[prop];
            }
            if(!angular.isFunction(extendedCol[prop])){
                // wrap raw field values with "getter" functions
                // - this is to ensure consistency with how ngTable.compile builds columns
                // - note that the original column object is being "proxied"; this is important
                //   as it ensure that any changes to the original object will be returned by the "getter"
                (function(prop1){
                    extendedCol[prop1] = function(){
                        return column[prop1];
                    };
                })(prop);
            }
            (function(prop1){
                // satisfy the arguments expected by the function returned by parsedAttribute in the ngTable directive
                var getterFn = extendedCol[prop1];
                extendedCol[prop1] = function(){
                    if (arguments.length === 0){
                        return getterFn.call(column, defaultScope);
                    } else {
                        return getterFn.apply(column, arguments);
                    }
                };
            })(prop);
        }
        return extendedCol;
    }

    return {
        buildColumn: buildColumn
    };
}]);

/**
 * @ngdoc directive
 * @name uiTable
 * @module lussa.ui.table
 * @restrict A
 *
 * @description
 * Directive that instantiates {@link tableController tableController}.
 */
table.directive('uiTable', ['$q', '$parse',
    function($q, $parse) {
        return {
            restrict: 'A',
            priority: 1001,
            scope: true,
            controller: 'tableController',
            compile: function(element) {
                var columns = [],
                    i = 0,
                    row = null;

                // IE 8 fix :not(.ui-table-group) selector
                angular.forEach(angular.element(element.find('tr')), function(tr) {
                    tr = angular.element(tr);
                    if (!tr.hasClass('ui-table-group') && !row) {
                        row = tr;
                    }
                });
                if (!row) {
                    return;
                }
                angular.forEach(row.find('td'), function(item) {
                    var el = angular.element(item);
                    if (el.attr('ignore-cell') && 'true' === el.attr('ignore-cell')) {
                        return;
                    }

                    var getAttrValue = function(attr){
                        return el.attr('x-data-' + attr) || el.attr('data-' + attr) || el.attr(attr);
                    };

                    var parsedAttribute = function(attr) {
                        var expr = getAttrValue(attr);
                        if (!expr){
                            return undefined;
                        }
                        return function(scope, locals) {
                            return $parse(expr)(scope, angular.extend(locals || {}, {
                                $columns: columns
                            }));
                        };
                    };

                    var titleExpr = getAttrValue('title-alt') || getAttrValue('title');
                    if (titleExpr){
                        el.attr('data-title-text', '{{' + titleExpr + '}}'); // this used in responsive table
                    }
                    // NOTE TO MAINTAINERS: if you add extra fields to a $column be sure to extend tableColumn with
                    // a corresponding "safe" default
                    columns.push({
                        id: i++,
                        title: parsedAttribute('title'),
                        titleAlt: parsedAttribute('title-alt'),
                        headerTitle: parsedAttribute('header-title'),
                        sortable: parsedAttribute('sortable'),
                        'class': parsedAttribute('header-class'),
                        filter: parsedAttribute('filter'),
                        headerTemplateURL: parsedAttribute('header'),
                        filterData: parsedAttribute('filter-data'),
                        show: (el.attr("ng-show") ? function (scope) {
                            return $parse(el.attr("ng-show"))(scope);
                        } : undefined)
                    });
                });
                return function(scope, element, attrs, controller) {
                    scope.$columns = columns = controller.buildColumns(columns);

                    controller.setupBindingsToInternalScope(attrs.uiTable);
                    controller.loadFilterData(columns);
                    controller.compileDirectiveTemplates();
                };
            }
        };
    }
]);

/**
 * @ngdoc directive
 * @name tableDynamic
 * @module lussa.ui.table
 * @restrict A
 *
 * @description
 * A dynamic version of the {@link uiTable uiTable} directive that accepts a dynamic list of columns
 * definitions to render
 */
table.directive('tableDynamic', ['$parse', function ($parse){

    function parseDirectiveExpression(attr) {
        if (!attr || attr.indexOf(" with ") > -1) {
            var parts = attr.split(/\s+with\s+/);
            return {
                tableParams: parts[0],
                columns: parts[1]
            };
        } else {
            throw new Error('Parse error (expected example: ui-table-dynamic=\'tableParams with cols\')');
        }
    }

    return {
        restrict: 'A',
        priority: 1001,
        scope: true,
        controller: 'tableController',
        compile: function(tElement) {
            var row;

            // IE 8 fix :not(.ui-table-group) selector
            angular.forEach(angular.element(tElement.find('tr')), function(tr) {
                tr = angular.element(tr);
                if (!tr.hasClass('ui-table-group') && !row) {
                    row = tr;
                }
            });
            if (!row) {
                return;
            }

            angular.forEach(row.find('td'), function(item) {
                var el = angular.element(item);
                var getAttrValue = function(attr){
                    return el.attr('x-data-' + attr) || el.attr('data-' + attr) || el.attr(attr);
                };

                // this used in responsive table
                var titleExpr = getAttrValue('title');
                if (!titleExpr){
                    el.attr('data-title-text', '{{$columns[$index].titleAlt(this) || $columns[$index].title(this)}}');
                }
                var showExpr = el.attr('ng-show');
                if (!showExpr){
                    el.attr('ng-show', '$columns[$index].show(this)');
                }
            });

            return function(scope, element, attrs, controller) {
                var expr = parseDirectiveExpression(attrs.tableDynamic);
                var columns = $parse(expr.columns)(scope) || [];
                scope.$columns = controller.buildColumns(columns);

                controller.setupBindingsToInternalScope(expr.tableParams);
                controller.loadFilterData(scope.$columns);
                controller.compileDirectiveTemplates();
            };
        }
    };
}]);

/**
 * @ngdoc directive
 * @name tablePagination
 * @module lussa.ui.table
 * @restrict A
 */
table.directive('tablePagination', ['$compile',
    function($compile) {
        var defaultPagerTemplate = '<div class="ng-cloak ui-table-pager clearfix" ng-if="params.data.length">'+
            '    <div ng-if="params.settings().counts.length" class="ui-table-counts button-group pull-right">'+
            '        <button ng-repeat="count in params.settings().counts" type="button"'+
            '                ng-class="{\'active\':params.count() == count}"'+
            '                ng-click="params.count(count)" class="button button-default">'+
            '            <span ng-bind="count"></span>'+
            '        </button>'+
            '    </div>'+
            '    <ul class="pagination ui-table-pagination">'+
            '            <li ng-class="{\'disabled\': !page.active && !page.current, \'active\': page.current}" ng-repeat="page in pages" ng-switch="page.type">'+
            '                <a ng-switch-when="prev" ng-click="params.page(page.number)" href="">«</a>'+
            '                <a ng-switch-when="first" ng-click="params.page(page.number)" href=""><span ng-bind="page.number"></span></a>'+
            '                <a ng-switch-when="page" ng-click="params.page(page.number)" href=""><span ng-bind="page.number"></span></a>'+
            '                <a ng-switch-when="more" ng-click="params.page(page.number)" href="">…</a>'+
            '                <a ng-switch-when="last" ng-click="params.page(page.number)" href=""><span ng-bind="page.number"></span></a>'+
            '                <a ng-switch-when="next" ng-click="params.page(page.number)" href="">»</a>'+
            '            </li>'+
            '    </ul>'+
            '</div>';

        return {
            restrict: 'A',
            scope: {
                'params': '=tablePagination',
                'templateUrl': '='
            },
            replace: false,
            link: function(scope, element, attrs) {

                var settings = scope.params.settings();
                settings.$scope.$on('uiTableAfterReloadData', function() {
                    var page = scope.params.page(),
                        total = scope.params.total(),
                        count = scope.params.count(),
                        maxBlocks = settings.paginationMaxBlocks;
                    scope.pages = scope.params.generatePagesArray(page, total, count, maxBlocks);
                }, true);

                scope.$watch('templateUrl', function(templateUrl) {
                    var template = angular.element(document.createElement('div'));
                    if (angular.isUndefined(templateUrl)) {
                        template.append($compile(defaultPagerTemplate)(scope));
                    }else{
                        template.attr({
                            'ng-include': 'templateUrl'
                        });
                    }
                    element.append(template);
                    $compile(template)(scope);
                });
            }
        };
    }
]);
// Source: js/tabs.js

/**
 * @ngdoc overview
 * @name ui.bootstrap.tabs
 *
 * @description
 * AngularJS version of the tabs directive.
 */

angular.module('lussa.ui.tabs', [])

.controller('TabsetController', ['$scope', function TabsetCtrl($scope) {
  var ctrl = this,
      tabs = ctrl.tabs = $scope.tabs = [];

  ctrl.select = function(selectedTab) {
    angular.forEach(tabs, function(tab) {
      if (tab.active && tab !== selectedTab) {
        tab.active = false;
        tab.onDeselect();
      }
    });
    selectedTab.active = true;
    selectedTab.onSelect();
  };

  ctrl.addTab = function addTab(tab) {
    tabs.push(tab);
    // we can't run the select function on the first tab
    // since that would select it twice
    if (tabs.length === 1 && tab.active !== false) {
      tab.active = true;
    } else if (tab.active) {
      ctrl.select(tab);
    }
    else {
      tab.active = false;
    }
  };

  ctrl.removeTab = function removeTab(tab) {
    var index = tabs.indexOf(tab);
    //Select a new tab if the tab to be removed is selected and not destroyed
    if (tab.active && tabs.length > 1 && !destroyed) {
      //If this is the last tab, select the previous tab. else, the next tab.
      var newActiveIndex = index == tabs.length - 1 ? index - 1 : index + 1;
      ctrl.select(tabs[newActiveIndex]);
    }
    tabs.splice(index, 1);
  };

  var destroyed;
  $scope.$on('$destroy', function() {
    destroyed = true;
  });
}])

/**
 * @ngdoc directive
 * @name ui.bootstrap.tabs.directive:tabset
 * @restrict EA
 *
 * @description
 * Tabset is the outer container for the tabs directive
 *
 * @param {boolean=} vertical Whether or not to use vertical styling for the tabs.
 * @param {boolean=} justified Whether or not to use justified styling for the tabs.
 *
 * @example
<example module="ui.bootstrap">
  <file name="index.html">
    <tabset>
      <tab heading="Tab 1"><b>First</b> Content!</tab>
      <tab heading="Tab 2"><i>Second</i> Content!</tab>
    </tabset>
    <hr />
    <tabset vertical="true">
      <tab heading="Vertical Tab 1"><b>First</b> Vertical Content!</tab>
      <tab heading="Vertical Tab 2"><i>Second</i> Vertical Content!</tab>
    </tabset>
    <tabset justified="true">
      <tab heading="Justified Tab 1"><b>First</b> Justified Content!</tab>
      <tab heading="Justified Tab 2"><i>Second</i> Justified Content!</tab>
    </tabset>
  </file>
</example>
 */
.directive('tabset', function() {
  return {
    restrict: 'EA',
    transclude: true,
    replace: true,
    scope: {
      type: '@'
    },
    controller: 'TabsetController',
    template: '<div>'+
    '  <ul class="nav nav-{{type || \'tabs\'}}" ng-class="{\'nav-stacked\': vertical, \'nav-justified\': justified}" ng-transclude></ul>'+
    '  <div class="tab-content">'+
    '    <div class="tab-pane" '+
    '         ng-repeat="tab in tabs" '+
    '         ng-class="{active: tab.active}"'+
    '         tab-content-transclude="tab">'+
    '    </div>'+
    '  </div>'+
    '</div>',
    link: function(scope, element, attrs) {
      scope.vertical = angular.isDefined(attrs.vertical) ? scope.$parent.$eval(attrs.vertical) : false;
      scope.justified = angular.isDefined(attrs.justified) ? scope.$parent.$eval(attrs.justified) : false;
    }
  };
})

/**
 * @ngdoc directive
 * @name ui.bootstrap.tabs.directive:tab
 * @restrict EA
 *
 * @param {string=} heading The visible heading, or title, of the tab. Set HTML headings with {@link ui.bootstrap.tabs.directive:tabHeading tabHeading}.
 * @param {string=} select An expression to evaluate when the tab is selected.
 * @param {boolean=} active A binding, telling whether or not this tab is selected.
 * @param {boolean=} disabled A binding, telling whether or not this tab is disabled.
 *
 * @description
 * Creates a tab with a heading and content. Must be placed within a {@link ui.bootstrap.tabs.directive:tabset tabset}.
 *
 * @example
<example module="ui.bootstrap">
  <file name="index.html">
    <div ng-controller="TabsDemoCtrl">
      <button class="btn btn-small" ng-click="items[0].active = true">
        Select item 1, using active binding
      </button>
      <button class="btn btn-small" ng-click="items[1].disabled = !items[1].disabled">
        Enable/disable item 2, using disabled binding
      </button>
      <br />
      <tabset>
        <tab heading="Tab 1">First Tab</tab>
        <tab select="alertMe()">
          <tab-heading><i class="icon-bell"></i> Alert me!</tab-heading>
          Second Tab, with alert callback and html heading!
        </tab>
        <tab ng-repeat="item in items"
          heading="{{item.title}}"
          disabled="item.disabled"
          active="item.active">
          {{item.content}}
        </tab>
      </tabset>
    </div>
  </file>
  <file name="script.js">
    function TabsDemoCtrl($scope) {
      $scope.items = [
        { title:"Dynamic Title 1", content:"Dynamic Item 0" },
        { title:"Dynamic Title 2", content:"Dynamic Item 1", disabled: true }
      ];

      $scope.alertMe = function() {
        setTimeout(function() {
          alert("You've selected the alert tab!");
        });
      };
    };
  </file>
</example>
 */

/**
 * @ngdoc directive
 * @name ui.bootstrap.tabs.directive:tabHeading
 * @restrict EA
 *
 * @description
 * Creates an HTML heading for a {@link ui.bootstrap.tabs.directive:tab tab}. Must be placed as a child of a tab element.
 *
 * @example
<example module="ui.bootstrap">
  <file name="index.html">
    <tabset>
      <tab>
        <tab-heading><b>HTML</b> in my titles?!</tab-heading>
        And some content, too!
      </tab>
      <tab>
        <tab-heading><i class="icon-heart"></i> Icon heading?!?</tab-heading>
        That's right.
      </tab>
    </tabset>
  </file>
</example>
 */
.directive('tab', ['$parse', '$log', function($parse, $log) {
  return {
    require: '^tabset',
    restrict: 'EA',
    replace: true,
    template: '<li ng-class="{active: active, disabled: disabled}">'+
    '  <a href ng-click="select()" tab-heading-transclude>{{heading}}</a>'+
    '</li>',
    transclude: true,
    scope: {
      active: '=?',
      heading: '@',
      onSelect: '&select', //This callback is called in contentHeadingTransclude
                          //once it inserts the tab's content into the dom
      onDeselect: '&deselect'
    },
    controller: function() {
      //Empty controller so other directives can require being 'under' a tab
    },
    compile: function(elm, attrs, transclude) {
      return function postLink(scope, elm, attrs, tabsetCtrl) {
        scope.$watch('active', function(active) {
          if (active) {
            tabsetCtrl.select(scope);
          }
        });

        scope.disabled = false;
        if ( attrs.disable ) {
          scope.$parent.$watch($parse(attrs.disable), function(value) {
            scope.disabled = !! value;
          });
        }

        // Deprecation support of "disabled" parameter
        // fix(tab): IE9 disabled attr renders grey text on enabled tab #2677
        // This code is duplicated from the lines above to make it easy to remove once
        // the feature has been completely deprecated
        if ( attrs.disabled ) {
          $log.warn('Use of "disabled" attribute has been deprecated, please use "disable"');
          scope.$parent.$watch($parse(attrs.disabled), function(value) {
            scope.disabled = !! value;
          });
        }

        scope.select = function() {
          if ( !scope.disabled ) {
            scope.active = true;
          }
        };

        tabsetCtrl.addTab(scope);
        scope.$on('$destroy', function() {
          tabsetCtrl.removeTab(scope);
        });

        //We need to transclude later, once the content container is ready.
        //when this link happens, we're inside a tab heading.
        scope.$transcludeFn = transclude;
      };
    }
  };
}])

.directive('tabHeadingTransclude', [function() {
  return {
    restrict: 'A',
    require: '^tab',
    link: function(scope, elm, attrs, tabCtrl) {
      scope.$watch('headingElement', function updateHeadingElement(heading) {
        if (heading) {
          elm.html('');
          elm.append(heading);
        }
      });
    }
  };
}])

.directive('tabContentTransclude', function() {
  return {
    restrict: 'A',
    require: '^tabset',
    link: function(scope, elm, attrs) {
      var tab = scope.$eval(attrs.tabContentTransclude);

      //Now our tab is ready to be transcluded: both the tab heading area
      //and the tab content area are loaded.  Transclude 'em both.
      tab.$transcludeFn(tab.$parent, function(contents) {
        angular.forEach(contents, function(node) {
          if (isTabHeading(node)) {
            //Let tabHeadingTransclude know.
            tab.headingElement = node;
          } else {
            elm.append(node);
          }
        });
      });
    }
  };
  function isTabHeading(node) {
    return node.tagName &&  (
      node.hasAttribute('tab-heading') ||
      node.hasAttribute('data-tab-heading') ||
      node.tagName.toLowerCase() === 'tab-heading' ||
      node.tagName.toLowerCase() === 'data-tab-heading'
    );
  }
})

;
// Source: js/toast.js
/**
 * [toast description]
 * @type {[type]}
 */
var toast = angular.module('lussa.ui.toast',[
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
			'<a role="link" class="close" ' +
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

// Source: js/tooltip.js
/**
* The following features are still outstanding: animation as a
* function, placement as a function, inside, support for more triggers than
* just mouse enter/leave, html tooltips, and selector delegation.
*/
angular.module( 'lussa.ui.tooltip', [ 'lussa.ui.helper.position', 'lussa.ui.helper.bindHtml' ] )

/**
* The $tooltip service creates tooltip- and popover-like directives as well as
* houses global options for them.
*/
.provider( '$tooltip', function () {
    // The default options tooltip and popover.
    var defaultOptions = {
        placement: 'top',
        animation: true,
        popupDelay: 0,
        useContentExp: false
    };

    // Default hide triggers for each show trigger
    var triggerMap = {
        'mouseenter': 'mouseleave',
        'click': 'click',
        'focus': 'blur'
    };

    // The options specified to the provider globally.
    var globalOptions = {};

    /**
    * `options({})` allows global configuration of all tooltips in the
    * application.
    *
    *   var app = angular.module( 'App', ['lussa.ui.tooltip'], function( $tooltipProvider ) {
    *     // place tooltips left instead of top by default
    *     $tooltipProvider.options( { placement: 'left' } );
    *   });
    */
    this.options = function( value ) {
        angular.extend( globalOptions, value );
    };

    /**
    * This allows you to extend the set of trigger mappings available. E.g.:
    *
    *   $tooltipProvider.setTriggers( 'openTrigger': 'closeTrigger' );
    */
    this.setTriggers = function setTriggers ( triggers ) {
        angular.extend( triggerMap, triggers );
    };

    /**
    * This is a helper function for translating camel-case to snake-case.
    */
    function snake_case(name){
        var regexp = /[A-Z]/g;
        var separator = '-';
        return name.replace(regexp, function(letter, pos) {
            return (pos ? separator : '') + letter.toLowerCase();
        });
    }

    /**
    * Returns the actual instance of the $tooltip service.
    * TODO support multiple triggers
    */
    this.$get = [ '$window', '$compile', '$timeout', '$document', '$position', '$interpolate', function ( $window, $compile, $timeout, $document, $position, $interpolate ) {
        return function $tooltip ( type, prefix, defaultTriggerShow, options ) {
            options = angular.extend( {}, defaultOptions, globalOptions, options );

            /**
            * Returns an object of show and hide triggers.
            *
            * If a trigger is supplied,
            * it is used to show the tooltip; otherwise, it will use the `trigger`
            * option passed to the `$tooltipProvider.options` method; else it will
            * default to the trigger supplied to this directive factory.
            *
            * The hide trigger is based on the show trigger. If the `trigger` option
            * was passed to the `$tooltipProvider.options` method, it will use the
            * mapped trigger from `triggerMap` or the passed trigger if the map is
            * undefined; otherwise, it uses the `triggerMap` value of the show
            * trigger; else it will just use the show trigger.
            */
            function getTriggers ( trigger ) {
                var show = trigger || options.trigger || defaultTriggerShow;
                var hide = triggerMap[show] || show;
                return {
                    show: show,
                    hide: hide
                };
            }

            var directiveName = snake_case( type );

            var startSym = $interpolate.startSymbol();
            var endSym = $interpolate.endSymbol();
            var template =
                '<div '+ directiveName +'-popup '+
                'title="'+startSym+'title'+endSym+'" '+
                (options.useContentExp ?
                    'content-exp="contentExp()" ' :
                    'content="'+startSym+'content'+endSym+'" ') +
                    'placement="'+startSym+'placement'+endSym+'" '+
                    'popup-class="'+startSym+'popupClass'+endSym+'" '+
                    'animation="animation" '+
                    'is-open="isOpen"'+
                    'origin-scope="origScope" '+
                    '>'+
                    '</div>';

            return {
                restrict: 'EA',
                compile: function (tElem, tAttrs) {
                    var tooltipLinker = $compile( template );

                    return function link ( scope, element, attrs, tooltipCtrl ) {
                        var tooltip;
                        var tooltipLinkedScope;
                        var transitionTimeout;
                        var popupTimeout;
                        var appendToBody = angular.isDefined( options.appendToBody ) ? options.appendToBody : false;
                        var triggers = getTriggers( undefined );
                        var hasEnableExp = angular.isDefined(attrs[prefix+'Enable']);
                        var ttScope = scope.$new(true);

                        var positionTooltip = function () {
                            if (!tooltip) { return; }

                            var ttPosition = $position.positionElements(element, tooltip, ttScope.placement, appendToBody);
                            ttPosition.top += 'px';
                            ttPosition.left += 'px';

                            // Now set the calculated positioning.
                            tooltip.css( ttPosition );
                        };

                        // Set up the correct scope to allow transclusion later
                        ttScope.origScope = scope;

                        // By default, the tooltip is not open.
                        // TODO add ability to start tooltip opened
                        ttScope.isOpen = false;

                        function toggleTooltipBind () {
                            if ( ! ttScope.isOpen ) {
                                showTooltipBind();
                            } else {
                                hideTooltipBind();
                            }
                        }

                        // Show the tooltip with delay if specified, otherwise show it immediately
                        function showTooltipBind() {
                            if(hasEnableExp && !scope.$eval(attrs[prefix+'Enable'])) {
                                return;
                            }

                            prepareTooltip();

                            if ( ttScope.popupDelay ) {
                                // Do nothing if the tooltip was already scheduled to pop-up.
                                // This happens if show is triggered multiple times before any hide is triggered.
                                if (!popupTimeout) {
                                    popupTimeout = $timeout( show, ttScope.popupDelay, false );
                                    popupTimeout.then(function(reposition){reposition();});
                                }
                            } else {
                                show()();
                            }
                        }

                        function hideTooltipBind () {
                            scope.$apply(function () {
                                hide();
                            });
                        }

                        // Show the tooltip popup element.
                        function show() {

                            popupTimeout = null;

                            // If there is a pending remove transition, we must cancel it, lest the
                            // tooltip be mysteriously removed.
                            if ( transitionTimeout ) {
                                $timeout.cancel( transitionTimeout );
                                transitionTimeout = null;
                            }

                            // Don't show empty tooltips.
                            if ( !(options.useContentExp ? ttScope.contentExp() : ttScope.content) ) {
                                return angular.noop;
                            }

                            createTooltip();

                            // Set the initial positioning.
                            tooltip.css({ top: 0, left: 0, display: 'block' });
                            ttScope.$digest();

                            positionTooltip();

                            // And show the tooltip.
                            ttScope.isOpen = true;
                            ttScope.$apply(); // digest required as $apply is not called

                            // Return positioning function as promise callback for correct
                            // positioning after draw.
                            return positionTooltip;
                        }

                        // Hide the tooltip popup element.
                        function hide() {
                            // First things first: we don't show it anymore.
                            ttScope.isOpen = false;

                            //if tooltip is going to be shown after delay, we must cancel this
                            $timeout.cancel( popupTimeout );
                            popupTimeout = null;

                            // And now we remove it from the DOM. However, if we have animation, we
                            // need to wait for it to expire beforehand.
                            // FIXME: this is a placeholder for a port of the transitions library.
                            if ( ttScope.animation ) {
                                if (!transitionTimeout) {
                                    transitionTimeout = $timeout(removeTooltip, 500);
                                }
                            } else {
                                removeTooltip();
                            }
                        }

                        function createTooltip() {
                            // There can only be one tooltip element per directive shown at once.
                            if (tooltip) {
                                removeTooltip();
                            }
                            tooltipLinkedScope = ttScope.$new();
                            tooltip = tooltipLinker(tooltipLinkedScope, function (tooltip) {
                                if ( appendToBody ) {
                                    $document.find( 'body' ).append( tooltip );
                                } else {
                                    element.after( tooltip );
                                }
                            });

                            tooltipLinkedScope.$watch(function () {
                                $timeout(positionTooltip, 0, false);
                            });

                            if (options.useContentExp) {
                                tooltipLinkedScope.$watch('contentExp()', function (val) {
                                    if (!val && ttScope.isOpen ) {
                                        hide();
                                    }
                                });
                            }
                        }

                        function removeTooltip() {
                            transitionTimeout = null;
                            if (tooltip) {
                                tooltip.remove();
                                tooltip = null;
                            }
                            if (tooltipLinkedScope) {
                                tooltipLinkedScope.$destroy();
                                tooltipLinkedScope = null;
                            }
                        }

                        function prepareTooltip() {
                            prepPopupClass();
                            prepPlacement();
                            prepPopupDelay();
                        }

                        ttScope.contentExp = function () {
                            return scope.$eval(attrs[type]);
                        };

                        /**
                        * Observe the relevant attributes.
                        */
                        if (!options.useContentExp) {
                            attrs.$observe( type, function ( val ) {
                                ttScope.content = val;

                                if (!val && ttScope.isOpen ) {
                                    hide();
                                }
                            });
                        }

                        attrs.$observe( 'disabled', function ( val ) {
                            if (val && ttScope.isOpen ) {
                                hide();
                            }
                        });

                        attrs.$observe( prefix+'Title', function ( val ) {
                            ttScope.title = val;
                        });

                        function prepPopupClass() {
                            ttScope.popupClass = attrs[prefix + 'Class'];
                        }

                        function prepPlacement() {
                            var val = attrs[ prefix + 'Placement' ];
                            ttScope.placement = angular.isDefined( val ) ? val : options.placement;
                        }

                        function prepPopupDelay() {
                            var val = attrs[ prefix + 'PopupDelay' ];
                            var delay = parseInt( val, 10 );
                            ttScope.popupDelay = ! isNaN(delay) ? delay : options.popupDelay;
                        }

                        var unregisterTriggers = function () {
                            element.unbind(triggers.show, showTooltipBind);
                            element.unbind(triggers.hide, hideTooltipBind);
                        };

                        function prepTriggers() {
                            var val = attrs[ prefix + 'Trigger' ];
                            unregisterTriggers();

                            triggers = getTriggers( val );

                            if ( triggers.show === triggers.hide ) {
                                element.bind( triggers.show, toggleTooltipBind );
                            } else {
                                element.bind( triggers.show, showTooltipBind );
                                element.bind( triggers.hide, hideTooltipBind );
                            }
                        }
                        prepTriggers();

                        var animation = scope.$eval(attrs[prefix + 'Animation']);
                        ttScope.animation = angular.isDefined(animation) ? !!animation : options.animation;

                        var appendToBodyVal = scope.$eval(attrs[prefix + 'AppendToBody']);
                        appendToBody = angular.isDefined(appendToBodyVal) ? appendToBodyVal : appendToBody;

                        // if a tooltip is attached to <body> we need to remove it on
                        // location change as its parent scope will probably not be destroyed
                        // by the change.
                        if ( appendToBody ) {
                            scope.$on('$locationChangeSuccess', function closeTooltipOnLocationChangeSuccess () {
                                if ( ttScope.isOpen ) {
                                    hide();
                                }
                            });
                        }

                        // Make sure tooltip is destroyed and removed.
                        scope.$on('$destroy', function onDestroyTooltip() {
                            $timeout.cancel( transitionTimeout );
                            $timeout.cancel( popupTimeout );
                            unregisterTriggers();
                            removeTooltip();
                            ttScope = null;
                        });
                    };
                }
            };
        };
    }];
})

// This is mostly ngInclude code but with a custom scope
.directive( 'tooltipTemplateTransclude', [
'$animate', '$sce', '$compile', '$templateRequest',
function ($animate ,  $sce ,  $compile ,  $templateRequest) {
    return {
        link: function ( scope, elem, attrs ) {
            var origScope = scope.$eval(attrs.tooltipTemplateTranscludeScope);

            var changeCounter = 0,
            currentScope,
            previousElement,
            currentElement;

            var cleanupLastIncludeContent = function() {
                if (previousElement) {
                    previousElement.remove();
                    previousElement = null;
                }
                if (currentScope) {
                    currentScope.$destroy();
                    currentScope = null;
                }
                if (currentElement) {
                    $animate.leave(currentElement).then(function() {
                        previousElement = null;
                    });
                    previousElement = currentElement;
                    currentElement = null;
                }
            };

            scope.$watch($sce.parseAsResourceUrl(attrs.tooltipTemplateTransclude), function (src) {
                var thisChangeId = ++changeCounter;

                if (src) {
                    //set the 2nd param to true to ignore the template request error so that the inner
                    //contents and scope can be cleaned up.
                    $templateRequest(src, true).then(function(response) {
                        if (thisChangeId !== changeCounter) { return; }
                        var newScope = origScope.$new();
                        var template = response;

                        var clone = $compile(template)(newScope, function(clone) {
                            cleanupLastIncludeContent();
                            $animate.enter(clone, elem);
                        });

                        currentScope = newScope;
                        currentElement = clone;

                        currentScope.$emit('$includeContentLoaded', src);
                    }, function() {
                        if (thisChangeId === changeCounter) {
                            cleanupLastIncludeContent();
                            scope.$emit('$includeContentError', src);
                        }
                    });
                    scope.$emit('$includeContentRequested', src);
                } else {
                    cleanupLastIncludeContent();
                }
            });

            scope.$on('$destroy', cleanupLastIncludeContent);
        }
    };
}])

/**
* Note that it's intentional that these classes are *not* applied through $animate.
* They must not be animated as they're expected to be present on the tooltip on
* initialization.
*/
.directive('tooltipClasses', function () {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            if (scope.placement) {
                element.addClass(scope.placement);
            }
            if (scope.popupClass) {
                element.addClass(scope.popupClass);
            }
            if (scope.animation()) {
                element.addClass(attrs.tooltipAnimationClass);
            }
        }
    };
})

.directive( 'tooltipPopup', function () {
    return {
        restrict: 'EA',
        replace: true,
        scope: { content: '@', placement: '@', popupClass: '@', animation: '&', isOpen: '&' },
        template : '<div class="tooltip"'+
            '  tooltip-animation-class="fade"'+
            '  tooltip-classes'+
            '  ng-class="{ in: isOpen() }">'+
            '  <div class="tooltip-arrow"></div>'+
            '  <div class="tooltip-inner" ng-bind="content"></div>'+
            '</div>'
    };
})

.directive( 'tooltip', [ '$tooltip', function ( $tooltip ) {
    return $tooltip( 'tooltip', 'tooltip', 'mouseenter' );
}])

.directive( 'tooltipTemplatePopup', function () {
    return {
        restrict: 'EA',
        replace: true,
        scope: { contentExp: '&', placement: '@', popupClass: '@', animation: '&', isOpen: '&',
        originScope: '&' },
        template: '<div class="tooltip"'+
            '  tooltip-animation-class="fade"'+
            '  tooltip-classes'+
            '  ng-class="{ in: isOpen() }">'+
            '  <div class="tooltip-arrow"></div>'+
            '  <div class="tooltip-inner"'+
            '    tooltip-template-transclude="contentExp()"'+
            '    tooltip-template-transclude-scope="originScope()"></div>'+
            '</div>'
    };
})

.directive( 'tooltipTemplate', [ '$tooltip', function ( $tooltip ) {
    return $tooltip('tooltipTemplate', 'tooltip', 'mouseenter', {
        useContentExp: true
    });
}])

.directive( 'tooltipHtmlPopup', function () {
    return {
        restrict: 'EA',
        replace: true,
        scope: { contentExp: '&', placement: '@', popupClass: '@', animation: '&', isOpen: '&' },
        template: '<div class="tooltip"'+
            '  tooltip-animation-class="fade"'+
            '  tooltip-classes'+
            '  ng-class="{ in: isOpen() }">'+
            '  <div class="tooltip-arrow"></div>'+
            '  <div class="tooltip-inner" ng-bind-html="contentExp()"></div>'+
            '</div>'
    };
})

.directive( 'tooltipHtml', [ '$tooltip', function ( $tooltip ) {
    return $tooltip('tooltipHtml', 'tooltip', 'mouseenter', {
        useContentExp: true
    });
}])

/*
Deprecated
*/
.directive( 'tooltipHtmlUnsafePopup', function () {
    return {
        restrict: 'EA',
        replace: true,
        scope: { content: '@', placement: '@', popupClass: '@', animation: '&', isOpen: '&' },
        template: '<div class="tooltip"'+
            '  tooltip-animation-class="fade"'+
            '  tooltip-classes'+
            '  ng-class="{ in: isOpen() }">'+
            '  <div class="tooltip-arrow"></div>'+
            '  <div class="tooltip-inner" bind-html-unsafe="content"></div>'+
            '</div>'
    };
})

.value('tooltipHtmlUnsafeSuppressDeprecated', false)
.directive( 'tooltipHtmlUnsafe', [
'$tooltip', 'tooltipHtmlUnsafeSuppressDeprecated', '$log',
function ( $tooltip ,  tooltipHtmlUnsafeSuppressDeprecated ,  $log) {
    if (!tooltipHtmlUnsafeSuppressDeprecated) {
        $log.warn('tooltip-html-unsafe is now deprecated. Use tooltip-html or tooltip-template instead.');
    }
    return $tooltip( 'tooltipHtmlUnsafe', 'tooltip', 'mouseenter' );
}]);
