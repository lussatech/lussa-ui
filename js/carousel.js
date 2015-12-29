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
