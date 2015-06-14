'use strict';

/**
 * @ngdoc overview
 *
 * @name lussa.ui.modal
 * @module lussa.ui.modal
 * @description [description]
 */
var modal = angular.module('lussa.ui.modal', []);

/**
 * A helper, internal data structure that acts as a map but also allows getting / removing
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
 * @ngdoc directive
 * @name modalBackdrop
 * @module lussa.ui.modal
 * @description A helper directive for the $modal service. It creates a backdrop element.
 */
modal.directive('modalBackdrop', ['$timeout',
    function ($timeout) {

    var template = '<div class="modal-backdrop"'+
    '     modal-animation-class="fade"'+
    '     ng-class="{in: animate}"'+
    '     ng-style="{\'z-index\': 1040 + (index && 1 || 0) + index*10}"'+
    '></div>';

    function linkFn(scope, element, attrs) {
      scope.animate = false;

      //trigger CSS transitions
      $timeout(function () {
        scope.animate = true;
      });
    }

    return {
      restrict: 'EA',
      replace: true,
      template: template,
      compile: function (tElement, tAttrs) {
        tElement.addClass(tAttrs.backdropClass);
        return linkFn;
      }
    };
}]);

/**
 * @ngdoc directive
 * @name modalWindow
 * @module lussa.ui.modal
 * @description A helper directive for the $modal service. It creates a window element.
 */
