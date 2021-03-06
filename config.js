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
config.mongo.collection.context_info = 'contextinfo';

config.ignore_packages = [ "com.android.systemui", "com.google.android.googlequicksearchbox", null, "android", "com.android.settings", "com.sec.android.launcher" ];

config.web.port = process.env.PORT || 21129;
module.exports = config;
