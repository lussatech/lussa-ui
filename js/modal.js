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
