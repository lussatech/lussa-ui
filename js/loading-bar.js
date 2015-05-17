'use strict';
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