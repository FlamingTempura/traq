'use strict';

var angular = require('angular');

angular.module('traq').config(function ($stateProvider) {
	$stateProvider.state('feedback', {
		url: '/feedback',
		templateUrl: 'feedback.html'
	});
});
