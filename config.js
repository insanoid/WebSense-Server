/*
 * Requires a config file called local.config.js with the following properties for it to work.
 */
var config = {}

config.mongo = {};
config.web = {};
config.push = {};

config.mongo.host = 'localhost';
config.mongo.port = 27017;
// config.mongo.username = 'someusername';
// config.mongo.password = 'somepassword';
config.mongo.db = 'websense';
config.mongo.app_usage = 'websenseAppUsage';

config.web.port = process.env.PORT || 3000;
module.exports = config;
