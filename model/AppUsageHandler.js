/*
 * Handles the database requirements for the App Usage model.
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
 * @param {String} host
 * @param {String} port
 * @return {Object} handler object.
 * @api public
 */
AppUsageHandler = function(host, port) {
	this.db = new Db(config.mongo.app_usage, new Server(host, port, {
		auto_reconnect: true
	}, {}), {
		safe: true
	});
	this.db.open(function(err, data) {
		if (data) {
			if (config.mongo.username && config.mongo.password) {
				data.authenticate(config.mongo.username, config.mongo.password, function(errdb, datadb) {
					if (datadb) {
						console.log("Database connection opened.");
					} else {
						console.log("Error in connecting to database: " + errdb);
					}
				});
			} else {}
		} else {
			console.log(err);
		}
	});
};



/**
 * Creates an access point for handling generic app information.
 *
 * @param {String} host
 * @param {String} port
 * @return {Object} handler object.
 * @api public
 */
AppInfoHandler = function(host, port) {
	this.db = new Db(config.mongo.app_info, new Server(host, port, {
		auto_reconnect: true
	}, {}), {
		safe: true
	});
	this.db.open(function(err, data) {
		if (data) {
			if (config.mongo.username && config.mongo.password) {
				data.authenticate(config.mongo.username, config.mongo.password, function(errdb, datadb) {
					if (datadb) {
						console.log("Database connection opened.");
					} else {
						console.log("Error in connecting to database: " + errdb);
					}
				});
			} else {}
		} else {
			console.log(err);
		}
	});
};


/**
 * Creates a collection object for the app usage.
 *
 * @param {function} callback function
 * @return {Collection} the entire collection for the object.
 * @api public
 */
AppUsageHandler.prototype.getCollection = function(callback) {
	this.db.collection(config.mongo.app_usage, function(error, usercollection) {
		if (error) callback(error);
		else callback(null, usercollection);
	});
};



/**
 * Creates a collection object for the app info collection.
 *
 * @param {function} callback function
 * @return {Collection} the entire collection for the object.
 * @api public
 */
AppInfoHandler.prototype.getCollection = function(callback) {
	this.db.collection(config.mongo.app_info, function(error, appCollection) {
		if (error) callback(error);
		else callback(null, appCollection);
	});
};


/**
 * fetches a collection of app usage.
 *
 * @param {function} callback function
 * @return {Collection} the entire collection for app usage.
 * @api public
 */
UsersCollection.prototype.findAll = function(callback) {
	this.getCollection(function(error, usercollection) {
		if (error) callback(error)
		else {
			usercollection.find().toArray(function(error, results) {
				if (error) callback(error)
				else callback(null, results)
			});
		}
	});
};


/**
 * Creates a new appInfo [can be single or multiple]
 *
 * @param {AppObject/Array} _appInfo
 * @param {function} callback function
 * @api public
 */
AppUsageHandler.prototype.addAppRecord = function(_appInfo, callback) {
	this.getCollection(function(error, appcollection) {
		if (error) callback(error)
		else {
			appcollection.insert(_appInfo, function(error, result) {
				if (error) callback(error)
				else callback(null, result)
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
AppUsageHandler.prototype.appTrends = function(callback) {

	var packagesToIgnore = config.ignore_packages;
	this.getCollection(function(error, appcollection) {
		if (error) callback(error)
		else {
			var map = function() {
					emit(this.package_name, this.active_time)
				};
			var reduce = function(key, values) {
					return Array.sum(values);
				};
			appcollection.mapReduce(map, reduce, {
				out: {
					inline: 1
				},
				query:{package_name: { $nin: packagesToIgnore }}
			}, function(error, result) {
				console.log('- %s', error);
				if (error) callback(error)
				else callback(null, result)
			});
		}
	});
};


/**
 * Fetches info about the apps.
 *
 * @param {function} callback function
 * @api public
 */
AppInfoHandler.prototype.AppInformation = function(callback) {

	this.getCollection(function(error, appcollection) {
		if (error) callback(error)
		else {
			appcollection.find({},{package_name:1, _id:0}).toArray(function(error, results) {
				if (error) callback(error)
				else callback(null, results)
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
AppInfoHandler.prototype.AppInformationFor = function(appList, callback) {

	this.getCollection(function(error, appcollection) {
		if (error) callback(error)
		else {
			appcollection.find({package_name:{$in:appList}}).toArray(function(error, results) {
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
AppInfoHandler.prototype.appStoreInfo = function(appInfo, callback) {

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




exports.AppInfoHandler = AppInfoHandler;
exports.AppUsageHandler = AppUsageHandler;