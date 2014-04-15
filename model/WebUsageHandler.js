/*
 * Handles the database requirements for the web usage.
 */
var Db = require('mongodb').Db;
var Connection = require('mongodb').Connection;
var Server = require('mongodb').Server;
var BSON = require('mongodb').BSON;
var ObjectID = require('mongodb').ObjectID;
var config = require('../local.config');
/**
 * Creates an access point
 *
 * @param {DBConnection} Database connection
 * @return {Object} handler object.
 * @api public
 */
WebUsageHandler = function(_dbConn) {
	this.db = _dbConn;
};
/**
 * Creates an access point for storing website information.
 *
 * @param {DBConnection} Database connection
 * @return {Object} handler object.
 * @api public
 */
WebStorageHandler = function(_dbConn) {
	this.db = _dbConn;
};
/**
 * Creates a collection object for the web usage.
 *
 * @param {function} callback function
 * @return {Collection} the entire collection for the object.
 * @api public
 */
WebUsageHandler.prototype.getCollection = function(callback) {
	this.db.collection(config.mongo.collection.app_usage, function(error, collection) {
		if (error) callback(error);
		else callback(null, collection);
	});
};
/**
 * Creates a collection object for the website's scrapped data.
 *
 * @param {function} callback function
 * @return {Collection} the entire collection for the object.
 * @api public
 */
WebStorageHandler.prototype.getCollection = function(callback) {
	this.db.collection(config.mongo.collection.web_info, function(error, collection) {
		if (error) callback(error);
		else callback(null, collection);
	});
};
/**
 * fetches a collection of web usage.
 *
 * @param {function} callback function
 * @return {Collection} the entire collection for app usage.
 * @api public
 */
WebUsageHandler.prototype.findAll = function(callback) {
	this.getCollection(function(error, collection) {
		if (error) callback(error)
		else {
			collection.find({
				"associated_url": {
					$exists: true,
					$ne: "-"
				}
			}, {
				"associated_url": 1,
				_id: 0
			}).toArray(function(error, results) {
				if (error) callback(error)
				else callback(null, results)
			});
		}
	});
};
/**
 * Fetches trends in website usage usage.

 * @param {double} UTC timestamp of the time-period's start
 * @param {function} callback function
 * @api public
 */
WebUsageHandler.prototype.webTrends = function(duration, callback) {
	var packagesToIgnore = config.ignore_packages;
	this.getCollection(function(error, collection) {
		if (error) callback(error)
		else {
			var map = function() {
					emit(this.associated_url, 1)
				};
			var reduce = function(key, values) {
					return Array.sum(values);
				};
			collection.mapReduce(map, reduce, {
				out: {
					inline: 1
				},
				query: {
					"associated_url": {
						$exists: true,
						$ne: "-"
					},
					start_time: {
						$gt: duration
					}
				}
			}, function(error, result) {
				if (error) callback(error)
				else callback(null, result)
			});
		}
	});
};
/**
 * Fetches trends in app usage in a particular area.
 *
 * @param {latitude} latitude
 * @param {longitude} longitude
 * @param {double} UTC timestamp of the time-period's start
 * @param {function} callback function
 * @api public
 */
WebUsageHandler.prototype.webTrendsInArea = function(duration, _latitude, _longitude, callback) {
	var packagesToIgnore = config.ignore_packages;
	this.getCollection(function(error, collection) {
		if (error) callback(error)
		else {
			var map = function() {
					emit(this.associated_url, 1)
				};
			var reduce = function(key, values) {
					return Array.sum(values);
				};
			collection.mapReduce(map, reduce, {
				out: {
					inline: 1
				},
				query: {
					"associated_url": {
						$exists: true,
						$ne: "-"
					},
					start_time: {
						$gt: duration
					},
					position: {
						$geoWithin: {
							$centerSphere: [
								[_latitude, _longitude], config.max_trends_result / 3959]
						}
					}
				}
			}, function(error, result) {
				console.log('- %s', error);
				if (error) callback(error)
				else callback(null, result)
			});
		}
	});
};
/**
 * stores information about wevsite
 8 @param {JSON} web information object
 * @param {function} callback function
 * @api public
 */
WebStorageHandler.prototype.pushWebStoreInformation = function(webInfo, callback) {
	this.getCollection(function(error, collection) {
		if (error) callback(error)
		else {
			collection.insert(webInfo, function(error, results) {
				if (error) callback(error)
				else callback(null, results)
			});
		}
	});
};
/**
 * Fetches info about the websites dumped in the database (for the given set).
 *
 * @param {Array} List of urls
 * @param {function} callback function
 * @api public
 */
WebStorageHandler.prototype.fetchInformationForURLs = function(urlList, callback) {
	this.getCollection(function(error, collection) {
		if (error) callback(error)
		else {
			collection.find({
				url: {
					$in: urlList,
					$exists: true
				}
			}).toArray(function(error, results) {
				if (error) callback(error)
				else callback(null, results)
			});
		}
	});
};
/**
 * Fetches list of all the URLs.
 *
 * @param {function} callback function
 * @api public
 */
WebStorageHandler.prototype.fetchStoredURLsList = function(callback) {
	this.getCollection(function(error, collection) {
		if (error) callback(error)
		else {
			collection.find({}, {
				url: 1,
				_id: 0
			}).toArray(function(error, results) {
				if (error) callback(error)
				else callback(null, results)
			});
		}
	});
};
exports.WebUsageHandler = WebUsageHandler;
exports.WebStorageHandler = WebStorageHandler;