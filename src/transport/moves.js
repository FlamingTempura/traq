'use strict';

// CSV and TSV

var angular = require('angular'),
	_ = require('lodash'),
	moment = require('moment'),
	uuid = require('node-uuid');

angular.module('traq').service('movesTransport', function ($q, $http, appUrl, dbConfig, dbMeasurement, createPreset, movesConfig) {
	var service = { moves: undefined };

	var config = function (_moves) {
		if (_moves) {
			return dbConfig.put(_moves).then(function () { return config(); });
		} else {
			return dbConfig.getOrCreate('moves').then(function (moves) {
				moves = _.extend({ columnMapping: {} }, moves);
				console.log('CONFIG:', moves);
				service.moves = moves;
				return moves;
			});
		}
	};

	var getToken = function () {
		console.log('getting token');
		return config().then(function (moves) {
			return $q(function (resolve, reject) {
				// open moves to get access token
				window.open(encodeURI('moves://app/authorize' +
					'?client_id=' + movesConfig.clientId +
					'&redirect_uri=traq://import/moves&scope=activity', '_system'));

				appUrl.once('import/moves', function (url, params) {
					if (params.error) {
						reject(params.error);
					} else {
						resolve(params.code);
					}
				});
			}).then(function (authCode) {
				return $http.post(encodeURI('https://api.moves-app.com/oauth/v1/access_token' +
					'?client_id=' + movesConfig.clientId +
					'&client_secret=' + movesConfig.clientSecret +
					'&grant_type=authorization_code' +
					'&code=' + authCode +
					'&redirect_uri=traq://import/moves&scope=activity'
				)).then(function (res) {
					return config(_.extend({}, moves, {
						accessToken: res.data.access_token,
						refreshToken: res.data.refresh_token
					}));
				});
			});
		});
	};

	var refreshToken = function () {
		console.log('refreshing token');
		return config().then(function (moves) {
			return $http.post(encodeURI('https://api.moves-app.com/oauth/v1/access_token' +
				'?client_id=' + movesConfig.clientId +
				'&client_secret=' + movesConfig.clientSecret +
				'&grant_type=refresh_token' +
				'&refresh_token=' + moves.refreshToken
			)).then(function (res) {
				return config(_.extend({}, moves, {
					accessToken: res.data.access_token,
					refreshToken: res.data.refresh_token
				}));
			});
		});
	};

	var deleteToken = function () {
		console.log('deleting token');
		return config().then(function (moves) {
			return config(_.omit(moves, 'accessToken', 'refreshToken'));
		});
	};

	var request = function (url, retry) {
		console.log('request', url, retry);
		return $http.get('https://api.moves-app.com/api/1.1' + url + '?access_token=' + service.moves.accessToken).catch(function (err) {
			if (retry || err.status !== 401) { throw 'sync failed'; }
			return refreshToken().then(function () {
				return sync(true);
			}).catch(function (err) {
				return deleteToken().then(function () {
					// TODO: toast?
					console.error('need new token', err);
					throw 'need token';
				});
			});
		});
	};

	var createTraqs = function () {
		console.log('createTraqs');
		return $q.all([createPreset('steps'), createPreset('calories-burnt'), createPreset('distance-travelled'), createPreset('physical-activity-duration')]);
	};

	var currentMonth = function () {
		return moment(moment().format('YYYYMM'), 'YYYYMM');
	};

	var lastFetchedMonth = function () {
		console.log('lastFetchedMonth');
		return config().then(function (moves) {
			if (moves.lastFetchedMonth) {
				return moment(moves.lastFetchedMonth, 'YYYYMM');
			}
			return request('/user/profile').then(function (res) {
				return moment(res.data.profile.firstDate, 'YYYYMMDD').subtract(1, 'month');
			});
		}).then(function (lastFetchedMonth) {
			return moment.max(lastFetchedMonth, currentMonth().subtract(24, 'months')); // max of 2 years
		});
	};

	var sync = function () {
		console.log('sync');
		return createTraqs().then(function () {
			return lastFetchedMonth();
		}).then(function (lastFetchedMonth) {
			var month = lastFetchedMonth.add(1, 'month'),
				monthStr = month.format('YYYYMM');
			if (month.valueOf() >= currentMonth().valueOf()) { return; }
			return request('/user/summary/daily/' + monthStr).then(function (res) {
				return importSummaries(res.data);
			}).then(function () {
				return config(_.extend({}, service.moves, {
					lastSynced: Date.now(),
					lastFetchedMonth: monthStr
				}));
			});
		}).then(function () {
			return sync();
		});
	};

	var columnMapping = {
		walking_distance: 'Walking (distance)',
		walking_steps: 'Walking (steps)',
		walking_duration: 'Walking (duration)',
		walking_calories: 'Walking (calories)',
		running_distance: 'Running (distance)',
		running_steps: 'Running (steps)',
		running_duration: 'Running (duration)',
		running_calories: 'Running (calories)',
		cycling_distance: 'Cycling (distance)',
		cycling_duration: 'Cycling (duration)',
		cycling_calories: 'Cycling (calories)'
	};

	var importSummaries = function (summaries) {
		console.log('importSummaries', summaries);
		return $q.all(_.map(summaries, function (summary) {
			return $q.all(_.map(summary.summary, function (activity) {
				return $q.all(_.map(_.pick(activity, 'duration', 'distance', 'steps', 'calories'), function (value, subactivity) {
					var columnName = columnMapping[activity.activity + '_' + subactivity];
					if (!columnName) { return; }
					dbMeasurement.put({
						_id: columnName + ':' + moment(summary.date, 'YYYYMMDD').format('YYYYMMDD[-]HHmmss') + ':' + uuid.v4().slice(0, 4),
						from: 'Moves',
						value: value
					});
				}));
			}));
		}));
	};

	config();

	// TODO: auto-sync - background task

	return _.extend(service, {
		getToken: getToken,
		deleteToken: deleteToken,
		sync: sync,
		config: config
	});
}).config(function ($stateProvider) {
	$stateProvider.state('import-moves', {
		url: '/import/moves',
		templateUrl: 'import-moves.html',
		import: {
			title: 'Moves',
			icon: 'img/icons/moves.svg'
		},
		resolve: {
			columns: function (dbColumn) { return dbColumn.getAll(); }
		},
		controller: function ($scope, columns, movesTransport) {
			$scope.movesTransport = movesTransport;
			$scope.columns = columns;
			$scope.importColumns = [
				{ id: 'walking_distance', title: 'Walking distance', column: _.findWhere(columns, { _id: 'Walking distance' }) },
				{ id: 'walking_duration', title: 'Walking duration', column: _.findWhere(columns, { _id: 'Walking duration' }) },
				{ id: 'walking_calories', title: 'Walking calories', column: _.findWhere(columns, { _id: 'Walking calories' }) },
				{ id: 'walking_steps', title: 'Walking steps', column: _.findWhere(columns, { _id: 'Walking steps' }) },
				{ id: 'running_distance', title: 'Running distance', column: _.findWhere(columns, { _id: 'Walking distance' }) },
				{ id: 'running_duration', title: 'Running duration', column: _.findWhere(columns, { _id: 'Walking duration' }) },
				{ id: 'running_calories', title: 'Running calories', column: _.findWhere(columns, { _id: 'Walking calories' }) },
				{ id: 'running_steps', title: 'Running steps', column: _.findWhere(columns, { _id: 'Walking steps' }) },
				{ id: 'cycling_distance', title: 'Cycling distance', column: _.findWhere(columns, { _id: 'Walking distance' }) },
				{ id: 'cycling_duration', title: 'Cycling duration', column: _.findWhere(columns, { _id: 'Walking duration' }) },
				{ id: 'cycling_calories', title: 'Cycling calories', column: _.findWhere(columns, { _id: 'Walking calories' }) }
			];
			$scope.$watch('movesTransport.moves.lastSynced', function (lastSynced) {
				if (!lastSynced) { return; }
				$scope.lastSynced = moment(lastSynced).calendar(null, { sameElse: 'ddd D MMM YYYY [at] H:mm A' });
			});
		}
	});
});


