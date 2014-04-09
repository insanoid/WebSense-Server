var config = require('../local.config');
var validator = require('validator');
var user = require('../controllers/UserController');

/**
 * API Call - Shows the app usage trends for the area.
 *
 * @param {String} duration
 * @param {Double} latitude
 * @param {Double} Longitude
 * @return {HTTPRESPONSE} response.
 * @api public
 */
exports.pushpInfo = function (req, res) {

var data = req.body;

var response = [{
	"app_name":"App 1",
	"package_name":"com.google.chrome",
    "category":"Browser",
	"app_icon":"http://54.186.15.10:3001/images/icon_app.png"
},{
	"app_name":"App 2",
	"package_name":"com.google.chrome3",
    "category":"Fun",
"app_icon":"http://54.186.15.10:3001/images/icon_app.png"
},{
	"app_name":"App 3",
	"package_name":"com.google.chrome2",
    "category":"Productivity",
"app_icon":"http://54.186.15.10:3001/images/icon_app.png"
}];
  	res.json(response);

}


/**
 * API Call - Shows the app usage trends.
 *
 * @param {String} duration
 * @return {HTTPRESPONSE} response.
 * @api public
 */
exports.trends = function (req, res) {

var duration = req.param('duration');

var response = [{
	"app_name":"App 1",
	"package_name":"com.google.chrome",
    "category":"Browser",
	"app_icon":"http://54.186.15.10:3001/images/icon_app.png"
},{
	"app_name":"App 2",
	"package_name":"com.google.chrome3",
    "category":"Fun",
"app_icon":"http://54.186.15.10:3001/images/icon_app.png"
},{
	"app_name":"App 3",
	"package_name":"com.google.chrome2",
    "category":"Productivity",
"app_icon":"http://54.186.15.10:3001/images/icon_app.png"
}];
  	res.json(response);

}


/**
 * API Call - Shows the app usage trends for the area.
 *
 * @param {String} duration
 * @param {Double} latitude
 * @param {Double} Longitude
 * @return {HTTPRESPONSE} response.
 * @api public
 */
exports.nearby = function (req, res) {

var duration = req.param('duration');

var response = [{
	"app_name":"App 1",
	"package_name":"com.google.chrome",
    "category":"Browser",
	"app_icon":"http://54.186.15.10:3001/images/icon_app.png"
},{
	"app_name":"App 2",
	"package_name":"com.google.chrome3",
    "category":"Fun",
"app_icon":"http://54.186.15.10:3001/images/icon_app.png"
},{
	"app_name":"App 3",
	"package_name":"com.google.chrome2",
    "category":"Productivity",
"app_icon":"http://54.186.15.10:3001/images/icon_app.png"
}];
  	res.json(response);

}


