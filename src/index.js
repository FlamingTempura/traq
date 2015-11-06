'use strict';

var _ = require('lodash'),
	angular = require('angular'),
	ngMaterial = require('angular-material'),
	uiRouter = require('angular-ui-router'),
	PouchDB = require('pouchdb'),
	moment = require('moment');

angular.module('traq', [ngMaterial, uiRouter]).config(function ($mdThemingProvider, $urlRouterProvider) {
	$mdThemingProvider.theme('default')
		.dark()
		.primaryPalette('yellow');
	$urlRouterProvider.otherwise('/');
}).controller('AppCtrl', function ($scope, snack) {
	$scope.snack = snack;
}).run(function ($q, $rootScope, snack) {
	$rootScope.$on('$stateChangeStart', function (event, to, toParams, from) {
		console.log(to, from)
		var upAnimation = to.url.split('/') > from.url.split('/');
		angular.element(document.body)
			.toggleClass('animate-up', upAnimation)
			.toggleClass('animate-down', !upAnimation);
	});
	$rootScope.$on('$stateChangeError', function (event, to, toParams, from, fromParams, err) {
		snack('An error occured. Try again.'); // TODO: a more user-friendly message
		console.error('stateChangeError', err);
	});
	$rootScope.windowHeight = window.innerHeight;
	// TODO on resize, change windowHeight
	PouchDB.plugin(require('transform-pouch'));
	PouchDB.plugin({
		getAll: function (options) {
			var that = this;
			options = _.extend({ include_docs: true }, options);
			if (options.startWith) {
				_.extend(options, {
					startkey: options.startWith + ':',
					endkey: options.startWith + ':\uffff'
				});
			}
			return this.allDocs(options).then(function (result) {
				return _.pluck(result.rows, 'doc');
			}).then(function (docs) {
				if (that.filterFn) {
					return $q.all(_.map(docs, that.filterFn)).then(function (results) {
						return _.select(docs, function (doc, i) {
							return results[i];
						});
					});
				} else {
					return docs;
				}
			});
		},
		exists: function (id) {
			return this.allDocs({
				startkey: id,
				endkey: id
			}).then(function (result) {
				return result.rows.length > 0;
			});
		},
		// use angular promises ($q) to avoid need for $scope.$apply
		observe: function ($q) {
			var that = this,
				methods = ['destroy', 'put', 'post', 'get', 'remove', 'bulkDocs', 'allDocs',
					'changes', 'putAttachment', 'getAttachment', 'removeAttachment',
					'query', 'viewCleanup', 'info', 'compact', 'revsDiff'];
			methods.forEach(function (method) {
				that[method] = function () {
					return $q.resolve(PouchDB.prototype[method].apply(that, arguments));
				};
			});
		},
		filter: function (fn) {
			this.filterFn = fn;
		}
	});
}).service('dbConfig', function ($q) {
	var db = new PouchDB('track-config');
	db.observe($q);
	return db;
}).service('dbTraq', function ($q, presetTraqs) {
	var db = new PouchDB('traq-traq');
	db.observe($q);
	db.transform({
		incoming: function (doc) {
			var preset = _.findWhere(presetTraqs, { id: doc._id });
			return preset ? _.pick(doc, '_id', '_rev') : _.pick(doc, '_id', '_rev', 'title', 'insights', 'charts');
		},
		outgoing: function (doc) {
			var preset = _.findWhere(presetTraqs, { id: doc._id });
			return _.extend({ preset: !!preset }, doc, _.pick(preset, 'title', 'insights', 'charts'));
		}
	});
	return db;
}).service('dbColumn', function ($q, presetColumns) {
	var db = new PouchDB('traq-column');
	db.observe($q);
	db.transform({
		incoming: function (doc) {
			return _.pick(doc, '_id', '_rev', 'unit');
		},
		outgoing: function (doc) {
			var preset = _.findWhere(presetColumns, { name: doc._id });
			return _.extend({
				preset: !!preset,
				safeName: doc._id.replace(/[^a-zA-Z0-9-]/g, '-')
			}, doc, _.pick(preset, 'name', 'color', 'icon', 'units'));
		}
	});
	return db;
}).service('dbMeasurement', function ($q) {
	var db = new PouchDB('traq-measurement');
	db.observe($q);
	db.transform({
		incoming: function (doc) {
			return _.pick(doc, '_id', '_rev', 'value', 'note');
		},
		outgoing: function (doc) {
			var idParts = doc._id.split(':');
			return _.extend({}, doc, {
				columnId: idParts[0],
				timestamp: moment(idParts[1], 'YYYYMMDD[-]HHmmss').toDate()
			});
		}
	});
	return db;
}).service('getData', function ($q, dbMeasurement, dbColumn) {
	return function (traq) {
		var requireColumns = _.union(_.flattenDeep([
			_.pluck(traq.charts, 'requireColumns'),
			_.pluck(traq.insights, 'requireColumns')
		]));
		return $q.all(_.map(requireColumns, function (columnName) {
			return dbColumn.get(columnName).then(function (column) {
				return dbMeasurement.getAll({ startWith: columnName }).then(function (measurements) {
					return _.extend({}, column, { measurements: measurements });
				});
			});
		}));
	};
}).service('download', function () {
	// http://stackoverflow.com/questions/3665115/create-a-file-in-memory-for-user-to-download-not-through-server
	return function (filename, text) {
		var element = document.createElement('a');
		element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
		element.setAttribute('download', filename);

		element.style.display = 'none';
		document.body.appendChild(element);

		element.click();

		document.body.removeChild(element);
	};
}).service('snack', function ($timeout) {
	var snack = function (message, buttonText, buttonFn) {
		snack.message = message;
		snack.buttonText = buttonText;
		snack.buttonFn = function () {
			buttonFn();
			delete snack.message;
		};
		$timeout(function () {
			delete snack.message;
		}, 5000);
	};
	return snack;
}).directive('fileReader', function () {
	return {
		restrict: 'E',
		replace: true,
		template: '<input type="file">',
		scope: {
			contents: '=',
			name: '=',
			format: '='
		},
		link: function (scope, element) {
			var permittedFormats = {
				csv: ['.csv', 'text/csv'],
				tsv: ['.tsv'],
				tcx: ['.tcx']
			};

			element.on('change', function () {
				var reader = new FileReader(),
					file = element[0].files[0],
					extension = file.name.indexOf('.') > -1 ? file.name.match(/\.[^.\/]+$/)[0] : '',
					name = file.name.slice(0, -extension.length),
					format = _.chain(permittedFormats).keys().find(function (format) {
						return permittedFormats[format].indexOf(extension) > -1 ||
							permittedFormats[format].indexOf(file.type) > -1;
					});

				if (!format) {
					console.error('File format not supported');
					return;
				}

				reader.onload = function () {
					scope.name = name;
					scope.format = format;
					scope.contents = reader.result;
					scope.$apply();
				};
				reader.readAsText(file);
			});
		}
	};
}).directive('uiBack', function () {
	return {
		restrict: 'A',
		link: function (scope, element) {
			element.on('click', function () {
				window.history.back();
			});
		}
	};
}).directive('stopPropagation', function () {
	return {
		restrict: 'A',
		link: function (scope, element) {
			element.on('click', function (e) {
				e.stopPropagation();
			});
		}
	};
}).filter('startFrom', function () {
	return function (input, start) {
		return input && input.slice(start);
	};
});

require('./presets.js');
require('./state/welcome.js');
require('./state/chart-edit.js');
require('./state/chart-view.js');
require('./state/export.js');
require('./state/feedback.js');
require('./state/home.js');
require('./state/import.js');
require('./state/measurement-edit.js');
require('./state/settings-dropbox.js');
require('./state/settings.js');
require('./state/traq-new.js');
require('./state/traq-edit.js');
require('./state/data.js');
require('./chart/chart.js');
require('./chart/line.js');
//require('./chart/bar.js');
