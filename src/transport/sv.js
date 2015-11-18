'use strict';

// CSV and TSV

var angular = require('angular');

angular.module('traq').config(function (transports) {
	transports.push({
		id: 'csv',
		title: 'CSV',
		import: function () {

		},
		export: function () {

		}
	}, {
		id: 'tsv',
		title: 'TSV',
		import: function () {

		},
		export: function () {
			
		}
	});
});


/*
	_ = require('lodash'),
	X2JS = require('xml-json-parser'),
	jsonPath = require('JSONPath'),
	uuid = require('node-uuid'),
	d3 = require('d3')
	var dateColumnNames = ['date', 'time'];

			// { name: { first: 'John', 'last': 'Smith' } }
			// --> { namefirst: 'John', namelast: 'Smith' }
			var flattenObj = function (obj) {
				var newObj = {};
				_.each(obj, function (val, key) {
					if (_.isObject(val)) {
						_.each(flattenObj(val), function (val, key2) {
							if (_.isObject(val)) {
								newObj[key + key2] = val;
							} else {
								newObj[key + key2] = val;
							}
						});
					} else {
						newObj[key] = obj[key];
					}
				});
				return newObj;
			};

			var parseNameUnit = function (name) {
				var searchUnits = ['meters', 'metres', 'bpm', 'km', 'minutes', 'hours', 'milliseconds', 'seconds', 'calories'],
					unit = _.find(searchUnits, function (unit) {
						return name.toLocaleLowerCase().indexOf(unit) > -1;
					});
				if (unit) {
					var i = name.toLocaleLowerCase().indexOf(unit);
					name = name.slice(0, i).trim() + name.slice(i + unit.length).trim();
				} else {
					// brackets
					var parts = name.match(/^(.*?)\s*(?:\(([^()]*)\))?\s*$/);
					console.log(parts)
					name = parts[1];
					unit = parts[2];
				}
				console.log(name, unit);
				return { name: name, unit: unit };
			};

			var importers = {
				sv: function (contents, type) {
					// fix: remove fitbit header
					var lines = contents.split('\n');
					if (lines[0].split(',').length === 1 && lines[1].split(',').length > 1) {
						contents = lines.slice(1).join('\n');
					}
					// end fix
					// fix: remove blank lines at end
					contents = contents.trim();
					// end fix
					return d3[type].parse(contents);
				},
				csv: function (contents) { return importers.sv(contents, 'csv'); },
				tsv: function (contents) { return importers.sv(contents, 'tsv'); },
				tcx: function (contents) {
					var json = (new X2JS()).xml_str2json(contents),
						trackpoints = jsonPath(null, json, '$..Trackpoint')[0];
					var data = _.map(trackpoints, function (trackpoint) {
						return flattenObj(trackpoint);
					});
					console.log(data);
					return data;
				}
			};

			$scope.import = {};
			$scope.$watch('import.contents', function (contents) {
				if (!contents) { return; }

				var data = importers[$scope.import.format](contents),
					keys = _.keys(data[0]),
					dateKey = _.find(keys, function (key) {
						return dateColumnNames.indexOf(key.trim().toLocaleLowerCase()) > -1;
					});
				if (!dateKey) {
					throw 'Date key not found';
				}
				// fix: try to normalise dates to MM-dd-YYYY :(
				var isDDMMYYYY = _.reduce(data, function (memo, row) {
					var parts = row[dateKey].split(/[-\\\/ ]/);
					return parts[0] && (memo || Number(parts[0]) > 12 && Number(parts[0]) < 32); // isn't a month or year - must be a day
				}, false);
				if (isDDMMYYYY) {
					_.each(data, function (row) {
						row[dateKey] = row[dateKey].split(/[-\\\/ ]/).reverse().join('-');
					});
				}
				// end fix
				$scope.traq = {
					_id: 'tbl' + uuid.v4(),
					title: $scope.import.title,
					columns: _.chain(keys).map(function (key) {
						var parts = parseNameUnit(key);
						return {
							id: 'col' + uuid.v4(),
							name: parts.name,
							unit: parts.unit,
							originalKey: key
						};
					}).reject(function (column) {
						return column.originalKey === dateKey;
					}).value()
				};

				$scope.rows = _.map(data, function (_row) {
					var row = {
						_id: $scope.traq._id + ':row' + uuid.v4(),
						date: Date.parse(_row[dateKey])
					};
					_.each($scope.traq.columns, function (column) {
						row[column.id] = Number(_row[column.originalKey]);
					});
					return row;
				});
				console.log($scope.traq, $scope.rows);

			});
			$scope.import = function () {
				$state.go('traq-edit', { tid: 'new', traq: $scope.traq, rows: $scope.rows });
			};*/



			//redirectUri = 'http://localhost/callback',
				//'&redirect_uri=' + redirectUri, '_system'));
			/*browser.addEventListener('loadstart', function (event) {
				console.log('loadstart');
				if (event.url.indexOf(redirectUri) === 0) {
					browser.close();
					var response = event.url;
					console.log('RESPONSE', response);
				}
			});*/

