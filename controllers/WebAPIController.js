/*
 * Handles the Public API calls.
 */
var config = require('../local.config');
var validator = require('validator');
var user = require('./UserController');
var webData = require('./WebDataController');
var request = require('request');
var cheerio = require('cheerio');

var AppUsageHandler = require('../model/AppUsageHandler').AppUsageHandler;
var AppInfoHandler = require('../model/AppUsageHandler').AppInfoHandler;

var appController = require('./AppDataController');
var webController = require('./WebDataController');

var appCollection = null;
var appInfoCollection = null;

var WebUsageHandler = require('../model/WebUsageHandler').WebUsageHandler;
var WebStorageHandler = require('../model/WebUsageHandler').WebStorageHandler
var webCollection = null;
var webStorage = null;


/**
 * Initialize the db connection.
 *
 * @param {DBConnection} already connected db connection.
 * @api public
 */
exports.initDBConnection = function (_dbConn) {

	appCollection = new AppUsageHandler(_dbConn);
	appInfoCollection = new AppInfoHandler(_dbConn);

	webCollection = new WebUsageHandler(_dbConn);
	webStorage = new WebStorageHandler(_dbConn);

	appController.initDBConnection(_dbConn);
	webController.initDBConnection(_dbConn);

}


/**
 * API Call - Shows the app usage trends for the area.
 *
 * @param {String} duration
 * @param {Double} latitude
 * @param {Double} Longitude
 * @return {HTTPRESPONSE} response.
 * @api public
 */
exports.appNearby = function (req, res) {

	var lat = parseFloat(req.param('lat'));
	var lng = parseFloat(req.param('lng'));
	var limit = config.max_trends_result;

	if (req.param('limit')) {
		if (parseInt(req.param('limit')) > 0) limit = parseInt(req.param('limit'));
	}

	var timeperiod = parseInt(req.param('duration'));

	if (!(90 > lng && lng < -90) || !(180 > lat && lat < -180) || timeperiod < 1) {
		appCollection.appTrendsInArea(req.param('duration'), lat, lng, function (error_info, result) {
			if (result) {

				result.sort(function (a, b) {
					return parseInt(b.value) - parseInt(a.value)
				});
				if (result.length > limit) result = result.slice(0, limit);
			}
			if (!error_info) {
				appController.associateValues(result, function (data) {
					res.json(data);
				});
			} else {
				res.statusCode = 500;
				return res.json({
					error: "Invalid request."
				});
			}
		});
	} else {
		res.statusCode = 400;
		return res.json({
			error: "Invalid coordinates."
		});
	}
}

/**
 * API Call - Shows the app usage trends for the particular time of the day.
 *
 * @param {String} duration
 * @param {Double} timespan
 * @param {Double} start_time
 * @return {HTTPRESPONSE} response.
 * @api public
 */
exports.appDuringHours = function (req, res) {

	var minutes = parseInt(req.param('timespan'));
	var dayminute = parseInt(req.param('start_time'));

	var limit = config.max_trends_result;

	if (req.param('limit')) {
		if (parseInt(req.param('limit')) > 0) limit = parseInt(req.param('limit'));
	}

	var timeperiod = parseInt(req.param('duration'));

	if (!(minutes < 0 || dayminute < 0 || timeperiod < 0)) {
		appCollection.appTrendsDuringHours(req.param('duration'), dayminute, minutes, function (error_info, result) {
			if (result) {

				result.sort(function (a, b) {
					return parseInt(b.value) - parseInt(a.value)
				});
				if (result.length > limit) result = result.slice(0, limit);
			}
			if (!error_info) {
				appController.associateValues(result, function (data) {
					res.json(data);
				});
			} else {
				res.statusCode = 500;
				return res.json({
					error: "Invalid request."
				});
			}
		});
	} else {
		res.statusCode = 400;
		return res.json({
			error: "Invalid parameters."
		});
	}
}

/**
 * API Call - Shows the app usage trends for the particular time of the day at a location.
 *
 * @param {String} duration
 * @param {Double} timespan
 * @param {Double} start_time
 * @param {Double} latitude
 * @param {Double} Longitude
 * @return {HTTPRESPONSE} response.
 * @api public
 */
exports.appDuringHoursAtLocation = function (req, res) {

	var minutes = parseFloat(req.param('timespan'));
	var dayminute = parseInt(req.param('start_time'));

	var lat = parseFloat(req.param('lat'));
	var lng = parseFloat(req.param('lng'));

	var limit = config.max_trends_result;

	if (req.param('limit')) {
		if (parseInt(req.param('limit')) > 0) limit = parseInt(req.param('limit'));
	}

	var timeperiod = parseInt(req.param('duration'));

	if (!(90 > lng && lng < -90) || !(180 > lat && lat < -180) || minutes < 0 || dayminute < 0 || timeperiod < 1) {
		appCollection.appTrendsDuringHoursAtLocation(req.param('duration'), dayminute, minutes, lat, lng, function (error_info, result) {
			if (result) {

				result.sort(function (a, b) {
					return parseInt(b.value) - parseInt(a.value)
				});
				if (result.length > limit) result = result.slice(0, limit);
			}
			if (!error_info) {
				appController.associateValues(result, function (data) {
					res.json(data);
				});
			} else {
				res.statusCode = 500;
				return res.json({
					error: "Invalid request."
				});
			}
		});
	} else {
		res.statusCode = 400;
		return res.json({
			error: "Invalid coordinates."
		});
	}
}


