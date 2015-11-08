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
