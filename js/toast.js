'use strict';

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