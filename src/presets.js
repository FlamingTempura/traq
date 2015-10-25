'use strict';

var angular = require('angular'),
	_ = require('lodash');

angular.module('traq')
	.service('presets', function () {
		return {
			categories: [
				{ id: 'health', title: 'Health', color: '#F62459' },
				{ id: 'sport', title: 'Sport', color: '#F9BF3B' },
				{ id: 'finance', title: 'Finance', color: '#26A65B' },
				{ id: 'other', title: 'Other', color: '#BDC3C7' }
			],
			presets: [
				{
					id: 'weight',
					title: 'Weight',
					category: 'health',
					icon: 'filter-frames',
					defaults: {
						title: 'Weight',
						unit: 'kg',
						precision: 'day',
						columns: [{ id: 'weight', name: 'Weight', unit: 'kg' }]
					},
					options: [
						{
							id: 'unit',
							title: 'Unit',
							type: 'radio',
							options: [
								{ title: 'kg', value: 'kg' },
								{ title: 'lbs', value: 'lbs' },
								{ title: 'st', value: 'st' }]
						},
						{
							id: 'height',
							title: 'Height',
							type: 'number',
							unit: 'm'
						}
					],
					charts: [
						{
							type: 'line',
							data: [{ column: 'weight', axis: 'left', color: '#663399' }]
						}
					],
					facts: [
						{
							title: 'Change',
							value: function (traq, rows) {
								if (!rows) { return; }
								var weightA = _.first(rows).weight,
									weightB = _.last(rows).weight,
									weightUnit = _.findWhere(traq.columns, { id: 'weight' }).unit;
								return weightB - weightA + ' ' + weightUnit;
							}
						},
						{
							title: 'Weight',
							value: function (traq, rows) {
								if (!rows) { return; }
								var weight = _.last(rows).weight,
									weightUnit = _.findWhere(traq.columns, { id: 'weight' }).unit;
								return weight + ' ' + weightUnit;
							}
						},
						{
							title: 'BMI',
							value: function (traq, rows) {
								if (!rows) { return; }
								var heightM = traq.height,
									weight = _.last(rows).weight,
									weightUnit = _.findWhere(traq.columns, { id: 'weight' }).unit,
									weightKg = weight; // TODO: unit conversion

								return Math.round(weightKg / (heightM * heightM) * 10) / 10;
							},
							description: function (traq) {
								return 'Body Mass Index (BMI)';
							}
						}
					],
					reconstructTraq: function (traq) {
						console.log(traq)
						// TODO: on unit change, convert all values
						_.findWhere(traq.columns, { id: 'weight' }).unit = traq.unit;
					}
				},
				{
					id: 'spending',
					title: 'Spending',
					category: 'finance',
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
				}//,
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
			]
		};
	});
