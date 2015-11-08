'use strict';

// fake data generator

var angular = require('angular');

angular.module('traq').config(function (transports) {
	transports.push({
		id: 'fake',
		title: 'Fake data',
		import: function () {

		}
	});
});
