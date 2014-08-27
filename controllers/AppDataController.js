var config = require('../local.config');
var validator = require('validator');
var user = require('./UserController');
var webData = require('./WebDataController');
var request = require('request');
var cheerio = require('cheerio');
var geohash = require('ngeohash');

var AppUsageHandler = require('../model/AppUsageHandler').AppUsageHandler;
var AppInfoHandler = require('../model/AppUsageHandler').AppInfoHandler;
var GeoTagHandler = require('../model/AppUsageHandler').GeoTagHandler;

var appCollection = null;
var appInfoCollection = null;
var geoCollection = null;

if (typeof (Number.prototype.toRad) === "undefined") {
	Number.prototype.toRad = function () {
		return this * Math.PI / 180;
	}
}

function getDistance(start, end) {
	var earthRadius = 6371; // km
	lat1 = parseFloat(start[0]);
	lat2 = parseFloat(end[0]);
	lon1 = parseFloat(start[1]);
	lon2 = parseFloat(end[1]);

	var dLat = (lat2 - lat1).toRad();
	var dLon = (lon2 - lon1).toRad();
	var lat1 = lat1.toRad();
	var lat2 = lat2.toRad();

	var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	var d = earthRadius * c;
	return d;
};


/**
 * Initialize the db connection.
 *
 * @param {DBConnection} already connected db connection.
 * @api public
 */
exports.initDBConnection = function (_dbConn) {
	appCollection = new AppUsageHandler(_dbConn);
	appInfoCollection = new AppInfoHandler(_dbConn);
	geoCollection = new GeoTagHandler(_dbConn);
}

/**
 * API Call - pushes app usage data.
 *
 * @param {String} Auth_token
 * @param {Double} app_info
 * @return {HTTPRESPONSE} response.
 * @api public
 */
