'use strict';

var angular = require('angular'),
	ngMaterial = require('angular-material'),
	uiRouter = require('ui-router');

angular.module('traq', [ngMaterial, uiRouter])
	.controller('AppCtrl', function ($scope, $mdSidenav, $state) {
		$scope.toggleSidenav = function (menuId) {
			$mdSidenav(menuId).toggle();
		};
		$scope.go = function (to, params) {
			$state.go(to, params);
		};
	})
	.config(function ($stateProvider, $urlRouterProvider) {
		$urlRouterProvider.otherwise('/');
		$stateProvider
			.state('main', {
				abstract: true,
				templateUrl: 'main.html'
			})
			.state('home', {
				parent: 'main',
				url: '/',
				templateUrl: 'home.html'
			})
			.state('table', {
				abstract: true,
				templateUrl: 'table.html'
			})
			.state('table-view', {
				parent: 'table',
				url: '/table/:tid',
				templateUrl: 'table-view.html'
			})
			.state('table-edit', {
				url: '/table/:tid/edit',
				templateUrl: 'table-edit.html'
			})
			.state('table-row-edit', {
				url: '/table/:tid/row/:rid/edit',
				templateUrl: 'row-edit.html'
			})
			.state('table-import', {
				url: '/table/:tid/import',
				templateUrl: 'import.html'
			})
			.state('table-chart-view', {
				parent: 'table',
				url: '/table/:tid/chart/:cid',
				templateUrl: 'chart-view.html'
			})
			.state('table-chart-edit', {
				url: '/table/:tid/chart/:cid/edit',
				templateUrl: 'chart-edit.html'
			})
			.state('settings', {
				url: '/settings',
				templateUrl: 'settings.html'
			})
			.state('settings-dropbox', {
				url: '/settings/dropbox',
				templateUrl: 'settings-dropbox.html'
			})
			.state('feedback', {
				url: '/feedback',
				templateUrl: 'feedback.html'
			})
			.state('export', {
				url: '/export',
				templateUrl: 'export.html'
			});
	})
	.directive('uiBack', function () {
		return {
			restrict: 'A',
			link: function (scope, element) {
				element.on('click', function () {
					window.history.back();
				});
			}
		};
	});
