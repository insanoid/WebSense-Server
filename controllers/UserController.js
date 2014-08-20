var config = require('../local.config');
var validator = require('validator');
var ObjectID = require('mongodb').ObjectID;

var UsersCollection = require('../model/UserHandler').UsersCollection;
var usersCollection = null;
/**
 * Initialize the db connection.
 *
 * @param {DBConnection} already connected db connection.
 * @api public
 */
exports.initDBConnection = function (_dbConn) {
	usersCollection = new UsersCollection(_dbConn);
}
/**
 * API Call - Authenticates the user.
 *
 * @param {String} username
 * @param {String} password
 * @return {HTTPRESPONSE} response.
 * @api public
 */
exports.authenticate = function (req, res) {
	console.log((validator.isEmail(req.param('username'))) + " " + req.param('password') + " " + req.param('uuid') + " " + req.param('username'));
	if (!(validator.isEmail(req.param('username'))) || !req.param('password') || !req.param('uuid')) {
		res.statusCode = 400;
		return res.json({
			error: 'Require a valid username(email address), password and a device id.'
		});
	} else {
		usersCollection.authenticateUser(req.param('username'), encryptPassword(req.param('password')), function (error_m, user) {
			if (user) {
				var resp = generateAuthenticateToken(user, req.param('uuid'));
				var edit_user = resp[0];
				var user_id = edit_user._id;
				delete edit_user['_id'];
				usersCollection.updateUserObject(user_id, edit_user, function (error, result) {
					if (!error) {
						return res.json({
							auth_token: resp[1]
						});
					} else {
						res.statusCode = 500;
						return res.json({
							error: "An error occured while handling your request."
						});
					}
				});
			} else {
				res.statusCode = 401;
				return res.json({
					error: 'Invalid username or password.'
				});
			}
		});
	}
}
/**
 * API Call - Creates a new user.
 *
 * @param {String} username
 * @param {String} password
 * @param {String} gender
 * @param {String} job_type
 * @param {String} uuid
 * @param {String} device_info
 * @return {HTTPRESPONSE} response.
 * @api public
 */
exports.create = function (req, res) {
	console.log(req.param('password') + " " + req.param('uuid') + " " + req.param('username') + " " + req.param('gender') + req.param('job_type') + " - >" + req.param('device_info'));

	if (!(validator.isEmail(req.param('username'))) || !req.param('password') || !req.param('job_type') || !req.param('uuid')) {
		res.statusCode = 400;
		return res.json({
			error: 'Require a valid username, password, job_type.'
		});
	} else {
		usersCollection.getUserForEmail(req.param('username'), function (error, user) {
			if (user) {
				res.statusCode = 401;
				return res.json({
					error: 'Email already exists, try logging in!'
				});
			} else {
				var user = createUser(
				req.param('username'), encryptPassword(req.param('password')), req.param('uuid'), "UD", req.param('job_type'), req.param('device_info'));
				var auth_key = user.device_info[0].auth_token;
				usersCollection.addNewUser(user, function (error, result) {
					if (!error) {
						return res.json({
							auth_token: auth_key
						});
					} else {
						res.statusCode = 500;
						return res.json({
							error: error + "An error occured while handling your request."
						});
					}
				});
			}
		});
	}
}


/**
 * Test method to get all usrs.
 *
 * @return {User} User object.
 * @api private
 */
exports.findAll = function (req, res) {
	usersCollection.findAll(function (error, users) {
		if (users) {
			res.statusCode = 200;
			return res.json({
				users: users
			});
		}
	});
	
 var foursquare = (require('foursquarevenues'))('BSJNYLLRYUPZIQNSD5XXOYZKK0UBGWWXFD31KEVHDGVHTQIU', 'XFOWWXQEKOHFMXVRSOBRACIA5OZUTZ5XMJZLKHZ1TXTPD4DI');

    var params = {
        "ll": "52.45147705078125,-1.9390869140625",
        "radius":10,
        "limit":1
    };

    foursquare.getVenues(params, function(error, venues) {
        if (!error) {
            console.log("%j",venues);
        }
    });


}

