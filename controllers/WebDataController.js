var config = require('../local.config');
var validator = require('validator');
var UsersCollection = require('../model/UserHandler').UsersCollection;
var dbObject = null;
var usersCollection = null; //new UsersCollection(config.mongo.host, config.mongo.port);



/**
 * API Call - Shows the app usage trends.
 *
 * @param {String} duration
 * @return {HTTPRESPONSE} response.
 * @api public
 */
exports.trends = function(req, res) {
	var duration = req.param('duration');
	var response = [{
		"url": "http://dribbble.com/search?q=android+register",
		"title": "Google rules the world.",
		"content_image": "http://54.186.15.10:3001/images/icon_app.png"
	}, {
		"url": "http://www.hbo.com/game-of-thrones",
		"title": "Game of throne is back Yay!",
		"content_image": "http://54.186.15.10:3001/images/got.jpg"
	}, {
		"url": "http://dribbble.com/search?q=android+register",
		"title": "Google rules the world, oh no not again!",
		"content_image": "http://54.186.15.10:3001/images/icon_app.png"
	}];
	res.json(response);
};
/**
 * API Call - Shows the app usage trends for the area.
 *
 * @param {String} duration
 * @param {Double} latitude
 * @param {Double} Longitude
 * @return {HTTPRESPONSE} response.
 * @api public
 */
exports.trends = function(req, res) {
	var duration = req.param('duration');
	var response = [{
		"url": "http://dribbble.com/search?q=android+register",
		"title": "Google rules the world.",
		"content_image": "http://54.186.15.10:3001/images/icon_app.png"
	}, {
		"url": "http://www.hbo.com/game-of-thrones",
		"title": "Game of throne is back Yay!",
		"content_image": "http://54.186.15.10:3001/images/got.jpg"
	}, {
		"url": "http://dribbble.com/search?q=android+register",
		"title": "Google rules the world, oh no not again!",
		"content_image": "http://54.186.15.10:3001/images/icon_app.png"
	}];
	res.json(response);
};