'use strict';

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