exports.pushAppInfo = function (req, res) {
	var data = req.body;
	console.log("[PUSH]: %s", data.auth_token);
	if (!data.app_info) {
		res.json({
			success: false
		});
	} else {
		tokenValidator(data.auth_token, function (valid, userObj) {
			if (valid == true) {

				var now = new Date();
				console.log("[%s] - [%s]:   %j", now.toString(), userObj.username, data.app_info);

				for (n in data.app_info) {

					data.app_info[n].position = JSON.parse("[" + data.app_info[n].position + "]");
					data.app_info[n].user_id = userObj._id;
					data.app_info[n].associated_url = cleanURLString(data.app_info[n].associated_url);

					var coordinate = data.app_info[n].position;
					var lat = coordinate[0];
					var lng = coordinate[1];

					if (lat != 0 || lng != 0) {

						var hash = geohash.encode(lat, lng);
						data.app_info[n].geohash = hash;
						data.app_info[n].geohashZ1 = hash.substring(0, hash.length - 1);
						data.app_info[n].geohashZ2 = hash.substring(0, hash.length - 2);
						data.app_info[n].geohashZ3 = hash.substring(0, hash.length - 3);
						data.app_info[n].geohashZ4 = hash.substring(0, hash.length - 4);
						data.app_info[n].geohashZ5 = hash.substring(0, hash.length - 5);
					}

				}

				appCollection.addAppRecord(data.app_info, function (error_info, result) {
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
exports.trends = function (req, res) {
	tokenValidator(req.param('auth_token'), function (valid) {
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
					appCollection.appTrends(req.param('duration'), function (error_info, result) {
						if (result) {

							result.sort(function (a, b) {
								return parseInt(b.value) - parseInt(a.value)
							});
							if (result.length > limit) result = result.slice(0, limit);
						}
						if (!error_info) {
							associateValues(result, function (data) {
								res.json(data);
							});
						} else {
							console.log("---->" + error_info);
							res.statusCode = 500;
							return res.json({
								error: "Invalid request.",
								error: ""
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
			console.log("---->" + req.param('auth_token'));
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
exports.nearby = function (req, res) {
	tokenValidator(req.param('auth_token'), function (valid) {
		if (valid == true) {
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
						associateValues(result, function (data) {
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
exports.getUserAnalytics = function (req, res) {

	getUserForEmail(req.param('email'), function (valid, userObj) {
		if (valid == true) {
			appCollection.findAllReleventRecordsForUser(userObj._id, req.param('startTime'), req.param('endTime'), function (error_info, result) {
				if (!error_info) {


					res.json({
						user: userObj.username,
						record_count: result.length
					});
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
 * API Call - fetches user recordlisting for an user.
 *
 * @param {String} email_address
 * @param {long} start_duration
 * @param {end} end_duration
 * @return {HTTPRESPONSE} response.
 * @api public
 */
exports.getUserAppUsageData = function (req, res) {

	getUserForEmail(req.param('email'), function (valid, userObj) {
		if (valid == true) {
			appCollection.findAllReleventRecordsForUser(userObj._id, req.param('startTime'), req.param('endTime'), function (error_info, result) {
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
exports.getUserGeoCluster = function (req, res) {

	getUserForEmail(req.param('email'), function (valid, userObj) {
		if (valid == true) {
			appCollection.findClusteredLocationForUser(userObj._id, req.param('startTime'), req.param('endTime'), 1, function (error_info, result) {
				if (!error_info) {


					result.sort(function (a, b) {
						return parseInt(b.value.count) - parseInt(a.value.count)
					});
					//if (result.length > 3) result = result.slice(0, 3);
					for (i in result) {

						var loc = geohash.decode(result[i]._id);
						result[i].position = [loc.latitude, loc.longitude];

					}

					for (var idx = 1; idx < result.length; idx++) {
						result[idx].distance = getDistance(result[idx].position, result[0].position);
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
 * API Call - processes user's data and analyses geo spatial clusters.
 *
 * @param {String} email_address
 * @param {long} start_duration
 * @param {end} end_duration
 * @return {HTTPRESPONSE} response.
 * @api public
 */
exports.getUserGeoClusterForTimeRange = function (req, res) {

	var minutes = parseFloat(req.param('timespan'));
	var dayminute = parseInt(req.param('start_time'));

	getUserForEmail(req.param('email'), function (valid, userObj) {
		if (valid == true) {
			appCollection.findClusteredLocationForUserDuringHours(userObj._id, req.param('startTime'), req.param('endTime'), dayminute, minutes, 1, function (error_info, result) {
				if (!error_info) {

					result.sort(function (a, b) {
						return parseInt(b.value.count) - parseInt(a.value.count)
					});
					//if (result.length > 3) result = result.slice(0, 3);
					for (i in result) {

						var loc = geohash.decode(result[i]._id);
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
 * API Call - processes user's data and analyses geo spatial clusters.
 *
 * @param {String} email_address
 * @param {long} start_duration
 * @param {end} end_duration
 * @return {HTTPRESPONSE} response.
 * @api public
 */
exports.updateAppTagsForUserInRange = function (req, res) {

	var userId = req.param('userId');
	var geohash = req.param('geohash');
	var tag = req.param('tag');

	appCollection.tagAppDataForUser(userId, geohash, tag, function (error_info, result) {
		if (!error_info) {

			res.statusCode = 200;
			return res.json({
				count: result
			});
		} else {

			res.statusCode = 501;
			return res.json({
				error: "Invalid request."
			});
		}
	});
}

/**
 * API Call - Handle data for WEKA.
 *
 * @param {String} email_address
 * @api public
 */
exports.getDataSetForTag = function (req, res) {

	var userId = req.param('userId');
	var tag = req.param('loc');

	appCollection.dataForUserLocTag(userId, tag, function (error_info, result) {
		if (!error_info) {

			basicAssociateInfo(result, function (data) {
				makeAFile(data.content, res, userId + "_" + tag, data.keys, data.package);
			});
		} else {

			res.statusCode = 501;
			return res.json({
				error: "Invalid request."
			});
		}
	});
}

/**
 * API Call - Handle data for WEKA. (All tags)
 * @api public
 */
exports.getDataSetForGenericTag = function (req, res) {

	appCollection.getAppDataForTaggedRecords(function (error_info, result) {
		if (!error_info) {

			basicGenericAssociateInfo(result, function (data) {
				makeAGenericFile(data.content, res, "GENERIC_FILE", data.keys, data.locationTag, data.package);
			});
		} else {

			res.statusCode = 501;
			return res.json({
				error: "Invalid request."
			});
		}
	});
}

/**
 * API Call - Get all possible spatial clusters.
 *
 * @param {String} email_address
 * @api public
 */
exports.getAllClusters = function (req, res) {

	var userId = req.param('userId');

	appCollection.findPossibleLocationClusters(function (error_info, result) {
		if (!error_info) {

			var newResult = [];
			for (idx in result) {
				if (result[idx].value.count > 10) {
					newResult.push(result[idx]);
				}
			}

			if (newResult.length > 10) result = result.slice(0, 10);
		/*	for (idx in result) {
				if (result[idx]._id != null) foursquareAPIHandler(result[idx]._id, null);
			}
*/
			res.statusCode = 200;
			return res.json(newResult);
		} else {

			res.statusCode = 501;
			return res.json({
				error: "Invalid request."
			});
		}
	});
}

/**
 * API Call - tag information.
 *
 * @param {String} email_address
 * @api public
 */
exports.updateClusterTags = function (req, res) {

	var userId = req.param('userId');

	geoCollection.findAll(function (error_info, result) {
		if (!error_info) {

			for (idx in result) {
				console.log("-> %s %s",result[idx].geohash,result[idx].category);
				appCollection.tagAppDataForAll(result[idx].geohash,result[idx].category, function (error_info, result) {
					
					
				});
			}

		} else {

			res.statusCode = 501;
			return res.json({
				error: "Invalid request."
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
exports.getUsageAnalytics = function (req, res) {

	appCollection.findAllReleventRecordsForAll(req.param('startTime'), req.param('endTime'), function (error_info, result) {
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
exports.getAppInfo = function (req, res) {
	findAndUpdateAppInfo(req.param('appId'), function (data) {
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
	appInfoCollection.AppInformation(function (error_info, result) {
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
				findAndUpdateAppInfo(newApps[i], function (data) {
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
	request(url, function (error, response, html) {
		if (!error) {
			var $ = cheerio.load(html);
			$('.cover-image').filter(function () {
				var data = $(this);
				if (!json.icon) json.icon = data.attr('src');
			})
			$('.document-subtitle').filter(function () {
				var data = $(this);
				json.category = data.children('span').text();
			})
			$('.content[itemprop="numDownloads"]').filter(function () {
				var data = $(this).filter(function (i, el) {
					// this === el
					return $(this).attr('itemprop') === 'numDownloads';
				});
				json.installs = data.text().trim();
			})
			$('meta[itemprop="price"]').filter(function () {
				var data = $(this).filter(function (i, el) {
					// this === el
					return $(this).attr('itemprop') === 'price';
				});
				json.price = data.attr('content');
			})
			$('.current-rating').filter(function () {
				var data = $(this);
				if (!json.rating) json.rating = Number(data.attr('style').replace(/[^0-9\.]+/g, ""));
			})
			$('.document-title[itemprop="name"]').filter(function () {
				var data = $(this);
				json.app_name = data.text().trim();
			})
			$('span[itemprop="name"]').filter(function () {
				var data = $(this);
				json.developer_name = data.text().trim();
			})
			if (json.icon) {
				callback(json);
				appInfoCollection.appStoreInfo(json, function (error_info, result) {
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
	return a.reduce(function (p, c) {
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

exports.associateValues = function (appList, callback) {
	var appPackageName = [];
	for (var n in appList) {
		appPackageName.push(appList[n]._id);
	}
	var response = [];
	appInfoCollection.AppInformationFor(appPackageName, function (error_info, result) {
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
	appInfoCollection.AppInformationFor(appPackageName, function (error_info, result) {
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

function basicAssociateInfo(appList, callback) {
	var appPackageName = [];
	var selectedCategories = {};
	var packageNames = {};

	for (var n in appList) {

		delete appList[n].position;
		delete appList[n].associated_url;
		delete appList[n].synced;
		delete appList[n].record_id;
		delete appList[n].geohash;
		delete appList[n].geohashZ;
		delete appList[n].geohashZ4;
		delete appList[n].geohashZ3;
		delete appList[n].geohashZ2;
		delete appList[n].geohashZ1;
		delete appList[n].geohashZ5;
		delete appList[n].start_time;
		delete appList[n].end_time;
		delete appList[n].user_id;
		delete appList[n].app_name;
		appList[n].loc_tag = appList[n].loc_tag[0];


		appPackageName.push(appList[n].package_name);
	}
	var response = [];
	appInfoCollection.AppInformationFor(appPackageName, function (error_info, result) {
		for (var trendIndex in appList) {

			delete appList[trendIndex]['_id'];
			for (var resultIndex in result) {

				if (appList[trendIndex].package_name == result[resultIndex].package_name) {
					appList[trendIndex].category = result[resultIndex].category;
					selectedCategories[result[resultIndex].category] = 1;
				}
				packageNames[result[resultIndex].package_name] = 1;
			}
		}
		for (var n in appList) {
			if (typeof appList[n].category == 'undefined') {
				appList[n].category = "AndroidSystem";
				packageNames[appList[n].package_name] = 1;
			}
		}
		var val = {};
		val.content = appList;
		val.keys = Object.keys(selectedCategories);
		val.package = Object.keys(packageNames);
		callback(val);
	});
}

function basicGenericAssociateInfo(appList, callback) {
	var appPackageName = [];
	var selectedCategories = {};
	var packageNames = {};
	var locationTags = {};
	
	for (var n in appList) {

		delete appList[n].position;
		delete appList[n].associated_url;
		delete appList[n].synced;
		delete appList[n].record_id;
		delete appList[n].geohash;
		delete appList[n].geohashZ;
		delete appList[n].geohashZ4;
		delete appList[n].geohashZ3;
		delete appList[n].geohashZ2;
		delete appList[n].geohashZ1;
		delete appList[n].geohashZ5;
		delete appList[n].start_time;
		delete appList[n].end_time;
		delete appList[n].user_id;
		delete appList[n].app_name;
		appList[n].generic_loc_tag = appList[n].generic_loc_tag[0];


		appPackageName.push(appList[n].package_name);
	}
	var response = [];
	appInfoCollection.AppInformationFor(appPackageName, function (error_info, result) {
		for (var trendIndex in appList) {

			delete appList[trendIndex]['_id'];
			for (var resultIndex in result) {

				if (appList[trendIndex].package_name == result[resultIndex].package_name) {
					appList[trendIndex].category = result[resultIndex].category;
					selectedCategories[result[resultIndex].category] = 1;
				}
			}
			packageNames[appList[trendIndex].package_name] = 1;
			locationTags[appList[trendIndex].generic_loc_tag] = 1;
		}
		for (var n in appList) {
			if (typeof appList[n].category == 'undefined') {
				appList[n].category = "AndroidSystem";
				packageNames[appList[n].package_name] = 1;
			}
		}
		var val = {};
		val.content = appList;
		val.keys = Object.keys(selectedCategories);
		val.package = Object.keys(packageNames);
		val.locationTag = Object.keys(locationTags);
		callback(val);
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
		user.validateSession(token, function (user, error) {
			console.log('user: %s', user);
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

		user.findUser(email, function (user, error) {

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
 * Handle Foursquare API tagging.
 * @api private
 */
function foursquareAPIHandler(geohashVal, callback) {

	var loc = geohash.decode(geohashVal);
	var str = sprintf("%f,%f", loc.latitude, loc.longitude)

	var foursquare = (require('foursquarevenues'))('BSJNYLLRYUPZIQNSD5XXOYZKK0UBGWWXFD31KEVHDGVHTQIU', 'XFOWWXQEKOHFMXVRSOBRACIA5OZUTZ5XMJZLKHZ1TXTPD4DI');

	var params = {
		"ll": str,
		"radius": 10,
		"limit": 1
	};

	foursquare.getVenues(params, function (error, venues) {

		if (!error) {
			try {

				console.log("%s {%s} - %s", geohashVal, venues.response.venues[0].name, venues.response.venues[0].categories[0].name);

				var venue = {};
				venue.geohash = geohashVal;
				venue.category = venues.response.venues[0].categories[0].name;
				venue.placeName = geohashVal, venues.response.venues[0].name;

				geoCollection.addGeoTagInfo(venue, function (error_info, result) {

					if (!error_info) {

					}
				});
			} catch (err) {
				console.log("%s", err.message);
			}
		}
	});

}

/**
 * Internal processes the data to convert it to WEKA.
 *
 * @param {String} data
 * @api private
 */

function makeAFile(data, res, uid, keys, PKGName) {

	res.setHeader('Content-disposition', 'attachment; filename=data_' + uid + ".arff");
	res.setHeader('Content-type', 'text/plain');
	res.charset = 'UTF-8';
	res.write("@relation APPUSAGE\n");
	res.write("@attribute activeTime numeric\n");
	res.write("@attribute packageName ");
	var contentPK = "{";
	for (idx in PKGName) {
		contentPK = contentPK + sprintf("'%s',", PKGName[idx]);
	}
	contentPK = contentPK + "'com.uob.websense'}";
	res.write(contentPK + "\n");

	res.write("@attribute startMinuteDay numeric\n");
	res.write("@attribute locationTag string\n");
	res.write("@attribute category ");

	var content = "{";
	for (idx in keys) {
		content = content + sprintf("'%s',", handleString(keys[idx]));
	}
	content = content + "'AndroidSystem'}";
	res.write(content + "\n");


	res.write("\n");
	res.write("@data\n");
	for (idx in data) {
		res.write(sprintf("%s,'%s',%s,%s,'%s'\n", data[idx].active_time, data[idx].package_name, data[idx].start_minute_day, data[idx].loc_tag, handleString(data[idx].category)));
	}
	res.end();

}

/**
 * Internal processes the data to convert it to WEKA.
 *
 * @param {String} data
 * @api private
 */

function makeAGenericFile(data, res, uid, keys, locationTag, PKGName) {

	res.setHeader('Content-disposition', 'attachment; filename=data_' + uid + ".arff");
	res.setHeader('Content-type', 'text/plain');
	res.charset = 'UTF-8';
	res.write("@relation APPUSAGE\n");
	res.write("@attribute activeTime numeric\n");
	res.write("@attribute packageName ");
	
	var contentPK = "{";
	for (idx in PKGName) {
		contentPK = contentPK + sprintf("'%s',", PKGName[idx]);
	}
	contentPK = contentPK + "'com.uob.websense'}";
	res.write(contentPK + "\n");

	res.write("@attribute startMinuteDay numeric\n");
	res.write("@attribute locationTag ");
	
	var contentLC = "{";
	for (idx in locationTag) {
		contentLC = contentLC + sprintf("'%s',", locationTag[idx].replace("'", ""));
	}
	contentLC = contentLC + "'extra'}";
	res.write(contentLC + "\n");


	res.write("@attribute category ");

	var content = "{";
	for (idx in keys) {
		content = content + sprintf("'%s',", handleString(keys[idx]));
	}
	content = content + "'AndroidSystem'}";
	res.write(content + "\n");


	res.write("\n");
	res.write("@data\n");
	for (idx in data) {
		res.write(sprintf("%s,'%s',%s,'%s','%s'\n", data[idx].active_time, data[idx].package_name, data[idx].start_minute_day, data[idx].generic_loc_tag.replace(
		"'", ""), handleString(data[idx].category)));
	}
	res.end();
}

function handleString(str) {
	return str.replace("&", "and")
}

function sprintf() {
	//  discuss at: http://phpjs.org/functions/sprintf/
	// original by: Ash Searle (http://hexmen.com/blog/)
	// improved by: Michael White (http://getsprink.com)
	// improved by: Jack
	// improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
	// improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
	// improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
	// improved by: Dj
	// improved by: Allidylls
	//    input by: Paulo Freitas
	//    input by: Brett Zamir (http://brett-zamir.me)
	//   example 1: sprintf("%01.2f", 123.1);
	//   returns 1: 123.10
	//   example 2: sprintf("[%10s]", 'monkey');
	//   returns 2: '[    monkey]'
	//   example 3: sprintf("[%'#10s]", 'monkey');
	//   returns 3: '[####monkey]'
	//   example 4: sprintf("%d", 123456789012345);
	//   returns 4: '123456789012345'
	//   example 5: sprintf('%-03s', 'E');
	//   returns 5: 'E00'
	var regex = /%%|%(\d+\$)?([-+\'#0 ]*)(\*\d+\$|\*|\d+)?(\.(\*\d+\$|\*|\d+))?([scboxXuideEfFgG])/g;
	var a = arguments;
	var i = 0;
	var format = a[i++];

	// pad()
	var pad = function (str, len, chr, leftJustify) {
			if (!chr) {
				chr = ' ';
			}
			var padding = (str.length >= len) ? '' : new Array(1 + len - str.length >>> 0).join(chr);
			return leftJustify ? str + padding : padding + str;
		};

	// justify()
	var justify = function (value, prefix, leftJustify, minWidth, zeroPad, customPadChar) {
			var diff = minWidth - value.length;
			if (diff > 0) {
				if (leftJustify || !zeroPad) {
					value = pad(value, minWidth, customPadChar, leftJustify);
				} else {
					value = value.slice(0, prefix.length) + pad('', diff, '0', true) + value.slice(prefix.length);
				}
			}
			return value;
		};

	// formatBaseX()
	var formatBaseX = function (value, base, prefix, leftJustify, minWidth, precision, zeroPad) {
			// Note: casts negative numbers to positive ones
			var number = value >>> 0;
			prefix = prefix && number && {
				'2': '0b',
				'8': '0',
				'16': '0x'
			}[base] || '';
			value = prefix + pad(number.toString(base), precision || 0, '0', false);
			return justify(value, prefix, leftJustify, minWidth, zeroPad);
		};

	// formatString()
	var formatString = function (value, leftJustify, minWidth, precision, zeroPad, customPadChar) {
			if (precision != null) {
				value = value.slice(0, precision);
			}
			return justify(value, '', leftJustify, minWidth, zeroPad, customPadChar);
		};

	// doFormat()
	var doFormat = function (substring, valueIndex, flags, minWidth, _, precision, type) {
			var number, prefix, method, textTransform, value;

			if (substring === '%%') {
				return '%';
			}

			// parse flags
			var leftJustify = false;
			var positivePrefix = '';
			var zeroPad = false;
			var prefixBaseX = false;
			var customPadChar = ' ';
			var flagsl = flags.length;
			for (var j = 0; flags && j < flagsl; j++) {
				switch (flags.charAt(j)) {
				case ' ':
					positivePrefix = ' ';
					break;
				case '+':
					positivePrefix = '+';
					break;
				case '-':
					leftJustify = true;
					break;
				case "'":
					customPadChar = flags.charAt(j + 1);
					break;
				case '0':
					zeroPad = true;
					customPadChar = '0';
					break;
				case '#':
					prefixBaseX = true;
					break;
				}
			}

			// parameters may be null, undefined, empty-string or real valued
			// we want to ignore null, undefined and empty-string values
			if (!minWidth) {
				minWidth = 0;
			} else if (minWidth === '*') {
				minWidth = +a[i++];
			} else if (minWidth.charAt(0) == '*') {
				minWidth = +a[minWidth.slice(1, -1)];
			} else {
				minWidth = +minWidth;
			}

			// Note: undocumented perl feature:
			if (minWidth < 0) {
				minWidth = -minWidth;
				leftJustify = true;
			}

			if (!isFinite(minWidth)) {
				throw new Error('sprintf: (minimum-)width must be finite');
			}

			if (!precision) {
				precision = 'fFeE'.indexOf(type) > -1 ? 6 : (type === 'd') ? 0 : undefined;
			} else if (precision === '*') {
				precision = +a[i++];
			} else if (precision.charAt(0) == '*') {
				precision = +a[precision.slice(1, -1)];
			} else {
				precision = +precision;
			}

			// grab value using valueIndex if required?
			value = valueIndex ? a[valueIndex.slice(0, -1)] : a[i++];

			switch (type) {
			case 's':
				return formatString(String(value), leftJustify, minWidth, precision, zeroPad, customPadChar);
			case 'c':
				return formatString(String.fromCharCode(+value), leftJustify, minWidth, precision, zeroPad);
			case 'b':
				return formatBaseX(value, 2, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
			case 'o':
				return formatBaseX(value, 8, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
			case 'x':
				return formatBaseX(value, 16, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
			case 'X':
				return formatBaseX(value, 16, prefixBaseX, leftJustify, minWidth, precision, zeroPad).toUpperCase();
			case 'u':
				return formatBaseX(value, 10, prefixBaseX, leftJustify, minWidth, precision, zeroPad);
			case 'i':
			case 'd':
				number = +value || 0;
				// Plain Math.round doesn't just truncate
				number = Math.round(number - number % 1);
				prefix = number < 0 ? '-' : positivePrefix;
				value = prefix + pad(String(Math.abs(number)), precision, '0', false);
				return justify(value, prefix, leftJustify, minWidth, zeroPad);
			case 'e':
			case 'E':
			case 'f':
				// Should handle locales (as per setlocale)
			case 'F':
			case 'g':
			case 'G':
				number = +value;
				prefix = number < 0 ? '-' : positivePrefix;
				method = ['toExponential', 'toFixed', 'toPrecision']['efg'.indexOf(type.toLowerCase())];
				textTransform = ['toString', 'toUpperCase']['eEfFgG'.indexOf(type) % 2];
				value = prefix + Math.abs(number)[method](precision);
				return justify(value, prefix, leftJustify, minWidth, zeroPad)[textTransform]();
			default:
				return substring;
			}
		};

	return format.replace(regex, doFormat);
}