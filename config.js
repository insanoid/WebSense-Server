/*
 * Requires a config file called local.config.js with the following properties for it to work.
 */
var config = {}

config.mongo = {};
config.web = {};
config.push = {};

config.max_trends_result = 15;
config.mongo.host = 'localhost';
config.mongo.port = 27017;
// config.mongo.username = 'someusername';
// config.mongo.password = 'somepassword';
config.mongo.db = 'websensedb';
config.mongo.pool_size = 10;
config.mongo.collection.user = 'users';
config.mongo.collection.app_usage = 'appusage';
config.mongo.collection.app_info = 'appinfo';

config.web.port = process.env.PORT || 3000;
module.exports = config;
