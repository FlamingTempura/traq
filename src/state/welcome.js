'use strict';

var angular = require('angular');

angular.module('traq').config(function ($stateProvider) {
	$stateProvider.state('welcome', {
		url: '/welcome',
		templateUrl: 'welcome.html'
	});
});
