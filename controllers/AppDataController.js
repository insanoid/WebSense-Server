var config = require('../local.config');
var validator = require('validator');
var user = require('./UserController');
var AppUsageHandler = require('../model/AppUsageHandler').AppUsageHandler;
var appCollection = new AppUsageHandler(config.mongo.host, config.mongo.port);
/**
 * API Call - Shows the app usage trends for the area.
 *
 * @param {String} duration
 * @param {Double} latitude
 * @param {Double} Longitude
 * @return {HTTPRESPONSE} response.
 * @api public
 */
exports.pushAppInfo = function(req, res) {
	var data = req.body;
	console.log("[PUSH]");
	if (!data.app_info) {
		res.json({
			success: "well not really true but go with it.",
			app_info: data.app_info
		});
	} else {
		user.validateSession(data.auth_token, function(user, error) {
			if (user) {
			var now = new Date();
					console.log("[%s] - [%s]:   %j",now.toString(), user.username, data.app_info);
				for (n in data.app_info) {
					data.app_info[n].user_id = user._id;
				}
				appCollection.addAppRecord(data.app_info, function(error_info, result) {
					if (!error_info) {
						res.json({
							success: true
						});
					} else {
						res.statusCode = 500;
						return res.json({
							error: "Invalid request."
						});
					}
				});
			} else {
				res.statusCode = 500;
				return res.json({
					error: "Invalid auth_token."
				});
			}
		});
	}
}
/**
 * API Call - Shows the app usage trends.
 *
 * @param {String} duration
 * @return {HTTPRESPONSE} response.
 * @api public
 */
exports.trends = function(req, res) {
	var duration = req.param('duration');
	var response = [{
		"app_name": "App 1",
		"package_name": "com.google.chrome",
		"category": "Browser",
		"app_icon": "http://54.186.15.10:3001/images/icon_app.png"
	}, {
		"app_name": "App 2",
		"package_name": "com.google.chrome3",
		"category": "Fun",
		"app_icon": "http://54.186.15.10:3001/images/icon_app.png"
	}, {
		"app_name": "App 3",
		"package_name": "com.google.chrome2",
		"category": "Productivity",
		"app_icon": "http://54.186.15.10:3001/images/icon_app.png"
	}];
	res.json(response);
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
exports.nearby = function(req, res) {
	var duration = req.param('duration');
	var response = [{
		"app_name": "App 1",
		"package_name": "com.google.chrome",
		"category": "Browser",
		"app_icon": "http://54.186.15.10:3001/images/icon_app.png"
	}, {
		"app_name": "App 2",
		"package_name": "com.google.chrome3",
		"category": "Fun",
		"app_icon": "http://54.186.15.10:3001/images/icon_app.png"
	}, {
		"app_name": "App 3",
		"package_name": "com.google.chrome2",
		"category": "Productivity",
		"app_icon": "http://54.186.15.10:3001/images/icon_app.png"
	}];
	res.json(response);
}