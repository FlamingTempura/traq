'use strict';

var _ = require('lodash'),
	angular = require('angular'),
	ngMaterial = require('angular-material'),
	uiRouter = require('angular-ui-router'),
	PouchDB = require('pouchdb'),
	uuid = require('node-uuid');

angular.module('traq', [ngMaterial, uiRouter])
	.controller('AppCtrl', function ($scope, snack) {
		$scope.snack = snack;
	})
	.run(function ($q) {
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
	})
	.service('dbTable', function ($q) {
		var db = new PouchDB('traq-table');
		db.observe($q);
		db.transform({
			incoming: function (doc) {
				return _.extend({}, doc, {
					columns: _.map(doc.columns, function (column) {
						return {
							id: column.id || 'col' + uuid.v4(),
							name: column.name,
							unit: column.unit
						};
					})
				});
			}
		});
		return db;
	})
	.service('dbRow', function ($q) {
		var db = new PouchDB('traq-row');
		db.observe($q);
		db.transform({
			incoming: function (doc) {
				return _.extend({}, doc, {
					date: new Date(doc.date).getTime()
				});
			},
			outgoing: function (doc) {
				return _.extend({}, doc, { date: new Date(doc.date) });
			}
		});
		return db;
	})
	.service('dbChart', function ($q, dbTable) {
		var db = new PouchDB('traq-chart');
		db.observe($q);
		db.filter(function (chart) {
			var tableId = chart._id.split(':')[0];
			return dbTable.exists(tableId);
		});
		db.transform({
			incoming: function (doc) {
				doc = _.extend({}, doc);
				delete doc.table;
				return doc;
			},
			outgoing: function (doc) {
				return _.extend({}, doc, {
					table: doc._id.split(':')[0]
				});
			}
		});
		return db;
	})
	.config(function ($stateProvider, $urlRouterProvider) {
		$urlRouterProvider.otherwise('/');
	})
	.directive('fileReader', function () {
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
	})
	.service('download', function () {
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
	})
	.service('rowsSelected', function () { return {}; })
	.directive('uiBack', function () {
		return {
			restrict: 'A',
			link: function (scope, element) {
				element.on('click', function () {
					window.history.back();
				});
			}
		};
	})
	.filter('startFrom', function () {
		return function (input, start) {
			return input && input.slice(start);
		};
	})
	.service('snack', function ($timeout) {
		var snack = function (message, buttonText, buttonFn) {
			snack.message = message;
			snack.buttonText = buttonText;
			snack.buttonFn = buttonFn;
			$timeout(function () {
				delete snack.message;
			}, 5000);
		};
		return snack;
	})
	.service('presets', function () {
		return [
			{
				title: 'Weight',
				category: 'Health & Wellbeing',
				icon: 'filter-frames',
				options: {
					unit: {
						label: 'Unit',
						type: 'radio',
						options: ['kg', 'lbs', 'st']
					}
				},
				generate: function (options) {
					return {
						table: {
							title: 'Weight',
							precision: 'day',
							columns: [
								{ name: 'Weight', unit: options.unit }
							]
						}
					};
				}
			},
			{
				title: 'Spending',
				category: 'Budget',
				icon: 'shopping-basket',
				options: {
					currency: {
						label: 'Currency',
						type: 'select',
						options: ['GBP', 'USD'],
						custom: true
					}
				}
			},
			{
				title: 'Steps',
				icon: 'directions-walk',
				category: 'Health & Wellbeing'
			},
			{
				title: 'Hours worked',
				icon: 'work',
				category: 'Business'
			},
			{
				title: 'Power usage',
				icon: 'power',
				category: 'Misc'
			},
			{
				title: 'Milage',
				icon: 'filter-hdr',
				category: 'Misc'
			},
			{
				title: 'Income',
				icon: 'attach-money',
				category: 'Business'
			},
			{
				title: 'Miles ran',
				icon: 'directions-run',
				category: 'Sport'
			},
			{
				title: 'Heart rate',
				icon: 'favorite',
				category: 'Health & Wellbeing'
			},
			{
				title: 'Temperature',
				icon: 'wb-sunny',
				category: 'Misc'
			},
			{
				title: 'Hours slept',
				icon: 'airline-seat-individual-suite',
				category: 'Health & Wellbeing'
			},
			{
				title: 'Distance walked',
				icon: 'directions-walk',
				category: 'Health & Wellbeing'
			},
			{
				title: 'Mood',
				icon: 'mood',
				category: 'Health & Wellbeing'
			},
			{
				title: 'Height',
				icon: 'straighten',
				category: 'Health & Wellbeing'
			},
			{
				title: 'Calories',
				icon: 'local-pizza',
				category: 'Health & Wellbeing'
			},
			{
				title: 'Alcohol consumption',
				icon: 'local-drink',
				category: 'Health & Wellbeing'
			},
			{
				title: 'Quarterly sales',
				icon: 'attach-money',
				category: 'Business'
			}
		];
	});

require('./state/chart-edit.js');
require('./state/chart-view.js');
require('./state/export.js');
require('./state/feedback.js');
require('./state/home.js');
require('./state/import.js');
require('./state/main.js');
require('./state/row-edit.js');
require('./state/settings-dropbox.js');
require('./state/settings.js');
require('./state/table-edit.js');
require('./state/table-view.js');
require('./state/table.js');
require('./chart/chart.js');
require('./chart/line.js');
//require('./chart/bar.js');
