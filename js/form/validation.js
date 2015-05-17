'use strict';

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