/**
 * API Call - Shows the web usage trends for a particular area.
 *
 * @param {String} duration
 * @param {Double} latitude
 * @param {Double} Longitude
 * @return {HTTPRESPONSE} response.
 * @api public
 */
exports.webNearby = function (req, res) {

	var lat = parseFloat(req.param('lat'));
	var lng = parseFloat(req.param('lng'));
	var limit = config.max_trends_result;
	if (req.param('limit')) {
		if (parseInt(req.param('limit')) > 0) limit = parseInt(req.param('limit'));
	}
	var timeperiod = parseInt(req.param('duration'));
	if (!(90 > lng && lng < -90) || !(180 > lat && lat < -180) || timeperiod < 1) {
		webCollection.webTrendsInArea(req.param('duration'), lat, lng, function (error_info, result) {
			if (result) {

				result.sort(function (a, b) {
					return parseInt(b.value) - parseInt(a.value)
				});
				if (result.length > limit) result = result.slice(0, limit);
			}
			if (!error_info) {
				webController.associateURLRequests(result, function (data) {
					res.json(data);
				});
			} else {
				res.statusCode = 500;
				return res.json({
					error: "Invalid request."
				});
			}
		});
	} else {
		res.statusCode = 400;
		return res.json({
			error: "Invalid coordinates."
		});
	}
}


/**
 * API Call - Shows the web usage trends for a particular hour of time.
 *
 * @param {String} duration
 * @param {Double} timespan
 * @param {Double} start_time
 * @return {HTTPRESPONSE} response.
 * @api public
 */
exports.webDuringHours = function (req, res) {


	var minutes = parseInt(req.param('timespan'));
	var dayminute = parseInt(req.param('start_time'));

	var limit = config.max_trends_result;

	if (req.param('limit')) {
		if (parseInt(req.param('limit')) > 0) limit = parseInt(req.param('limit'));
	}

	var timeperiod = parseInt(req.param('duration'));

	if (!(minutes < 0 || dayminute < 0 || timeperiod < 1)) {
		webCollection.webTrendsDuringHours(req.param('duration'), minutes, dayminute, function (error_info, result) {
			if (result) {

				result.sort(function (a, b) {
					return parseInt(b.value) - parseInt(a.value)
				});
				if (result.length > limit) result = result.slice(0, limit);
			}
			if (!error_info) {
				webController.associateURLRequests(result, function (data) {
					res.json(data);
				});
			} else {
				res.statusCode = 500;
				return res.json({
					error: "Invalid request."
				});
			}
		});
	} else {
		res.statusCode = 400;
		return res.json({
			error: "Invalid coordinates."
		});
	}
}

/**
 * API Call - Shows the web usage trends for a particular hour of time at a particular location.
 *
 * @param {String} duration
 * @param {Double} timespan
 * @param {Double} start_time
 * @param {Double} latitude
 * @param {Double} Longitude
 * @return {HTTPRESPONSE} response.
 * @api public
 */
exports.webDuringHoursAtLocation = function (req, res) {

	var minutes = parseFloat(req.param('timespan'));
	var dayminute = parseInt(req.param('start_time'));

	var lat = parseFloat(req.param('lat'));
	var lng = parseFloat(req.param('lng'));

	var limit = config.max_trends_result;

	if (req.param('limit')) {
		if (parseInt(req.param('limit')) > 0) limit = parseInt(req.param('limit'));
	}

	var timeperiod = parseInt(req.param('duration'));

	if (!(90 > lng && lng < -90) || !(180 > lat && lat < -180) || minutes < 0 || dayminute < 0 || timeperiod < 1) {
		webCollection.webTrendsDuringHoursInArea(req.param('duration'), dayminute, minutes, lat, lng, function (error_info, result) {
			if (result) {

				result.sort(function (a, b) {
					return parseInt(b.value) - parseInt(a.value)
				});
				if (result.length > limit) result = result.slice(0, limit);
			}
			if (!error_info) {
				webController.associateURLRequests(result, function (data) {
					res.json(data);
				});
			} else {
				res.statusCode = 500;
				return res.json({
					error: "Invalid request."
				});
			}
		});
	} else {
		res.statusCode = 400;
		return res.json({
			error: "Invalid coordinates."
		});
	}
}
