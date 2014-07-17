var config = require('../local.config');
var validator = require('validator');
var user = require('./UserController');
var ContextInfoHandler = require('../model/ContextInfoHandler').ContextInfoHandler;
var contextInfoCollection = null;
/**
 * Initialize the db connection.
 *
 * @param {DBConnection} already connected db connection.
 * @api public
 */
exports.initDBConnection = function(_dbConn) {
	contextInfoCollection = new ContextInfoHandler(_dbConn);
}
/**
 * API Call - pushes context data.
 *
 * @param {String} Auth_token
 * @param {Double} context_info
 * @return {HTTPRESPONSE} response.
 * @api public
 */
exports.pushContextInfo = function(req, res) {
	var data = req.body;
	console.log("[PUSH]: %s", data.auth_token);
	if (!data.context_info) {
		res.json({
			success: false
		});
	} else {
		tokenValidator(data.auth_token, function(valid, userObj) {
			if (valid == true) {
				var now = new Date();
				console.log("[%s] - [%s]:   %j", now.toString(), userObj.username, data.context_info.length);
				for (n in data.context_info) {
					data.context_info[n].position = JSON.parse("[" + data.context_info[n].position + "]");
					data.context_info[n].content = JSON.parse(data.context_info[n].content);
					data.context_info[n].user_id = userObj._id;
				}
				contextInfoCollection.addContextRecord(data.context_info, function(error_info, result) {
					if (!error_info) {
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
 * API Call - fetches user record count for an user.
 *
 * @param {String} email
 * @param {long} start_duration
 * @param {end} end_duration
 * @return {HTTPRESPONSE} response.
 * @api public
 */
exports.getUserAnalytics = function(req, res) {
	getUserForEmail(req.param('email'), function(valid, userObj) {
		if (valid == true) {
			contextInfoCollection.findAllReleventRecordsForUser(userObj._id, req.param('startTime'), req.param('endTime'), function(error_info, result) {
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
				error: "Invalid auth_token."
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
	contextInfoCollection.findAllReleventRecordsForAll(req.param('startTime'), req.param('endTime'), function(error_info, result) {
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
		user.userForEmail(email, function(user, error) {
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