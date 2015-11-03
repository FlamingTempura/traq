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
			columns: function (dbColumn) { return dbColumn.getAll(); }
		},
		onEnter: function ($state, onboarded) {
			console.log('onboarded?', onboarded);
			if (!onboarded) { $state.go('welcome'); }
		},
		controller: function ($sce, $q, $scope, $stateParams, dbMeasurement, traqs, columns) {
			$scope.traqs = traqs;
			$scope.home = {
				selectedIndex: Math.max(0, _.findIndex(traqs, function (traq) {
					return traq._id === $stateParams.tid;
				}))
			};
			$scope.traqViews = _.map(traqs, function (traq) {
				var traqView = {
					traq: traq,
					span: '1m'
				};
				var requireColumns = _.union(_.flattenDeep([
					_.pluck(traq.charts, 'requireColumns'),
					_.pluck(traq.insights, 'requireColumns')
				]));
				// TODO: only activate this once user is viewing it
				$q.all(_.map(requireColumns, function (columnName) {
					return dbMeasurement.getAll({ startWith: columnName }).then(function (measurements) {
						return _.extend({}, _.findWhere(columns, { _id: columnName }), { measurements: measurements });
					});
				})).then(function (data) {
					traqView.data = data;
					console.log('DATA', data);
					traqView.insights = _.map(traq.insights, function (insight) {
						return _.extend({}, insight, {
							html: $sce.trustAsHtml(insight.html(traq, data))
						});
					});
				});
				return traqView;
			});
			$scope.openMenu = function ($mdOpenMenu, ev) {
				$mdOpenMenu(ev);
			};
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