/**
 * Test method to get a single user.
 *
 * @return {User} User object.
 * @api private
 */
exports.findUser = function (email, callback) {
	usersCollection.getUserForEmail(email, function (error, user) {
		if (user) {
			callback(user);
		} else {
			callback(null);
		}
	});
}

/**
 * Validates the auth key.
 *
 * @param {String} _auth_key
 * @return {User} User object.
 * @api private
 */
exports.validateSession = function validateSession(_auth_key, callback) {
	if (_auth_key == null) {
		callback(null);
	} else {
		usersCollection.getUserForAuthToken(_auth_key, function (error, user) {
			callback(user);
		});
	}
}


/**
 * updates the user object
 *
 * @param {String} _auth_key
 * @return {User} User object.
 * @api private
 */
exports.updateUserObject = function validateSession(req, res) {


	if (!req.param('userId')) {
		res.statusCode = 400;
		return res.json({
			error: 'Require a valid userid.'
		});
	} else {

		if (Object.keys(req.body).length > 0) {
			usersCollection.updateUserObject(req.param('userId'), {
				$set: {
					"loc_tag": req.body
				}
			}, function (error, result) {
			
				if (!error) {
					res.statusCode = 200;
					return res.json({
						done: true
					});
				} else {
					res.statusCode = 500;
					return res.json({
						error: "An error occured while handling your request."
					});
				}
			});
		}
	}
}


/**
 * Generates an user object.
 *
 * @param {String} username
 * @param {String} password
 * @param {String} uuid of the device.
 * @param {String} gender of the user.
 * @param {String} Job type.
 * @return {User} User object.
 * @api private
 */

function createUser(_username, _password, _uuid, _gender, _job_type, _device_info) {
	var user = {
		username: _username,
		password: _password,
		gender: _gender,
		job_type: _job_type,
		device_info: [createNewDevice(_uuid, _device_info)]
	};
	return user;
}
/**
 * Generates an auth token for the device for the user.
 *
 * @param {User} user object.
 * @param {String} device's Id.
 * @return {User} User object.
 * @api private
 */

function generateAuthenticateToken(userObject, deviceId, deviceInfo) {
	var newToken = "";
	var newDevice = true;
	if (userObject.device_info) {
		for (var i = 0; i < userObject.device_info.length; i++) {
			if (userObject.device_info[i].uuid == deviceId) {
				newToken = userObject.device_info[i].auth_token = getNewToken();
				userObject.device_info[i].device_details = deviceInfo;
				newDevice = false;
			}
		}
		if (newDevice) {
			var device = createNewDevice(deviceId, deviceInfo);
			newToken = device.auth_token;
			userObject.device_info.push(device);
		}
	} else {
		var device = createNewDevice(deviceId, deviceInfo);
		newToken = device.auth_token;
		userObject.device_info = [device];
	}
	
	return [userObject, newToken];
}
/**
 * Creates a new device Object
 *
 * @param {String} device's Id.
 * @return {DeviceObject} Device
 * @api private
 */

function createNewDevice(deviceId, deviceInfo) {
	var device = {
		device_details: JSON.parse(deviceInfo),
		auth_token: getNewToken(),
		uuid: deviceId,
		last_logged_at: new Date()
	}
	
	return device;
}
/**
 * Generates a new token.
 *
 * @return {String} new token.
 * @api private
 */

function getNewToken() {
	var hat = require('hat');
	var id = hat();
	return id;
}
/**
 * Generates the hash for the password.
 *
 * @param {String} app
 * @return {String} hexed password
 * @api private
 */

function encryptPassword(password) {
	var crypto = require('crypto'),
		shasum = crypto.createHash('sha1');
	shasum.update(password);
	return shasum.digest('hex');
}