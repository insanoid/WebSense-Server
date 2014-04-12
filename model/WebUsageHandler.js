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
 * Creates an access point
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
	this.db.collection(config.mongo.collection.app_usage, function(error, usercollection) {
		if (error) callback(error);
		else callback(null, usercollection);
	});
};


/**
 * Creates a collection object for the web scraped.
 *
 * @param {function} callback function
 * @return {Collection} the entire collection for the object.
 * @api public
 */
WebStorageHandler.prototype.getCollection = function(callback) {
	this.db.collection(config.mongo.collection.web_info, function(error, usercollection) {
		if (error) callback(error);
		else callback(null, usercollection);
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
	this.getCollection(function(error, usercollection) {
		if (error) callback(error)
		else {
			usercollection.find({ "associated_url": {$exists: true, $ne: "-"}},{"associated_url":1,_id:0}).toArray(function(error, results) {
				if (error) callback(error)
				else callback(null, results)
			});
		}
	});
};


/**
 * Fetches trends in app usage.
 *
 * @param {AppObject/Array} _appInfo
 * @param {function} callback function
 * @api public
 */
WebUsageHandler.prototype.webTrends = function(callback) {

	var packagesToIgnore = config.ignore_packages;
	this.getCollection(function(error, appcollection) {
		if (error) callback(error)
		else {
			var map = function() {
					emit(this.associated_url, 1)
				};
			var reduce = function(key, values) {
				return Array.sum(values);
				};
			appcollection.mapReduce(map, reduce, {
				out: {
					inline: 1
				},
				query:{ "associated_url": {$exists: true, $ne: "-"}}
			}, function(error, result) {
				console.log('- %s', error);
				if (error) callback(error)
				else callback(null, result)
			});
		}
	});
};


/**
 * Fetches info about the apps (for the given set).
 *
 * @param {Array} List of apps
 * @param {function} callback function
 * @api public
 */
WebStorageHandler.prototype.scrapedInforFor = function(urlList, callback) {

	this.getCollection(function(error, appcollection) {
		if (error) callback(error)
		else {
			appcollection.find({associated_url:{$in:urlList}}).toArray(function(error, results) {
				if (error) callback(error)
				else callback(null, results)
			});
		}
	});
};



/**
 * Push info about the apps.
 *
 * @param {function} callback function
 * @api public
 */
WebStorageHandler.prototype.webStoreInfo = function(WebInfo, callback) {

	this.getCollection(function(error, appcollection) {
		if (error) callback(error)
		else {
			appcollection.insert(appInfo, function(error, results) {
				if (error) callback(error)
				else callback(null, results)
			});
		}
	});
};




exports.WebUsageHandler = WebUsageHandler;