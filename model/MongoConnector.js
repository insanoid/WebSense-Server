/*
 * Handles the database requirements for the user model.
 */
var Db = require('mongodb').Db;
var Server = require('mongodb').Server;
var config = require('../local.config');
DatabaseAccessObject = function() {};
/**
 * creates a connection.
 *
 * @param {String} host
 * @param {String} port
 * @return {db} connection.
 * @api public
 */
DatabaseAccessObject.prototype.connect = function(host, port, callback) {
	this.db = new Db(config.mongo.db, new Server(host, port, {
		auto_reconnect: true,
		poolSize: config.mongo.pool_size
	}, {}), {
		safe: true
	});
	this.db.open(function(err, data) {
		if (data) {
			if (config.mongo.username && config.mongo.password) {
			data.authenticate(config.mongo.username, config.mongo.password, function(errdb, datadb) {
				if (datadb) {
					callback(data);
					console.log("Database connection opened.");
				} else {
					console.log("Error in connecting to database: " + errdb);
				}
			});
		} else {
			callback(data);
			console.log("Enter a username and password in the config file. - If applicable.");
		}

		} else {
			console.log(err);
		}
	});
};
exports.DatabaseAccessObject = DatabaseAccessObject;