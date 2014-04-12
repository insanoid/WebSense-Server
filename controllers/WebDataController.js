var config = require('../local.config');
var validator = require('validator');
var request = require('request');
var cheerio = require('cheerio');
var uriparser = require('url');

var WebUsageHandler = require('../model/WebUsageHandler').WebUsageHandler;
var webCollection = null; //new UsersCollection(config.mongo.host, config.mongo.port);
/**
 * Initialize the db connection.
 *
 * @param {DBConnection} already connected db connection.
 * @api public
 */
exports.initDBConnection = function(_dbConn) {
	webCollection = new WebUsageHandler(_dbConn);
}
/**
 * API Call - Shows the app usage trends.
 *
 * @param {String} duration
 * @return {HTTPRESPONSE} response.
 * @api public
 */
exports.trends = function(req, res) {
	webCollection.webTrends(function(error_info, result) {
		console.log('-' + error_info + result);
		/*
res.json({
			results: result
		});
*/
	});
	var duration = 'http://www.wired.co.uk/news/archive/2014-04/11/ebola-open-street-map';//req.param('duration');
	findAndUpdateAppInfo(duration, function(data){
		res.json(data);
	});
	
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
};
/**
 * Scrapes google play store for more information..
 *
 * @param {Array} application array.
 * @api private
 */

function findAndUpdateAppInfo(urlcur, callback) {
	var json = {
		url: urlcur,
		title: "",
		content: "",
		content_image: []
	};
	
	var host = uriparser.parse(urlcur).hostname;
	request(urlcur, function(error, response, html) {
		if (!error) {
		
		
			var $ = cheerio.load(html);
			$('title').filter(function() {
				var data = $(this);
				console.log('here'+data);
				if (!json.title) json.title = data.text();
			})
			
			$('meta[name="description"]').filter(function() {
				var data = $(this);
				console.log('here'+data.attr('content'));
				if (!json.content) json.content = data.attr('content');
			})
			$('img[src$=jpg],img[src$=png]').filter(function() {
				var data = $(this);
				console.log('here'+data.attr('src'));
				//"http://"+host+
				var url = "";
				if(ValidURL(data.attr('src'))==true){
					url = data.attr('src');
				}else{
					url = "http://"+host+data.attr('src');
				}
				json.content_image.push(url);
			})
			
			
			

				callback(json);

		} else {
			callback(null);
		}
	});
}

function ValidURL(s) {
   var regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
      return regexp.test(s); 
      }
