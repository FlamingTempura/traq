'use strict';

var angular = require('angular'),
	$ = require('jquery'),
	_ = require('lodash');

angular.module('traq').config(function ($stateProvider) {
	$stateProvider.state('home', {
		url: '/?tid',
		templateUrl: 'home.html',
		params: { tid: null },
		resolve: {
			onboarded: function (dbConfig) { return dbConfig.exists('onboard'); },
			traqs: function (dbTraq) { return dbTraq.getAll(); }
		},
		onEnter: function ($state, $log, onboarded) {
			$log = $log.instance('home', 'blue');
			$log.log('onboarded?', onboarded);
			if (!onboarded) { $state.go('welcome'); }
		},
		controller: function ($scope, $stateParams, traqs) {
			$scope.traqs = traqs;
			$scope.selectedIndex = Math.max(0, _.findIndex(traqs, function (traq) {
				return traq._id === $stateParams.tid;
			}));
			$scope.openMenu = function ($mdOpenMenu, ev) {
				$mdOpenMenu(ev);
			};
		}
	});
}).directive('traqSlide', function ($state) {
	return {
		restrict: 'E',
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
			}).on('touchmove', function (e) {
				e.preventDefault();
				var x = e.originalEvent.changedTouches[0].pageX - startX;
				_.each(startTranslates, function (o) {
					setTranslateX(o.$el, o.startTranslate + x);
				});
			}).on('touchend', function (e) {
				var width = $element.width(),
					threshold = width / 5,
					x = e.originalEvent.changedTouches[0].pageX - startX;

				x = x < -threshold && !$element.is(':last-child') ? -width :
					x > threshold && !$element.is(':first-child') ? width : 0;

				_.each(startTranslates, function (o) {
					if (o.startTranslate + x === 0) {
						$state.transitionTo('home', { tid: o.$el.attr('tid') }, { notify: false });
					}
					setTranslateX(o.$el.addClass('snap'), o.startTranslate + x);
				});
			});
		}
	};
}).directive('traq', function ($sce, getData, spans) {
	return {
		restrict: 'E',
		templateUrl: 'traq.html',
		replace: true,
		scope: {
			traq: '=',
			fullscreen: '@',
			span: '='
		},
		controller: function ($scope) {
			var traq = $scope.traq;
			$scope.spans = spans;
			$scope.o = { span: $scope.span || '1m' };
			$scope.$watch('span', function (span) {
				if (!span) { return; }
				$scope.o.span = span;
			});
			$scope.$watch('o.span', function (span) {
				if (!span) { return; }
				$scope.span = span;
				// TODO: only activate this once user is viewing it
				getData(traq, new Date(Date.now() - spans[span].duration)).then(function (data) {
					$scope.measurementCount = _.reduce(data, function (memo, o) {
						return memo + o.measurements.length;
					}, 0);
					$scope.data = data;
					$scope.insights = _.map(traq.insights, function (insight) {
						return _.extend({}, insight, {
							html: $sce.trustAsHtml(insight.html(traq, data))
						});
					});
				});
			});
		}
	};
});
