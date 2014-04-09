
var config = require('../local.config');
var validator = require('validator');
var UsersCollection = require('../model/UserHandler').UsersCollection;
var usersCollection = new UsersCollection(config.mongo.host, config.mongo.port);


/**
 * API Call - Authenticates the user.
 *
 * @param {String} username
 * @param {String} password
 * @return {HTTPRESPONSE} response.
 * @api public
 */
exports.authenticate = function (req, res) {

console.log((validator.isEmail(req.param('username'))) +" "+ req.param('password') +" "+ req.param('uuid') +" "+ req.param('username'));

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
                        req.session.authkey = resp[1];
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
 * @return {HTTPRESPONSE} response.
 * @api public
 */
exports.create = function (req, res) {

console.log(req.param('password') +" "+ req.param('uuid') +" "+ req.param('username') + " "+ req.param('gender')+ req.param('job_type'));

    if (!(validator.isEmail(req.param('username'))) || !req.param('password') || !req.param('gender') || !req.param('job_type')) {
        res.statusCode = 400;
        return res.json({
            error: 'Require a valid username, password, gender, job_type.'
        });

    } else {

        usersCollection.getUserForEmail(req.param('username'), function (error, user) {
            if (user) {
                res.statusCode = 400;
                return res.json({
                    error: 'Email already exists, try logging in!'
                });
            } else {
                var user = createUser(req.param('username'), encryptPassword(req.param('password')), req.param('uuid'));
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
 * Validates the auth key.
 *
 * @param {String} _auth_key
 * @return {User} User object.
 * @api private
 */
exports.validateSession = function validateSession(_auth_key, callback) {
    usersCollection.getUserForAuthToken(_auth_key, function (error, user) {
        callback(user);
    });
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
function createUser(_username, _password, _uuid, _gender, _job_type) {
    var user = {
        username: _username,
        password: _password,
        gender: _gender,
        job_type: _job_type,
        device_info: [createNewDevice(_uuid)]
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
function generateAuthenticateToken(userObject, deviceId) {

    var newToken = "";
    var newDevice = true;
    if (userObject.device_info) {
        for (var i = 0; i < userObject.device_info.length; i++) {
            if (userObject.device_info[i].uuid == deviceId) {
                newToken = userObject.device_info[i].auth_token = getNewToken();
                newDevice = false;
            }
        }
        if (newDevice) {
            var device = createNewDevice(deviceId);
            newToken = device.auth_token;
            userObject.device_info.push(device);

        }
    } else {

        var device = createNewDevice(deviceId);
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
function createNewDevice(deviceId) {

    var device = {
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
function encryptPassword(password){
    var crypto = require('crypto'),shasum = crypto.createHash('sha1');
    shasum.update(password);
	return shasum.digest('hex');
}