'use strict';

var angular = require('angular'),
	$ = require('jquery'),
	_ = require('lodash');

angular.module('traq').config(function ($stateProvider) {
	$stateProvider.state('home', {
		url: '/',
		templateUrl: 'home.html',
		params: { tid: null },
		resolve: {
			onboarded: function (dbConfig) { return dbConfig.exists('onboard'); },
			traqs: function (dbTraq) { return dbTraq.getAll(); },
			charts: function (dbChart) { return dbChart.getAll(); },
			rows: function (dbRow) { return dbRow.getAll(); } // FIXME: this is bad
		},
		onEnter: function ($state, onboarded) {
			console.log('onboarded?', onboarded);
			if (!onboarded) { $state.go('welcome'); }
		},
		controller: function ($scope, $stateParams, dbTraq, traqs, charts, presets, rows) {
			$scope.home = { selectedIndex: 0 };

			$scope.traqs = traqs;
			$scope.charts = charts;

			$scope.traqFacts = _.map(traqs, function (traq) {
				return _.findWhere(presets.presets, { id: traq.preset }).facts;
			});
			$scope.traqRows = _.map(traqs, function (traq) {
				return _.filter(rows, function (row) {
					return row._id.indexOf(traq._id) === 0;
				});
			});

			if ($stateParams.tid) {
				$scope.home.selectedIndex = _.findIndex(traqs, function (traq) {
					return traq._id === $stateParams.tid;
				});
			}
			
			$scope.openMenu = function ($mdOpenMenu, ev) {
				$mdOpenMenu(ev);
			};

			// TODO ensure that defaultChart failsafe to zero in case default chart is deleted
		}
	});
}).directive('mdTabContent', function () {
	return {
		link: function ($scope, element) {
			var $element = $(element),
				startX, startTranslates,
				getTranslateX = function ($el) { // translate is in the form matrix(1, 0, 0, 1, 375, 0)
					return Number($el.css('transform').split(',')[4]);
				},
				setTranslateX = function ($el, x) {
					var transformParts = $el.css('transform').split(',');
					transformParts[4] = x;
					$el.css('transform', transformParts.join(','));
				};
			$element.on('touchstart', function (e) {
				startX = e.originalEvent.changedTouches[0].pageX;
				startTranslates = _.map($element.siblings().andSelf(), function (el) {
					var $el = $(el).removeClass('snap');
					return { $el: $el, startTranslate: getTranslateX($el) };
				});
			});
			$element.on('touchmove', function (e) {
				var x = e.originalEvent.changedTouches[0].pageX - startX;
				_.each(startTranslates, function (o) {
					setTranslateX(o.$el, o.startTranslate + x);
				});
			});
			$element.on('touchend', function (e) {
				var width = $element.width(),
					threshold = width / 5,
					x = e.originalEvent.changedTouches[0].pageX - startX;

				x = x < -threshold && !$element.is(':last-child') ? -width :
					x > threshold && !$element.is(':first-child') ? width : 0;

				_.each(startTranslates, function (o) {
					setTranslateX(o.$el.addClass('snap'), o.startTranslate + x);
				});
			});
		}
	};
});
