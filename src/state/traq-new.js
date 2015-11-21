'use strict';

var angular = require('angular'),
	_ = require('lodash');

angular.module('traq').config(function ($stateProvider) {
	$stateProvider.state('traq-new', {
		url: '/traq-new',
		templateUrl: 'traq-new.html',
		resolve: { onboarded: function (dbConfig) { return dbConfig.exists('onboard'); } },
		controller: function ($scope, $state, presetTraqs, onboarded) {
			$scope.onboarded = onboarded;
			$scope.presets = _.sortBy(presetTraqs, 'title');
			$scope.go = function (sref, params) {
				$state.go(sref, params);
			};
		}
	});
});
