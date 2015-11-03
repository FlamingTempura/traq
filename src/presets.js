'use strict';

var angular = require('angular'),
	_ = require('lodash'),
	moment = require('moment');

var expensesData = function () {
	var expenses = [];
	_.times(700, function (i) {
		if (Math.random() > 0.3) { return; }
		expenses.push({
			timestamp: moment()
				.subtract(i, 'days')
				.hour(Math.round(Math.random() * 24))
				.minute(Math.round(Math.random() * 60))
				.second(Math.round(Math.random() * 60))
				.toDate(),
			value: Math.round(Math.random() * 10000) / 100
		});
	});
	return expenses;
};

angular.module('traq')
	.constant('presetColumns', [
		{
			name: 'Weight',
			color: '#87D37C',
			icon: 'filter-frames',
			units: [
				{ title: 'kg', value: 'kg', default: true },
				{ title: 'lbs', value: 'lbs' },
				{ title: 'st', value: 'st' }],
			fakeData: function () {
				var weights = [],
					lastWeight = 50 + Math.round(Math.random() * 20);
				_.times(700, function (i) {
					if (Math.random() > 0.3) { return; }
					weights.push({
						timestamp: moment()
							.subtract(i, 'days')
							.hour(Math.round(Math.random() * 24))
							.minute(Math.round(Math.random() * 60))
							.second(Math.round(Math.random() * 60))
							.toDate(),
						value: lastWeight + Math.round(Math.random() * 1 * 10) / 10
					});
				});
				return weights;
			}
		},
		{
			name: 'Height',
			color: '#F4D03F',
			icon: 'straighten',
			units: [
				{ title: 'm', value: 'm', default: true },
				{ title: 'ft', value: 'ft' }],
			fakeData: function () {
				return [{
					timestamp: new Date(),
					value: 1 + Math.round(Math.random() * 100) / 100
				}];
			}
		},
		{
			name: 'Food (Expense)',
			color: '#F4D03F',
			icon: 'shopping-basket',
			units: [
				{ title: 'GBP', value: 'GBP', default: true },
				{ title: 'USD', value: 'USD' }],
			fakeData: expensesData
		},
		{
			name: 'Rent (Expense)',
			color: '#81CFE0',
			icon: 'shopping-basket',
			units: [
				{ title: 'GBP', value: 'GBP', default: true },
				{ title: 'USD', value: 'USD' }],
			fakeData: expensesData
		},
		{
			name: 'Utilities (Expense)',
			color: '#19B5FE',
			icon: 'shopping-basket',
			units: [
				{ title: 'GBP', value: 'GBP', default: true },
				{ title: 'USD', value: 'USD' }],
			fakeData: expensesData
		},
		{
			name: 'Transport (Expense)',
			color: '#F9690E',
			icon: 'shopping-basket',
			units: [
				{ title: 'GBP', value: 'GBP', default: true },
				{ title: 'USD', value: 'USD' }],
			fakeData: expensesData
		},
		{
			name: 'Shopping (Expense)',
			color: '#ED009A',
			icon: 'shopping-basket',
			units: [
				{ title: 'GBP', value: 'GBP', default: true },
				{ title: 'USD', value: 'USD' }],
			fakeData: expensesData
		},
		{
			name: 'Other (Expense)',
			color: '#ECF0F1',
			icon: 'shopping-basket',
			units: [
				{ title: 'GBP', value: 'GBP', default: true },
				{ title: 'USD', value: 'USD' }],
			fakeData: expensesData
		}
	])
	.constant('presetTraqCategories', [
		{ id: 'health', title: 'Health', color: '#F62459' },
		{ id: 'sport', title: 'Sport', color: '#F9BF3B' },
		{ id: 'finance', title: 'Finance', color: '#26A65B' },
		{ id: 'other', title: 'Other', color: '#BDC3C7' }
	])
	.service('presetTraqs', function () {
		return [
			{
				id: 'weight',
				title: 'Weight',
				category: 'health',
				icon: 'filter-frames',

				charts: [
					{
						type: 'line',
						requireColumns: ['Weight'],
						columns: [{ name: 'Weight', axis: 'left' }]
					}
				],

				insights: [
					{
						title: 'Change',
						requireColumns: ['Weight'],
						html: function (traq, data) {
							var weight = _.findWhere(data, { name: 'Weight' }),
								weights = weight.measurements;
							if (!weights || !weights.length) { return ''; }
							var weightA = _.first(weights).value,
								weightB = _.last(weights).value,
								weightUnit = weight.unit,
								icon = weightA > weightB ? 'arrow-drop-down' : 'arrow-drop-up';
							return '<span class="mi mi-24 mi-' + icon + '"></span>' + Math.round((weightB - weightA) * 10) / 10 + ' ' + weightUnit;
						}
					},
					{
						title: 'Weight',
						requireColumns: ['Weight'],
						html: function (traq, data) {
							var weight = _.findWhere(data, { name: 'Weight' }),
								weights = weight.measurements;
							if (!weights || !weights.length) { return ''; }
							var latestWeight = _.last(weights).value,
								weightUnit = weight.unit;
							return latestWeight + ' ' + weightUnit;
						}
					},
					{
						title: 'BMI',
						requireColumns: ['Weight', 'Height'],
						html: function (traq, data) {
							var weight = _.findWhere(data, { name: 'Weight' }),
								weights = weight.measurements,
								height = _.findWhere(data, { name: 'Height' }),
								heights = height.measurements;
							if (!heights || !weights || !heights.length || !weights.length) { return ''; }
							var latestHeight = _.last(heights).value, // TODO: unit conversion to m
								latestWeight = _.last(weights).value; // TODO: unit conversion to kg
							return String(Math.round(latestWeight / (latestHeight * latestHeight) * 10) / 10);
						}
					}
				]
			},
			{
				id: 'spending',
				title: 'Spending',
				category: 'finance',
				icon: 'shopping-basket',

				charts: [
					{
						type: 'line',
						requireColumns: ['Food (Expense)', 'Rent (Expense)', 'Utilities (Expense)', 'Transport (Expense)', 'Shopping (Expense)', 'Other (Expense)'],
						columns: [
							{ name: 'Food (Expense)', axis: 'left' },
							{ name: 'Rent (Expense)', axis: 'left' },
							{ name: 'Utilities (Expense)', axis: 'left' },
							{ name: 'Transport (Expense)', axis: 'left' },
							{ name: 'Shopping (Expense)', axis: 'left' },
							{ name: 'Other (Expense)', axis: 'left' }
						]
					}
				]
			},
			{
				id: 'steps',
				title: 'Steps',
				icon: 'directions-walk',
				category: 'health'
			},
			{
				id: 'milage',
				title: 'Milage',
				icon: 'filter-hdr',
				category: 'health'
			},
			{
				id: 'income',
				title: 'Income',
				icon: 'attach-money',
				category: 'finance'
			},
			{
				id: 'miles-ran',
				title: 'Miles ran',
				icon: 'directions-run',
				category: 'sport'
			},
			{
				id: 'heart-rate',
				title: 'Heart rate',
				icon: 'favorite',
				category: 'health',
				defaults: {
					title: 'Heart rate',
					columns: [{ id: 'heart-rate', name: 'Heart rate', unit: 'bpm' }]
				}, // TODO - age as an option to auto calculate BPM ranges
				charts: [
					{
						type: 'line',
						date: [{ column: 'heart-rate', axis: 'left', color: '#663399' }]
					}
				]
			} //,
			/*{
				id: 'temperature',
				title: 'Temperature',
				icon: 'wb-sunny',
				category: 'health'
			},
			{
				id: 'sleep',
				title: 'Sleep',
				icon: 'airline-seat-individual-suite',
				category: 'health'
			},
			{
				id: 'walking-distance',
				title: 'Walking distance',
				icon: 'directions-walk',
				category: 'health'
			},
			{
				id: 'height',
				title: 'Height',
				icon: 'straighten',
				category: 'health'
			},
			{
				id: 'calories',
				title: 'Calories',
				icon: 'local-pizza',
				category: 'health'
			}*/
			// @@FULL_PRESETS
		];
	});
