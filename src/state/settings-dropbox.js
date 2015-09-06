'use strict';

var angular = require('angular');

angular.module('traq').config(function ($stateProvider) {
	$stateProvider.state('settings-dropbox', {
		url: '/settings/dropbox',
		templateUrl: 'settings-dropbox.html'
	});
});
