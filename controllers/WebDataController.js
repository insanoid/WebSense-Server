var config = require('../local.config');
var validator = require('validator');
var user = require('./UserController');
var request = require('request');
var cheerio = require('cheerio');
var uriparser = require('url');
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
exports.initDBConnection = function(_dbConn) {
	webCollection = new WebUsageHandler(_dbConn);
	webStorage = new WebStorageHandler(_dbConn);
}
/**
 * API Call - Shows the web usage trends.
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
					webCollection.webTrends(req.param('duration'), function(error_info, result) {
						if (result) {
							
							result.sort(function(a, b) {
								return parseInt(b.value) - parseInt(a.value)
							});
							if (result.length > limit) result = result.slice(0, limit);
						}
						if (!error_info) {
							associateURLRequests(result, function(data) {
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
					res.json({
						"error": "requires a valid time parameter."
					});
				}
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
 * API Call - Shows the web usage trends for a particular area.
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
				webCollection.webTrendsInArea(req.param('duration'), lat, lng, function(error_info, result) {
					if (result) {
					
						result.sort(function(a, b) {
							return parseInt(b.value) - parseInt(a.value)
						});
						if (result.length > limit) result = result.slice(0, limit);
					}
					if (!error_info) {
						associateURLRequests(result, function(data) {
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
 * Updates the db with the latest information.
 *
 * @param {Array} website url array.
 * @api private
 */
exports.updateWebSiteInformationCollection = function updateWebSiteInformationCollection(urlArray) {
	webStorage.fetchStoredURLsList(function(error_info, result) {
		var refinedList = [];
		for (var n in result) {
			refinedList.push(result[n].url);
		}
		var newURLs = [];
		for (var index in urlArray) {
			if (refinedList.indexOf(urlArray[index]) == -1) {
				newURLs.push(urlArray[index]);
			}
		}
		console.log("NEW %j", newURLs);
		if (newURLs.length > 0) {
			for (var i in newURLs) {
				findAndUpdateWebsiteInfo(newURLs[i], function(data) {
					//cache update.
				});
			}
		}
	});
}
/**
 * Associates the URL list to the pre-saved content in the db.
 *
 * @param {Array} website url array.
 * @api private
 */

exports.associateURLRequests = function(urlInfo, callback) {
	var urlList = [];
	for (var n in urlInfo) {
		urlList.push(urlInfo[n]._id);
	}
	webStorage.fetchInformationForURLs(urlList, function(error_info, result) {
		for (var i in urlInfo) {
			for (var trendIndex in urlInfo) {
				for (var resultIndex in result) {
					if (urlInfo[trendIndex]._id == result[resultIndex].url) {
						urlInfo[trendIndex].url = urlInfo[trendIndex]._id;
						urlInfo[trendIndex].title = result[resultIndex].title;
						urlInfo[trendIndex].content = result[resultIndex].content;
						urlInfo[trendIndex].content_image = result[resultIndex].content_image;
					}
				}
			}
		}
		callback(urlInfo);
	});
}

function associateURLRequests(urlInfo, callback) {
	var urlList = [];
	for (var n in urlInfo) {
		urlList.push(urlInfo[n]._id);
	}
	webStorage.fetchInformationForURLs(urlList, function(error_info, result) {
		for (var i in urlInfo) {
			for (var trendIndex in urlInfo) {
				for (var resultIndex in result) {
					if (urlInfo[trendIndex]._id == result[resultIndex].url) {
						urlInfo[trendIndex].url = urlInfo[trendIndex]._id;
						urlInfo[trendIndex].title = result[resultIndex].title;
						urlInfo[trendIndex].content = result[resultIndex].content;
						urlInfo[trendIndex].content_image = result[resultIndex].content_image;
					}
				}
			}
		}
		callback(urlInfo);
	});
}

/**
 * Scrapes the URL for more information.
 *
 * @param {Array} application array.
 * @api private
 */

function findAndUpdateWebsiteInfo(urlcur, callback) {
	var json = {
		url: urlcur,
		title: "",
		content: "",
		content_image: []
	};
	var host = uriparser.parse(urlcur).hostname;
	request(urlcur, function(error, response, html) {
		if (!error) {
			var $ = cheerio.load(html);
			$('title').filter(function() {
				var data = $(this);
				if (!json.title) json.title = data.text();
			})
			$('meta[name="description"]').filter(function() {
				var data = $(this);
				if (!json.content) json.content = data.attr('content');
			})
			$('img[src$=jpg],img[src$=png]').filter(function() {
				var data = $(this);
				var url = "";
				if (ValidURL(data.attr('src')) == true) {
					url = data.attr('src');
				} else {
					url = "http://" + host + data.attr('src');
				}
				url = replaceAll(' ', '%20', url);
				json.content_image.push(url);
			})
			if (json.title) {
				callback(json);
				webStorage.pushWebStoreInformation(json, function(error_info, result) {
					callback(json);
					console.log('---->' + result + " -> " + error_info);
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
 * URL validation.
 *
 * @param {String} url.
 * @return {Boolean} if valid url or not
 * @api private
 */

function ValidURL(s) {
	var regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
	return regexp.test(s);
}
/**
 * Replaces occurance of content with something else.
 *
 * @param {String} string to do the reapcement in.
 * @param {String} search text.
 * @param {String} replacement.
 * @return {string} processed string
 * @api private
 */

function replaceAll(find, replace, str) {
	return str.replace(new RegExp(find, 'g'), replace);
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
			if (user) {
				callback(true);
			} else {
				callback(false);
			}
		});
	} else {
		callback(false);
	}
}

exports.ValidURL = ValidURL;