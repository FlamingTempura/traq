'use strict';

var angular = require('angular'),
	_ = require('lodash');

angular.module('traq').config(function ($stateProvider) {
	$stateProvider.state('traq-new', {
		url: '/traq/new',
		templateUrl: 'traq-new.html',
		resolve: { onboarded: function (dbConfig) { return dbConfig.exists('onboard'); } },
		controller: function ($scope, $state, presetTraqCategories, presetTraqs, onboarded) {
			var categories = _.map(presetTraqCategories, function (category) {
				return _.extend({}, category, {
					presets: _.chain(presetTraqs).filter(function (preset) {
						return preset.category === category.id;
					}).sortBy('title').value()
				});
			});
			$scope.traqNew = {
				onboarded: onboarded,
				categories: categories,
				selectedCategory: categories[0],
				go: function (sref, params) {
					$state.go(sref, params);
				}
			};
		}
	});
});
