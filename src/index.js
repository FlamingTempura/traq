'use strict';

var _ = require('lodash'),
	angular = require('angular'),
	ngMaterial = require('angular-material'),
	ngTranslate = require('angular-translate'),
	uiRouter = require('angular-ui-router'),
	PouchDB = require('pouchdb'),
	moment = require('moment/min/moment-with-locales.js');

PouchDB.plugin(require('transform-pouch'));
PouchDB.plugin(require('pouchdb-undo'));
PouchDB.plugin({
	getAll: function (options) {
		options = _.extend({ include_docs: true }, options);
		if (options.startWith) {
			_.extend(options, {
				startkey: options.startWith + ':',
				endkey: options.startWith + ':\uffff'
			});
		}
		return this.allDocs(options).then(function (result) {
			return _.pluck(result.rows, 'doc');
		});
	},
	getOrCreate: function (id) {
		var that = this;
		return that.get(id).catch(function (err) {
			if (err.status !== 404) { throw err; }
			return that.put({ _id: id }).then(function () {
				return that.get(id);
			});
		});
	},
	exists: function (id) {
		return this.get(id).then(function () {
			return true;
		}).catch(function (err) {
			if (err.status !== 404) { throw err; }
			return false;
		});
	},
	count: function () {
		return this.allDocs({ keys: [] }).then(function (res) {
			return res.total_rows;
		});
	},
	erase: function () {
		var that = this;
		return that.allDocs({ }).then(function (res) {
			console.log('all', res.rows[0])
			return that.bulkDocs(_.map(res.rows, function (row) {
				return { _id: row.id, _rev: row.value.rev, _deleted: true };
			}));
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
	}
});

var fastclick = function () {
	return {
		restrict: 'A',
		link: function (scope, element, attrs) {
			if (attrs.hasOwnProperty('noFastclick')) { return; }
			element.bind('touchstart', function (e) {
				e.preventDefault();
				e.stopPropagation();
				element[0].click();
			});
		}
	};
};

var progressSplashI = 0,
	progressSplash = function () {
		progressSplashI++;
		if (navigator.splashscreen && progressSplashI >= 2) {
			navigator.splashscreen.hide();
		}
	};

document.addEventListener('deviceready', function () {
	progressSplash();
}, false);


angular.module('traq', [ngMaterial, ngTranslate, uiRouter]).config(function ($mdThemingProvider, $urlRouterProvider, $translateProvider, $provide) {
	$mdThemingProvider.theme('default')
		.dark()
		.primaryPalette('yellow');
	$urlRouterProvider.otherwise('/');
	$translateProvider.preferredLanguage('en')
		//.determinePreferredLanguage();
		.fallbackLanguage('en')
		.useSanitizeValueStrategy('escape')
		.statefulFilter(false);
	$provide.decorator('$log', function ($delegate) {
		$delegate.instance = function (name, color) {
			var $log = {},
				disable;
			['log', 'info', 'warn', 'error', 'debug'].forEach(function (method) {
				$log[method] = function () {
					if (disable) { return; }
					var args = Array.prototype.slice.call(arguments);
					args.unshift('%c' + name, 'margin-left: -7px;border-left:2px solid ' + color + '; color:' + color + ';padding-left:5px;text-transform:uppercase;');
					$delegate[method].apply(null, args);
				};
			});
			$log.disable = function () {
				disable = true;
				return $log;
			};
			return $log;
		};
		return $delegate;
	});
}).value('locale', {
	code: 'en'
}).controller('AppCtrl', function ($scope, snack) {
	$scope.snack = snack;
}).run(function ($q, $rootScope, $locale, $translate, snack, dbConfig, locale) {
	progressSplash();
	var urlDepth = function (url) {
		return _.compact(url.split('?')[0].split('/')).length;
	};
	$rootScope.$on('$stateChangeStart', function (event, to, toParams, from) {
		angular.element(document.body)
			.toggleClass('animate-up', urlDepth(to.url) > urlDepth(from.url))
			.toggleClass('animate-down', urlDepth(to.url) < urlDepth(from.url));
	});
	$rootScope.$on('$stateChangeError', function (event, to, toParams, from, fromParams, err) {
		snack('An error occured. Try again.'); // TODO: a more user-friendly message
		console.error('stateChangeError', err, to);
	});
	$rootScope.windowHeight = window.innerHeight;
	// TODO on resize, change windowHeight
	dbConfig.getOrCreate('language').then(function (doc) { // FIXME: will this happen before render?
		if (!doc.code) { return; }
		$translate.use(doc.code);
		moment.locale(doc.code);
		locale.code = doc.code;
	});
}).service('dbConfig', function ($q) {
	var db = new PouchDB('traq-config');
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
			}, doc, _.pick(preset, 'name', 'color', 'icon', 'units', 'forecast'));
		}
	});
	return db;
}).service('dbMeasurement', function ($q) {
	var db = new PouchDB('traq-measurement');
	db.observe($q);
	db.enableUndo();
	db.transform({
		incoming: function (doc) {
			// TODO: check that timestamp === _id.split(':')[1]
			return _.chain(doc).pick('_id', '_rev', 'value', 'from', 'note').value();
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
	return function (traq, startDate, endDate) {
		var requireColumns = _.union(_.flattenDeep([
			_.pluck(traq.charts, 'requireColumns'),
			_.pluck(traq.insights, 'requireColumns')
		]));
		return $q.all(_.map(requireColumns, function (columnName) {
			return dbColumn.get(columnName).then(function (column) {
				return dbMeasurement.getAll({
					startkey: columnName + ':' + (startDate ? moment(startDate).format('YYYYMMDD[-]HHmmss') : ''),
					endkey: columnName + ':' + (endDate ? moment(endDate).format('YYYYMMDD[-]HHmmss') : '\uffff')
				}).then(function (measurements) {
					// get the preceding measurement so that the plot will not start part way through the time span
					return dbMeasurement.getAll({
						descending: true,
						startkey: columnName + ':' + (startDate ? moment(startDate).format('YYYYMMDD[-]HHmmss') : ''),
						endkey: columnName + ':' + (endDate ? moment(endDate).format('YYYYMMDD[-]HHmmss') : '\uffff'),
						limit: 1
					}).then(function (preMeasurements) {
						return _.extend({}, column, { measurements: preMeasurements.concat(measurements) });
					});
				});
			});
		}));
	};
}).service('createPreset', function ($q, dbTraq, dbColumn, presetTraqs, presetColumns) {
	return function (id) {
		return dbTraq.exists(id).then(function (exists) {
			if (exists) { return; }
			var traq = _.extend({ _id: id }, _.findWhere(presetTraqs, { id: id })),
				requireColumns = _.union(_.flattenDeep([
					_.pluck(traq.charts, 'requireColumns'),
					_.pluck(traq.insights, 'requireColumns')
				]));
			return $q.all(_.map(requireColumns, function (columnName) {
				var presetColumn = _.findWhere(presetColumns, { name: columnName });
				return dbColumn.exists(presetColumn.name).then(function (exists) {
					if (exists) { return; }
					return dbColumn.put({
						_id: presetColumn.name,
						unit: _.findWhere(presetColumn.units, { default: true }).value
					});
				});
			})).then(function () {
				return dbTraq.put(traq);
			});
		});
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
}).service('appUrl', function () { // handle traq:// urls
	var fns = [],
		on = function (event, fn, limit) {
			fns.push({ event: event, fn: fn, limit: limit });
		},
		off = function (event, fn) {
			fns = _.reject(fns, function (o) {
				return (!event || o.event === event) && (!fn || o.fn === fn);
			});
		},
		once = function (event, fn) {
			return on(event, fn, 1);
		};

	window.handleOpenURL = function (url) {
		console.log('Got traq:// url', url);
		var pathStart = url.indexOf('//') + 2,
			queryStart = url.indexOf('?'),
			path = url.slice(pathStart, queryStart),
			query = url.slice(queryStart + 1).split('&'),
			params = {};
		_.each(query, function (arg) {
			var parts = arg.split('=');
			params[parts[0]] = parts[1];
		});
		_.each(fns, function (o) {
			if (o.event === path) {
				o.fn(path, params);
				o.limit--;
				if (o.limit === 0) { off(o.event, o.fn); }
			}
		});
	};

	return {
		on: on,
		off: off,
		once: once
	};
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
}).directive('fastclick', fastclick)
.directive('ngClick', fastclick)
.directive('uiSref', fastclick)
.directive('autofocusDelay', function ($timeout) {
	return {
		restrict: 'A',
		link: function (scope, element, attrs) {
			$timeout(function () { element.focus(); }, attrs.autofocusDelay);
		}
	};
}).directive('extHref', function () {
	return {
		restrict: 'A',
		link: function (scope, element, attrs) {
			element.on('click', function () { window.open(attrs.extHref, '_system'); });
		}
	};
}).filter('localeDate', function () {
	return function (date, format) {
		var m = moment(date);
		if (format === 'calendar') {
			return m.calendar(null, { sameElse: 'ddd D MMM YYYY [at] H:mm A' });
		}
	};
}).filter('localeNumber', function (locale) {
	return function (number) {
		if (!locale.code || typeof number !== 'number') { return number; }
		return number.toLocaleString(locale.code);
	};
});

require('./config.js');

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
require('./state/measurements.js');

require('./chart/chart.js');
require('./chart/line.js');
//require('./chart/bar.js');

require('./transport/transport.js');
require('./transport/fake.js');
require('./transport/sv.js');
require('./transport/moves.js');
