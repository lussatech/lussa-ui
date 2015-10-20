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
