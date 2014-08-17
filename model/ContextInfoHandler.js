
var Db = require('mongodb').Db;
var Connection = require('mongodb').Connection;
var Server = require('mongodb').Server;
var BSON = require('mongodb').BSON;
var ObjectID = require('mongodb').ObjectID;
var config = require('../local.config');
var db = null;
/**
 * Creates an access point
 *
 * @param {DBConnection} Database connection
 * @return {Object} handler object.
 * @api public
 */
ContextInfoHandler = function(_dbConn) {
	this.db = _dbConn;
};

/**
 * Creates a collection object for the context.
 *
 * @param {function} callback function
 * @return {Collection} the entire collection for the object.
 * @api public
 */
ContextInfoHandler.prototype.getCollection = function(callback) {

	this.db.collection(config.mongo.collection.context_info, function(error, contextcollection) {
		if (error) callback(error);
		else callback(null, contextcollection);
	});
};

/**
 * fetches a collection of context.
 *
 * @param {function} callback function
 * @return {Collection} the entire collection for app usage.
 * @api public
 */
ContextInfoHandler.prototype.findAll = function (callback) {
	this.getCollection(function (error, ctxcollection) {
		if (error) callback(error)
		else {
			ctxcollection.find().toArray(function (error_correction, results) {
				if (error_correction) callback(error_correction)
				else callback(null, results)
			});
		}
	});
};


/**
 * Creates a new contextinfo [can be single or multiple]
 *
 * @param {ContextObject/Array} contextinfo
 * @param {function} callback function
 * @api public
 */
ContextInfoHandler.prototype.addContextRecord = function(_contextInfo, callback) {

	this.getCollection(function(error, contextcollection) {
		if (error) callback(error)
		else {
			contextcollection.insert(_contextInfo, function(error, result) {
				if (error) callback(error)
				else callback(null, result)
			});
		}
	});
};

/**
 * saves contextinfo [can be single or multiple]
 *
 * @param {contextObject/Array} _contextInfo
 * @param {function} callback function
 * @api public
 */
ContextInfoHandler.prototype.saveRecord = function (_contextInfo, callback) {
	this.getCollection(function (error, ctxcollection) {
		if (error) callback(error)
		else {
			ctxcollection.save(_contextInfo, function (error, result) {
				if (error) callback(error)
				else callback(null, result)
			});
		}
	});
};

/**
 * Analytics Information
 *
 */

/**
 * fetches a collection of Context Information for a particular usage for a particular duration.
 *
 * @param {function} callback function
 * @return {Collection} the entire collection for context.
 * @api public
 */
ContextInfoHandler.prototype.findAllReleventRecordsForUser = function(_userId, _duration, _endDuration, callback) {

	this.getCollection(function(error, contextcollection) {
		if (error) callback(error)
		else {
			contextcollection.find({
				user_id: _userId,
				timestamp: {
					$gte: Number(_duration),
					$lt:Number(_endDuration)
				}
			}).toArray(function(error_correction, results) {
				if (error_correction) callback(error_correction)
				else callback(null, results)
			});
		}
	});
};

/**
 * fetches a collection of context records for all the users for a duration.
 *
 * @param {function} callback function
 * @return {Collection} the entire collection for context.
 * @api public
 */
ContextInfoHandler.prototype.findAllReleventRecordsForAll = function(_duration, _endDuration, callback) {
	
	this.getCollection(function(error, contextcollection) {
		if (error) callback(error)
		else {
			var map = function() {
					emit(this.user_id, {
						count: 1
					})
				};
			var reduce = function(key, values) {
					var count = 0;
					var totaltime = 0;
					values.forEach(function(v) {
						count += v['count'];
					});
					return {
						count: count
					};
				};
			contextcollection.mapReduce(map, reduce, {
				out: {
					inline: 1
				},
				query: {
					timestamp: {
					$gte: Number(_duration),
					$lt:Number(_endDuration)
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

exports.ContextInfoHandler = ContextInfoHandler;