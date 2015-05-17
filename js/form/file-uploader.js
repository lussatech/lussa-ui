'use strict';

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