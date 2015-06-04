'use strict';

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
