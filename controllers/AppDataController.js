var config = require('../local.config');
var validator = require('validator');
var user = require('./UserController');
var webData = require('./WebDataController');
var request = require('request');
var cheerio = require('cheerio');
var geohash = require('ngeohash');

var AppUsageHandler = require('../model/AppUsageHandler').AppUsageHandler;
var AppInfoHandler = require('../model/AppUsageHandler').AppInfoHandler;
var appCollection = null;
var appInfoCollection = null;
/**
 * Initialize the db connection.
 *
 * @param {DBConnection} already connected db connection.
 * @api public
 */
exports.initDBConnection = function(_dbConn) {
	appCollection = new AppUsageHandler(_dbConn);
	appInfoCollection = new AppInfoHandler(_dbConn);
}
/**
 * API Call - pushes app usage data.
 *
 * @param {String} Auth_token
 * @param {Double} app_info
 * @return {HTTPRESPONSE} response.
 * @api public
 */
exports.pushAppInfo = function(req, res) {
	var data = req.body;
	console.log("[PUSH]: %s", data.auth_token);
	if (!data.app_info) {
		res.json({
			success: false
		});
	} else {
		tokenValidator(data.auth_token, function(valid, userObj) {
			if (valid == true) {
				var now = new Date();
				console.log("[%s] - [%s]:   %j", now.toString(), userObj.username, data.app_info);
				for (n in data.app_info) {
					data.app_info[n].position = JSON.parse("[" + data.app_info[n].position + "]");
					data.app_info[n].user_id = userObj._id;
					data.app_info[n].associated_url = cleanURLString(data.app_info[n].associated_url);
				}
				appCollection.addAppRecord(data.app_info, function(error_info, result) {
					if (!error_info) {
						//Add to app datbase.
						var appNames = [];
						var newURLs = [];
						for (var n in data.app_info) {
							if (config.ignore_packages.indexOf(data.app_info[n].package_name) == -1) appNames.push(data.app_info[n].package_name);
							if (webData.ValidURL(data.app_info[n].associated_url) == true) {
								newURLs.push(data.app_info[n].associated_url);
							}
						}
						if (newURLs.length) webData.updateWebSiteInformationCollection(arrayUnique(newURLs));
						if (appNames.length) updateAppInformationCollection(arrayUnique(appNames));
						//Response send async
						res.json({
							success: true
						});
					} else {
						console.log("-- %s", error_info);
						res.statusCode = 501;
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
	tokenValidator(req.param('auth_token'), function(valid) {
		if (valid == true) {
			if (!req.param) {
				res.statusCode = 400;
				res.json({
					"error": "requires a time parameter."
				});
			} else {
				var timeperiod = parseInt(req.param('duration'));
				var limit = config.max_trends_result;
				if (req.param('limit')) {
					if (parseInt(req.param('limit')) > 0) limit = parseInt(req.param('limit'));
				}
				if (timeperiod > 1) {
					appCollection.appTrends(req.param('duration'), function(error_info, result) {
						if (result) {
							
							result.sort(function(a, b) {
								return parseInt(b.value) - parseInt(a.value)
							});
							if (result.length > limit) result = result.slice(0, limit);
						}
						if (!error_info) {
							associateValues(result, function(data) {
								res.json(data);
							});
						} else {
						console.log("---->"+error_info);
							res.statusCode = 500;
							return res.json({
								error: "Invalid request.",
								error:""
							});
						}
					});
				} else {
					res.statusCode = 400;
					res.json({
						"error": "requires a valid time parameter."
					});
				}
			}
		} else {
		console.log("---->"+req.param('auth_token'));
			res.statusCode = 500;
			return res.json({
				error: "Invalid auth_token."
			});
		}
	});
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
	tokenValidator(req.param('auth_token'), function(valid) {
		if (valid == true) {
			var lat = parseFloat(req.param('lat'));
			var lng = parseFloat(req.param('lng'));
			var limit = config.max_trends_result;
			if (req.param('limit')) {
				if (parseInt(req.param('limit')) > 0) limit = parseInt(req.param('limit'));
			}
			var timeperiod = parseInt(req.param('duration'));
			if (!(90 > lng && lng < -90) || !(180 > lat && lat < -180) || timeperiod < 1) {
				appCollection.appTrendsInArea(req.param('duration'), lat, lng, function(error_info, result) {
					if (result) {
						
						result.sort(function(a, b) {
							return parseInt(b.value) - parseInt(a.value)
						});
						if (result.length > limit) result = result.slice(0, limit);
					}
					if (!error_info) {
						associateValues(result, function(data) {
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
		} else {
			res.statusCode = 500;
			return res.json({
				error: "Invalid auth_token."
			});
		}
	});
}

/**
 * API Call - fetches user record count for an user.
 *
 * @param {String} email_address
 * @param {long} start_duration
 * @param {end} end_duration
 * @return {HTTPRESPONSE} response.
 * @api public
 */
exports.getUserAnalytics = function(req, res) {

		getUserForEmail(req.param('email'), function(valid, userObj) {
			if (valid == true) {
				appCollection.findAllReleventRecordsForUser(userObj._id,req.param('startTime'), req.param('endTime'), function(error_info, result) {
					if (!error_info) {
						
						
						res.json({
							user: userObj.username,
							record_count: result.length
						});
					} else {
						console.log("-- %s", error_info);
						res.statusCode = 501;
						return res.json({
							error: "Invalid request."
						});
					}
				});
			} else {
				res.statusCode = 500;
				return res.json({
					error: "Invalid email id."
				});
			}
		});
}

/**
 * API Call - fetches user recordlisting for an user.
 *
 * @param {String} email_address
 * @param {long} start_duration
 * @param {end} end_duration
 * @return {HTTPRESPONSE} response.
 * @api public
 */
exports.getUserAppUsageData = function(req, res) {

		getUserForEmail(req.param('email'), function(valid, userObj) {
			if (valid == true) {
				appCollection.findAllReleventRecordsForUser(userObj._id,req.param('startTime'), req.param('endTime'), function(error_info, result) {
					if (!error_info) {
						
						
						res.json(result);
					} else {
						console.log("-- %s", error_info);
						res.statusCode = 501;
						return res.json({
							error: "Invalid request."
						});
					}
				});
			} else {
				res.statusCode = 500;
				return res.json({
					error: "Invalid email id."
				});
			}
		});
}

/**
 * API Call - processes user's data and analyses geo spatial clusters.
 *
 * @param {String} email_address
 * @param {long} start_duration
 * @param {end} end_duration
 * @return {HTTPRESPONSE} response.
 * @api public
 */
exports.getUserGeoCluster = function(req, res) {

		getUserForEmail(req.param('email'), function(valid, userObj) {
			if (valid == true) {
				appCollection.findClusteredLocationForUser(userObj._id,req.param('startTime'), req.param('endTime'), function(error_info, result) {
					if (!error_info) {
						
					
						result.sort(function(a, b) {
							return parseInt(b.value) - parseInt(a.value)
						});
						if (result.length > 3) result = result.slice(0, 3);
						
						for(i in result){
						console.log("-->"+result[i]._id);
							var loc =  geohash.decode(result[i]._id);
							result[i].position = [loc.latitude, loc.longitude];
						}

						res.json(result);
					} else {
						
						res.statusCode = 501;
						return res.json({
							error: "Invalid request."
						});
					}
				});
			} else {
				res.statusCode = 500;
				return res.json({
					error: "Invalid email id."
				});
			}
		});
}


/**
 * API Call - fetches analyltics data for all users.
 *
 * @param {long} start_duration
 * @param {end} end_duration
 * @return {HTTPRESPONSE} response.
 * @api public
 */
exports.getUsageAnalytics = function(req, res) {

				appCollection.findAllReleventRecordsForAll(req.param('startTime'), req.param('endTime'), function(error_info, result) {
					if (!error_info) {
						
						
						res.json({
						
							usage_data: result
						});
					} else {
						console.log("-- %s", error_info);
						res.statusCode = 501;
						return res.json({
							error: "Invalid request."
						});
					}
				});
}

/**
 * Get application information for the ID.
 *
 * @param {String}package name of the application
 * @api public
 */
exports.getAppInfo = function(req, res) {
	findAndUpdateAppInfo(req.param('appId'), function(data) {
		res.json({
			info: data
		});
	});
}
/**
 * Updates the db with the latest information.
 *
 * @param {Array} application array.
 * @api private
 */

function updateAppInformationCollection(appArray) {
	appInfoCollection.AppInformation(function(error_info, result) {
		var refinedList = [];
		for (var n in result) {
			refinedList.push(result[n].package_name);
		}
		var newApps = [];
		for (var index in appArray) {
			if (refinedList.indexOf(appArray[index]) == -1) {
				newApps.push(appArray[index]);
			}
		}
		console.log("NEW %j", newApps);
		if (newApps.length > 0) {
			for (var i in newApps) {
				findAndUpdateAppInfo(newApps[i], function(data) {
					//cache update.
				});
			}
		}
	});
}
/**
 * Scrapes google play store for more information..
 *
 * @param {Array} application array.
 * @api private
 */

function findAndUpdateAppInfo(appPackageName, callback) {
	url = 'https://play.google.com/store/apps/details?id=' + appPackageName + '&&hl=en';
	var json = {
		app_name: "",
		package_name: appPackageName,
		icon: null,
		category: "",
		price: "",
		developer_name: "",
		rating: null,
		installs: ""
	};
	request(url, function(error, response, html) {
		if (!error) {
			var $ = cheerio.load(html);
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
			if (json.icon) {
				callback(json);
				appInfoCollection.appStoreInfo(json, function(error_info, result) {
					callback(json);
				});
			} else {
				if (response.statusCode != 404) {
					callback(null);
				} else {
					callback(json);
				}
			}
		} else {
			callback(null);
		}
	});
}
/**
 * Helper function to remove duplocates from the array.
 *
 * @param {Array} application array.
 * @api private
 */

function arrayUnique(a) {
	return a.reduce(function(p, c) {
		if (p.indexOf(c) < 0) p.push(c);
		return p;
	}, []);
}
/**
 * helper function to associate the values of app trends and app information.
 *
 * @param {Array} application array.
 * @api private
 */

exports.associateValues = function(appList, callback) {
	var appPackageName = [];
	for (var n in appList) {
		appPackageName.push(appList[n]._id);
	}
	var response = [];
	appInfoCollection.AppInformationFor(appPackageName, function(error_info, result) {
		for (var trendIndex in appList) {
			appList[trendIndex].package_name = appList[trendIndex]._id;
			delete appList[trendIndex]['_id'];
			for (var resultIndex in result) {
				if (appList[trendIndex].package_name == result[resultIndex].package_name) {
					appList[trendIndex].app_name = result[resultIndex].app_name;
					appList[trendIndex].category = result[resultIndex].category;
					appList[trendIndex].app_icon = result[resultIndex].icon;
				}
			}
		}
		callback(appList);
	});
}

function associateValues(appList, callback) {
	var appPackageName = [];
	for (var n in appList) {
		appPackageName.push(appList[n]._id);
	}
	var response = [];
	appInfoCollection.AppInformationFor(appPackageName, function(error_info, result) {
		for (var trendIndex in appList) {
			appList[trendIndex].package_name = appList[trendIndex]._id;
			delete appList[trendIndex]['_id'];
			for (var resultIndex in result) {
				if (appList[trendIndex].package_name == result[resultIndex].package_name) {
					appList[trendIndex].app_name = result[resultIndex].app_name;
					appList[trendIndex].category = result[resultIndex].category;
					appList[trendIndex].app_icon = result[resultIndex].icon;
				}
			}
		}
		callback(appList);
	});
}


/**
 * Cleans the URL by removing trailing splaces, backslashes and hash.
 *
 * @param {String} URL.
 * @api private
 */

function cleanURLString(str) {
	str = str.trim();
	if (str.substr(-1) == '/' || str.substr(-1) == '#') {
		return str.substr(0, str.length - 1);
	}
	return str;
}
/**
 * handles token validation.
 *
 * @param {String} token.
 * @return {Boolean} if valid user or not
 * @api private
 */

function tokenValidator(token, callback) {
	if (token) {
		user.validateSession(token, function(user, error) {
			console.log('user: %j', user);
			if (user) {
				callback(true, user);
			} else {
				callback(false, null);
			}
		});
	} else {
		callback(false, null);
	}
}

/**
 * Fetches user the email ID.
 *
 * @param {String} email address.
 * @return {Object} user record
 * @api private
 */

function getUserForEmail(email, callback) {
console.log('user: %j', email);
	if (email) {
	
		user.findUser(email, function(user, error) {
			console.log('user Found: %j', user);
			if (user) {
				callback(true, user);
			} else {
				callback(false, null);
			}
		});
	} else {
		callback(false, null);
	}
}
