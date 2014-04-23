
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


exports.ContextInfoHandler = ContextInfoHandler;