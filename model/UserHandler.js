/*
	* Handles the database requirements for the user model.
*/

var Db = require('mongodb').Db;
var Connection = require('mongodb').Connection;
var Server = require('mongodb').Server;
var BSON = require('mongodb').BSON;
var ObjectID = require('mongodb').ObjectID;
var config = require('../local.config');


/**
 * Creates a collection object for the user.
 *
 * @param {String} host
 * @param {String} port
 * @return {Collection} UserCollection.
 * @api public
 */
UsersCollection = function (host, port) {
    this.db = new Db(config.mongo.db, new Server(host, port, {
        auto_reconnect: true
    }, {}), {
        safe: true
    });
    this.db.open(function (err, data) {
        if (data) {
            if (config.mongo.username && config.mongo.password) {
                data.authenticate(config.mongo.username, config.mongo.password, function (errdb, datadb) {
                    if (datadb) {
                        console.log("Database connection opened.");
                    } else {
                        console.log("Error in connecting to database: " + errdb);
                    }
                });
            } else {

            }


        } else {
            console.log(err);
        }
    });
};


/**
 * Creates a collection object for the user.
 *
 * @param {function} callback function
 * @return {Collection} the entire collection for the object.
 * @api public
 */
UsersCollection.prototype.getCollection = function (callback) {
    this.db.collection(config.mongo.db, function (error, usercollection) {
        if (error) callback(error);
        else callback(null, usercollection);
    });
};

/**
 * fetches a collection of user.
 *
 * @param {function} callback function
 * @return {Collection} the entire collection for user.
 * @api public
 */
UsersCollection.prototype.findAll = function (callback) {
    this.getCollection(function (error, usercollection) {
        if (error) callback(error)
        else {
            usercollection.find().toArray(function (error, results) {
                if (error) callback(error)
                else callback(null, results)
            });
        }
    });
};


/**
 * checks if the user record exists for the credentials.
 *
 * @param {String} username
 * @param {String} password
 * @param {function} callback function
 * @return {Collection} the entire collection for user.
 * @api public
 */
UsersCollection.prototype.authenticateUser = function (_username, _password, callback) {
    this.getCollection(function (error, usercollection) {
        if (error) callback(error)
        else {

            usercollection.findOne({
                username: _username,
                password: _password
            }, function (error, result) {
                if (error) callback(error)
                else callback(null, result)
            });
        }
    });
};

/**
 * gets user for the email address.
 *
 * @param {String} username
 * @param {function} callback function
 * @return {Collection} the entire collection for user.
 * @api public
 */
UsersCollection.prototype.getUserForEmail = function (_username, callback) {
    this.getCollection(function (error, usercollection) {
        if (error) callback(error)
        else {
            usercollection.findOne({
                username: _username
            }, function (error, result) {
                if (error) callback(error)
                else callback(null, result)
            });
        }
    });
};

/**
 * Creates a new user
 *
 * @param {UserObject} user
 * @param {function} callback function
 * @api public
 */
UsersCollection.prototype.addNewUser = function (_user, callback) {
    this.getCollection(function (error, usercollection) {
        if (error) callback(error)
        else {
            usercollection.insert(_user, function (error, result) {
                if (error) callback(error)
                else callback(null, result)
            });
        }
    });
};

/**
 * Updates the user information.
 *
 * @param {UserObject} user
 * @param {function} callback function
 * @api public
 */
UsersCollection.prototype.updateUserObject = function (_user_id, _user, callback) {
    this.getCollection(function (error, usercollection) {
        if (error) callback(error)
        else {
            usercollection.update({
                _id: _user_id
            }, _user, function (error, result) {
                if (error) callback(error)
                else callback(null, result)
            });
        }
    });

};

/**
 * Fetches the user record for the auth token
 *
 * @param {String} _auth_token
 * @param {function} callback function
 * @api public
 */
UsersCollection.prototype.getUserForAuthToken = function (_auth_token, callback) {
    this.getCollection(function (error, usercollection) {
        if (error) callback(error)
        else {
            usercollection.findOne({
                "device_info.auth_token": _auth_token
            }, function (error, result) {
                if (error) callback(error)
                else callback(null, result)
            });
        }
    });
};


exports.UsersCollection = UsersCollection;