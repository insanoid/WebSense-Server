var config = require('../local.config');
var validator = require('validator');
var user = require('./UserController');
var AppUsageHandler = require('../model/AppUsageHandler').AppUsageHandler;
var appCollection = new AppUsageHandler(config.mongo.host, config.mongo.port);
var request = require('request');
var cheerio = require('cheerio');
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
	console.log("[PUSH]: %s", data.auth_token);
	if (!data.app_info) {
		res.json({
			app_info: data.app_info
		});
	} else {
		user.validateSession(data.auth_token, function(user, error) {
			if (user) {
				var now = new Date();
				console.log("[%s] - [%s]:   %j", now.toString(), user.username, data.app_info);
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
	appCollection.appTrends(function(error_info, result) {
		console.log(result);
		if (!error_info) {
			res.json({
				success: true,
				result: result
			});
		} else {
			res.statusCode = 500;
			return res.json({
				error: "Invalid request."
			});
		}
	});
/*
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
*/
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
exports.getAppInfo = function(req, res) {
	url = 'https://play.google.com/store/apps/details?id=' + req.param('appId') + '&&hl=en';
	console.log('URL %s', url);
	var json = {
		app_name: "",
		package_name: req.param('appId'),
		icon: "",
		category: "",
		price: "",
		developer_name: "",
		rating: null,
		installs: ""
	};
	request(url, function(error, response, html) {
		if (!error) {
			var $ = cheerio.load(html);
			var title, release, rating;
			$('.cover-image').filter(function() {
				var data = $(this);
				if (!json.icon) json.icon = data.attr('src');
			})
			$('.document-subtitle').filter(function() {
				var data = $(this);
				json.category = data.children('span').text();
			})
			$('.content[itemprop="numDownloads"]').filter(function() {
				var data = $(this).filter(function(i, el) {
					// this === el
					return $(this).attr('itemprop') === 'numDownloads';
				});
				json.installs = data.text().trim();
			})
			$('meta[itemprop="price"]').filter(function() {
				var data = $(this).filter(function(i, el) {
					// this === el
					return $(this).attr('itemprop') === 'price';
				});
				json.price = data.attr('content');
			})
			$('.current-rating').filter(function() {
				var data = $(this);
				if (!json.rating) json.rating = Number(data.attr('style').replace(/[^0-9\.]+/g, ""));
			})
			$('.document-title[itemprop="name"]').filter(function() {
				var data = $(this);
				json.app_name = data.text().trim();
			})
			$('span[itemprop="name"]').filter(function() {
				var data = $(this);
				json.developer_name = data.text().trim();
			})
		}
		res.json(json);
	})
}