modal.directive('modalWindow', ['$modalStack', '$q',
    function ($modalStack, $q) {

    var template = '<div modal-render="{{$isRendered}}" tabindex="-1" role="dialog" class="modal"'+
    '    modal-animation-class="fade"'+
    ' ng-class="{in: animate}" ng-style="{\'z-index\': 1050 + index*10, display: \'block\'}" ng-click="close($event)">'+
    '    <div class="modal-dialog" ng-class="size ? \'modal-\' + size : \'\'"><div class="modal-content" modal-transclude></div></div>'+
    '</div>';

    return {
      restrict: 'EA',
      scope: {
        index: '@',
        animate: '='
      },
      replace: true,
      transclude: true,
      template: template,
      link: function (scope, element, attrs) {
        element.addClass(attrs.windowClass || '');
        scope.size = attrs.size;

        scope.close = function (evt) {
          var modal = $modalStack.getTop();
          if (modal && modal.value.backdrop && modal.value.backdrop != 'static' && (evt.target === evt.currentTarget)) {
            evt.preventDefault();
            evt.stopPropagation();
            $modalStack.dismiss(modal.key, 'backdrop click');
          }
        };

        // This property is only added to the scope for the purpose of detecting when this directive is rendered.
        // We can detect that by using this property in the template associated with this directive and then use
        // {@link Attribute#$observe} on it. For more details please see {@link TableColumnResize}.
        scope.$isRendered = true;

        // Deferred object that will be resolved when this modal is render.
        var modalRenderDeferObj = $q.defer();
        // Observe function will be called on next digest cycle after compilation, ensuring that the DOM is ready.
        // In order to use this way of finding whether DOM is ready, we need to observe a scope property used in modal's template.
        attrs.$observe('modalRender', function (value) {
          if (value == 'true') {
            modalRenderDeferObj.resolve();
          }
        });

        modalRenderDeferObj.promise.then(function () {
          // trigger CSS transitions
          scope.animate = true;

          var inputsWithAutofocus = element[0].querySelectorAll('[autofocus]');
          /**
           * Auto-focusing of a freshly-opened modal element causes any child elements
           * with the autofocus attribute to lose focus. This is an issue on touch
           * based devices which will show and then hide the onscreen keyboard.
           * Attempts to refocus the autofocus element via JavaScript will not reopen
           * the onscreen keyboard. Fixed by updated the focusing logic to only autofocus
           * the modal element if the modal does not contain an autofocus element.
           */
          if (inputsWithAutofocus.length) {
            inputsWithAutofocus[0].focus();
          } else {
            element[0].focus();
          }

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
modal.factory('$modalStack', ['$animate', '$timeout', '$document', '$compile', '$rootScope', '$$stackedMap',
  function ($animate, $timeout, $document, $compile, $rootScope, $$stackedMap) {

    var OPENED_MODAL_CLASS = 'modal-open';

    var backdropDomEl, backdropScope;
    var openedWindows = $$stackedMap.createNew();
    var $modalStack = {};

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

    $rootScope.$watch(backdropIndex, function(newBackdropIndex){
      if (backdropScope) {
        backdropScope.index = newBackdropIndex;
      }
    });

    function removeModalWindow(modalInstance) {

      var body = $document.find('body').eq(0);
      var modalWindow = openedWindows.get(modalInstance).value;

      //clean up the stack
      openedWindows.remove(modalInstance);

      //remove window DOM element
      removeAfterAnimate(modalWindow.modalDomEl, modalWindow.modalScope, function() {
        body.toggleClass(OPENED_MODAL_CLASS, openedWindows.length() > 0);
        checkRemoveBackdrop();
      });
    }

    function checkRemoveBackdrop() {
        //remove backdrop if no longer needed
        if (backdropDomEl && backdropIndex() == -1) {
          var backdropScopeRef = backdropScope;
          removeAfterAnimate(backdropDomEl, backdropScope, function () {
            backdropScopeRef = null;
          });
          backdropDomEl = undefined;
          backdropScope = undefined;
        }
    }

    function removeAfterAnimate(domEl, scope, done) {
      // Closing animation
      scope.animate = false;

      if (domEl.attr('modal-animation') && $animate.enabled()) {
        // transition out
        domEl.one('$animate:close', function closeFn() {
          $rootScope.$evalAsync(afterAnimating);
        });
      } else {
        // Ensure this call is async
        $timeout(afterAnimating);
      }

      function afterAnimating() {
        if (afterAnimating.done) {
          return;
        }
        afterAnimating.done = true;

        domEl.remove();
        scope.$destroy();
        if (done) {
          done();
        }
      }
    }

    $document.bind('keydown', function (evt) {
      var modal;

      if (evt.which === 27) {
        modal = openedWindows.top();
        if (modal && modal.value.keyboard) {
          evt.preventDefault();
          $rootScope.$apply(function () {
            $modalStack.dismiss(modal.key, 'escape key press');
          });
        }
      }
    });

    $modalStack.open = function (modalInstance, modal) {

      var modalOpener = $document[0].activeElement;

      openedWindows.add(modalInstance, {
        deferred: modal.deferred,
        renderDeferred: modal.renderDeferred,
        modalScope: modal.scope,
        backdrop: modal.backdrop,
        keyboard: modal.keyboard
      });

      var body = $document.find('body').eq(0),
          currBackdropIndex = backdropIndex();

      if (currBackdropIndex >= 0 && !backdropDomEl) {
        backdropScope = $rootScope.$new(true);
        backdropScope.index = currBackdropIndex;
        var angularBackgroundDomEl = angular.element('<div modal-backdrop="modal-backdrop"></div>');
        angularBackgroundDomEl.attr('backdrop-class', modal.backdropClass);
        if (modal.animation) {
          angularBackgroundDomEl.attr('modal-animation', 'true');
        }
        backdropDomEl = $compile(angularBackgroundDomEl)(backdropScope);
        body.append(backdropDomEl);
      }

      var angularDomEl = angular.element('<div modal-window="modal-window"></div>');
      angularDomEl.attr({
        'template-url': modal.windowTemplateUrl,
        'window-class': modal.windowClass,
        'size': modal.size,
        'index': openedWindows.length() - 1,
        'animate': 'animate'
      }).html(modal.content);
      if (modal.animation) {
        angularDomEl.attr('modal-animation', 'true');
      }

      var modalDomEl = $compile(angularDomEl)(modal.scope);
      openedWindows.top().value.modalDomEl = modalDomEl;
      openedWindows.top().value.modalOpener = modalOpener;
      body.append(modalDomEl);
      body.addClass(OPENED_MODAL_CLASS);
    };

    function broadcastClosing(modalWindow, resultOrReason, closing) {
        return !modalWindow.value.modalScope.$broadcast('modal.closing', resultOrReason, closing).defaultPrevented;
    }

    $modalStack.close = function (modalInstance, result) {
      var modalWindow = openedWindows.get(modalInstance);
      if (modalWindow && broadcastClosing(modalWindow, result, true)) {
        modalWindow.value.deferred.resolve(result);
        removeModalWindow(modalInstance);
        modalWindow.value.modalOpener.focus();
        return true;
      }
      return !modalWindow;
    };

    $modalStack.dismiss = function (modalInstance, reason) {
      var modalWindow = openedWindows.get(modalInstance);
      if (modalWindow && broadcastClosing(modalWindow, reason, false)) {
        modalWindow.value.deferred.reject(reason);
        removeModalWindow(modalInstance);
        modalWindow.value.modalOpener.focus();
        return true;
      }
      return !modalWindow;
    };

    $modalStack.dismissAll = function (reason) {
      var topModal = this.getTop();
      while (topModal && this.dismiss(topModal.key, reason)) {
        topModal = this.getTop();
      }
    };

    $modalStack.getTop = function () {
      return openedWindows.top();
    };

    $modalStack.modalRendered = function (modalInstance) {
      var modalWindow = openedWindows.get(modalInstance);
      if (modalWindow) {
        modalWindow.value.renderDeferred.resolve();
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
modal.provider('$modal', function () {
  var $modalProvider = {
    options: {
      animation: true,
      backdrop: true, //can also be false or 'static'
      keyboard: true
    },
    $get: ['$injector', '$rootScope', '$q', '$templateRequest', '$controller', '$modalStack',
      function ($injector, $rootScope, $q, $templateRequest, $controller, $modalStack) {

        var $modal = {};

        function getTemplatePromise(options) {
          return options.template ? $q.when(options.template) :
            $templateRequest(angular.isFunction(options.templateUrl) ? (options.templateUrl)() : options.templateUrl);
        }

        function getResolvePromises(resolves) {
          var promisesArr = [];
          angular.forEach(resolves, function (value) {
            if (angular.isFunction(value) || angular.isArray(value)) {
              promisesArr.push($q.when($injector.invoke(value)));
            }
          });
          return promisesArr;
        }

        $modal.open = function (modalOptions) {

          var modalResultDeferred = $q.defer();
          var modalOpenedDeferred = $q.defer();
          var modalRenderDeferred = $q.defer();

          //prepare an instance of a modal to be injected into controllers and returned to a caller
          var modalInstance = {
            result: modalResultDeferred.promise,
            opened: modalOpenedDeferred.promise,
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

          //verify options
          if (!modalOptions.template && !modalOptions.templateUrl) {
            throw new Error('One of template or templateUrl options is required.');
          }

          var templateAndResolvePromise =
            $q.all([getTemplatePromise(modalOptions)].concat(getResolvePromises(modalOptions.resolve)));


          templateAndResolvePromise.then(function resolveSuccess(tplAndVars) {

            var modalScope = (modalOptions.scope || $rootScope).$new();
            modalScope.$close = modalInstance.close;
            modalScope.$dismiss = modalInstance.dismiss;

            var ctrlInstance, ctrlLocals = {};
            var resolveIter = 1;

            //controllers
            if (modalOptions.controller) {
              ctrlLocals.$scope = modalScope;
              ctrlLocals.$modalInstance = modalInstance;
              angular.forEach(modalOptions.resolve, function (value, key) {
                ctrlLocals[key] = tplAndVars[resolveIter++];
              });

              ctrlInstance = $controller(modalOptions.controller, ctrlLocals);
              if (modalOptions.controllerAs) {
                modalScope[modalOptions.controllerAs] = ctrlInstance;
              }
            }

            $modalStack.open(modalInstance, {
              scope: modalScope,
              deferred: modalResultDeferred,
              renderDeferred: modalRenderDeferred,
              content: tplAndVars[0],
              animation: modalOptions.animation,
              backdrop: modalOptions.backdrop,
              keyboard: modalOptions.keyboard,
              backdropClass: modalOptions.backdropClass,
              windowClass: modalOptions.windowClass,
              windowTemplateUrl: modalOptions.windowTemplateUrl,
              size: modalOptions.size
            });

          }, function resolveError(reason) {
            modalResultDeferred.reject(reason);
          });

          templateAndResolvePromise.then(function () {
            modalOpenedDeferred.resolve(true);
          }, function (reason) {
            modalOpenedDeferred.reject(reason);
          });

          return modalInstance;
        };

        return $modal;
      }]
  };

  return $modalProvider;
  });