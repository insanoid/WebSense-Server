/*
 * Handles the database requirements for the App Usage model.
 */
var Db = require('mongodb').Db;
var Connection = require('mongodb').Connection;
var Server = require('mongodb').Server;
var BSON = require('mongodb').BSON;
var ObjectID = require('mongodb').ObjectID;
var config = require('../local.config');

/**
 * Creates an access point
 *
 * @param {DBConnection} Database connection
 * @return {Object} handler object.
 * @api public
 */
AppUsageHandler = function (_dbConn) {
	this.db = _dbConn;
};

/**
 * Creates an access point for handling generic app information.
 *
 * @param {DBConnection} Database connection
 * @return {Object} handler object.
 * @api public
 */
AppInfoHandler = function (_dbConn) {
	this.db = _dbConn;
};

/**
 * Creates an access point for handling GeoTags.
 *
 * @param {DBConnection} Database connection
 * @return {Object} handler object.
 * @api public
 */
GeoTagHandler = function (_dbConn) {
	this.db = _dbConn;
};


/**
 * Creates a collection object for the app usage.
 *
 * @param {function} callback function
 * @return {Collection} the entire collection for the object.
 * @api public
 */
AppUsageHandler.prototype.getCollection = function (callback) {
	this.db.collection(config.mongo.collection.app_usage, function (error, usercollection) {
		if (error) callback(error);
		else callback(null, usercollection);
	});
};

/**
 * Creates a collection object for the app info collection.
 *
 * @param {function} callback function
 * @return {Collection} the entire collection for the object.
 * @api public
 */
AppInfoHandler.prototype.getCollection = function (callback) {
	this.db.collection(config.mongo.collection.app_info, function (error, appCollection) {
		if (error) callback(error);
		else callback(null, appCollection);
	});
};

/**
 * Creates a collection object for the app info collection.
 *
 * @param {function} callback function
 * @return {Collection} the entire collection for the object.
 * @api public
 */
GeoTagHandler.prototype.getCollection = function (callback) {
	this.db.collection(config.mongo.collection.geo_tags, function (error, appCollection) {
		if (error) callback(error);
		else callback(null, appCollection);
	});
};
/**
 * fetches a collection of app usage.
 *
 * @param {function} callback function
 * @return {Collection} the entire collection for app usage.
 * @api public
 */
AppUsageHandler.prototype.findAll = function (callback) {
	this.getCollection(function (error, appcollection) {
		if (error) callback(error)
		else {
			appcollection.find().toArray(function (error_correction, results) {
				if (error_correction) callback(error_correction)
				else callback(null, results)
			});
		}
	});
};

/**
 * fetches a collection of geotags.
 *
 * @param {function} callback function
 * @return {Collection} the entire collection for geotags.
 * @api public
 */
GeoTagHandler.prototype.findAll = function (callback) {
	this.getCollection(function (error, appcollection) {
		if (error) callback(error)
		else {
			appcollection.find().toArray(function (error_correction, results) {
				if (error_correction) callback(error_correction)
				else callback(null, results)
			});
		}
	});
};

/**
 * Creates a new geoInfo [can be single or multiple]
 *
 * @param {GeoCollectionTag/Array} _appInfo
 * @param {function} callback function
 * @api public
 */
GeoTagHandler.prototype.addGeoTagInfo = function (geoInfo, callback) {
	this.getCollection(function (error, appcollection) {
		if (error) callback(error)
		else {
			appcollection.insert(geoInfo, function (error, result) {
				if (error) callback(error)
				else callback(null, result)
			});
		}
	});
};


/**
 * Creates a new appInfo [can be single or multiple]
 *
 * @param {AppObject/Array} _appInfo
 * @param {function} callback function
 * @api public
 */
AppUsageHandler.prototype.addAppRecord = function (_appInfo, callback) {
	this.getCollection(function (error, appcollection) {
		if (error) callback(error)
		else {
			appcollection.insert(_appInfo, function (error, result) {
				if (error) callback(error)
				else callback(null, result)
			});
		}
	});
};

/**
 * saves appInfo [can be single or multiple]
 *
 * @param {AppObject/Array} _appInfo
 * @param {function} callback function
 * @api public
 */
AppUsageHandler.prototype.saveRecord = function (_appInfo, callback) {
	this.getCollection(function (error, appcollection) {
		if (error) callback(error)
		else {
			appcollection.save(_appInfo, function (error, result) {
				if (error) callback(error)
				else callback(null, result)
			});
		}
	});
};

/**
 * Fetches trends in app usage.
 *
 * @param {AppObject/Array} _appInfo
 * @param {function} callback function
 * @api public
 */
AppUsageHandler.prototype.appTrends = function (duration, callback) {
	var packagesToIgnore = config.ignore_packages;
	this.getCollection(function (error, appcollection) {
		if (error) callback(error)
		else {
			var map = function () {
					emit(this.package_name, this.active_time)
				};
			var reduce = function (key, values) {
					return Array.sum(values);
				};
			appcollection.mapReduce(map, reduce, {
				out: {
					inline: 1
				},
				query: {
					package_name: {
						$nin: packagesToIgnore
					},
					start_time: {
						$gt: duration
					}
				}
			}, function (error, result) {
				if (error) callback(error)
				else callback(null, result)
			});
		}
	});
};

/**
 * Fetches trends in app usage.
 *
 * @param {AppObject/Array} _appInfo
 * @param {function} callback function
 * @api public
 */
AppUsageHandler.prototype.appTrendsInArea = function (duration, _latitude, _longitude, callback) {
	var packagesToIgnore = config.ignore_packages;
	this.getCollection(function (error, appcollection) {
		if (error) callback(error)
		else {
			var map = function () {
					emit(this.package_name, this.active_time)
				};
			var reduce = function (key, values) {
					return Array.sum(values);
				};
			appcollection.mapReduce(map, reduce, {
				out: {
					inline: 1
				},
				query: {
					package_name: {
						$nin: packagesToIgnore
					},
					start_time: {
						$gte: duration
					},
					position: {
						$geoWithin: {
							$centerSphere: [
								[_latitude, _longitude], config.max_trends_result / 3959]
						}
					}
				}
			}, function (error, result) {
				console.log('- %s', error);
				if (error) callback(error)
				else callback(null, result)
			});
		}
	});
};

/**
 * Fetches info about the apps.
 *
 * @param {function} callback function
 * @api public
 */
AppInfoHandler.prototype.AppInformation = function (callback) {
	this.getCollection(function (error, appcollection) {
		if (error) callback(error)
		else {
			appcollection.find({}, {
				package_name: 1,
				_id: 0
			}).toArray(function (error, results) {
				if (error) callback(error)
				else callback(null, results)
			});
		}
	});
};

/**
 * Fetches info about the apps (for the given set).
 *
 * @param {Array} List of apps
 * @param {function} callback function
 * @api public
 */
AppInfoHandler.prototype.AppInformationFor = function (appList, callback) {
	this.getCollection(function (error, appcollection) {
		if (error) callback(error)
		else {
			appcollection.find({
				package_name: {
					$in: appList,
					$exists: true
				}
			}).toArray(function (error, results) {
				if (error) callback(error)
				else callback(null, results)
			});
		}
	});
};

/**
 * Push info about the apps.
 *
 * @param {function} callback function
 * @api public
 */
AppInfoHandler.prototype.appStoreInfo = function (appInfo, callback) {
	this.getCollection(function (error, appcollection) {
		if (error) callback(error)
		else {
			appcollection.insert(appInfo, function (error, results) {
				if (error) callback(error)
				else callback(null, results)
			});
		}
	});
};

/**
 * fetches a collection of app usage for a all the users for a duration between certain hours.
 *
 * @param {function} callback function
 * @return {Collection} the entire collection for app usage.
 * @api public
 */
AppUsageHandler.prototype.appTrendsDuringHours = function (duration, startHour, timespan, callback) {
	var packagesToIgnore = config.ignore_packages;

	this.getCollection(function (error, appcollection) {
		if (error) callback(error)
		else {
			var map = function () {
					emit(this.package_name, this.active_time)
				};
			var reduce = function (key, values) {
					return Array.sum(values);
				};
			appcollection.mapReduce(map, reduce, {
				out: {
					inline: 1
				},
				query: {
					package_name: {
						$nin: packagesToIgnore
					},
					start_time: {
						$gte: duration
					},
					start_minute_day: {
						$gte: startHour
					},
					start_minute_day: {
						$lt: startHour + timespan
					}
				}
			}, function (error, result) {
				console.log('- %s', error);
				if (error) callback(error)
				else callback(null, result)
			});
		}
	});
};


/**
 * fetches a collection of app usage for a all the users for a duration between certain hours at a location.
 *
 * @param {function} callback function
 * @return {Collection} the entire collection for app usage.
 * @api public
 */
AppUsageHandler.prototype.appTrendsDuringHoursAtLocation = function (duration, startHour, timespan, _latitude, _longitude, callback) {
	var packagesToIgnore = config.ignore_packages;
	this.getCollection(function (error, appcollection) {
		if (error) callback(error)
		else {
			var map = function () {
					emit(this.package_name, this.active_time)
				};
			var reduce = function (key, values) {
					return Array.sum(values);
				};
			appcollection.mapReduce(map, reduce, {
				out: {
					inline: 1
				},
				query: {
					package_name: {
						$nin: packagesToIgnore
					},
					start_time: {
						$gte: duration
					},
					start_minute_day: {
						$gte: startHour
					},
					start_minute_day: {
						$lt: startHour + timespan
					},
					position: {
						$geoWithin: {
							$centerSphere: [
								[_latitude, _longitude], config.max_trends_result / 3959]
						}
					}
				}
			}, function (error, result) {
				console.log('- %s', error);
				if (error) callback(error)
				else callback(null, result)
			});
		}
	});
};


/**
 * fetches a collection of app usage for a all the users for a duration between certain hours.
 *
 * @param {function} callback function
 * @return {Collection} the entire collection for app usage.
 * @api public
 */
AppUsageHandler.prototype.appTrendsDuringHours = function (duration, startHour, timespan, callback) {
	var packagesToIgnore = config.ignore_packages;

	this.getCollection(function (error, appcollection) {
		if (error) callback(error)
		else {
			var map = function () {
					emit(this.package_name, this.active_time)
				};
			var reduce = function (key, values) {
					return Array.sum(values);
				};
			appcollection.mapReduce(map, reduce, {
				out: {
					inline: 1
				},
				query: {
					package_name: {
						$nin: packagesToIgnore
					},
					start_time: {
						$gte: duration
					},
					start_minute_day: {
						$gte: startHour
					},
					start_minute_day: {
						$lt: startHour + timespan
					}
				}
			}, function (error, result) {
				console.log('- %s', error);
				if (error) callback(error)
				else callback(null, result)
			});
		}
	});
};


/**
 * Analytics & Processing Methods.
 *
 */

/**
 * fetches a collection of app usage for a particular usage for a particular duration.
 *
 * @param {function} callback function
 * @return {Collection} the entire collection for app usage.
 * @api public
 */
AppUsageHandler.prototype.findAllReleventRecordsForUser = function (_userId, _duration, _endDuration, callback) {
	var packagesToIgnore = config.ignore_packages;
	this.getCollection(function (error, appcollection) {
		if (error) callback(error)
		else {
			appcollection.find({

				user_id: _userId,
				"position": {
					$ne: [0, 0]
				},
				package_name: {
					$nin: packagesToIgnore
				},
				start_time: {
					$gt: _duration
				},
				end_time: {
					$lt: _endDuration
				}

			}, {
				position: 1,
				package_name: 1
			}).toArray(function (error_correction, results) {
				if (error_correction) callback(error_correction)
				else callback(null, results)
			});
		}
	});
};

/**
 * fetches a collection of app usage for a all the users for a duration.
 *
 * @param {function} callback function
 * @return {Collection} the entire collection for app usage.
 * @api public
 */
AppUsageHandler.prototype.findAllReleventRecordsForAll = function (_duration, _endDuration, callback) {
	var packagesToIgnore = config.ignore_packages;
	this.getCollection(function (error, appcollection) {
		if (error) callback(error)
		else {
			var map = function () {
					emit(this.user_id, {
						count: 1,
						active_time: this.active_time
					})
				};
			var reduce = function (key, values) {
					var count = 0;
					var totaltime = 0;
					values.forEach(function (v) {
						count += v['count'];
						totaltime += v['active_time']
					});
					return {
						count: count,
						active_time: totaltime
					};
				};
			appcollection.mapReduce(map, reduce, {
				out: {
					inline: 1
				},
				query: {
					package_name: {
						$nin: packagesToIgnore
					},
					start_time: {
						$gte: _duration
					},
					end_time: {
						$lt: _endDuration
					}
				}
			}, function (error, result) {
				console.log('- %s', error);
				if (error) callback(error)
				else callback(null, result)
			});
		}
	});
};

/**
 * processes information to get clustered and significant location.
 *
 * @param {function} callback function
 * @return {Collection} the entire collection for app usage.
 * @api public
 */
AppUsageHandler.prototype.findClusteredLocationForUser = function (_userId, _duration, _endDuration, clusterLevel, callback) {
	var packagesToIgnore = config.ignore_packages;

	this.getCollection(function (error, appcollection) {
		if (error) callback(error)
		else {


			var map = function () {
					emit(this.geohashZ3,  this.active_time)
				};
			var reduce = function (key, values) {
					return Array.sum(values);
				};
			appcollection.mapReduce(map, reduce, {
				out: {
					inline: 1
				},
				query: {
					user_id: _userId,
					package_name: {
						$nin: packagesToIgnore
					},
					start_time: {
						$gt: _duration
					},
					end_time: {
						$lt: _endDuration
					},
					geohash: {
						$exists: true
					}

				}
			}, function (error, result) {
				console.log('- %s', error);
				if (error) callback(error)
				else callback(null, result)
			});
		}
	});
};

/**
 * fetches a collection of app usage for a particular usage for a particular duration.
 *
 * @param {function} callback function
 * @return {Collection} the entire collection for app usage.
 * @api public
 */
AppUsageHandler.prototype.findClusteredLocationForUserDuringHours = function (_userId, _duration, _endDuration, startHour, timespan, clusterLevel, callback) {
	var packagesToIgnore = config.ignore_packages;

	this.getCollection(function (error, appcollection) {
		if (error) callback(error)
		else {


			var map = function () {
					emit(this.geohashZ3, {count:1,time:this.active_time,start_minute_day:this.start_minute_day})
				};
			var reduce = function (key, values) {
			
					var reducedVal = { count: 0, time: 0, start_minute_day:0 };

                     for (var idx = 0; idx < values.length; idx++) {
                         reducedVal.count += values[idx].count;
                         reducedVal.time += values[idx].time;
                         reducedVal.start_minute_day += values[idx].start_minute_day;
                     }

                     reducedVal.avg = reducedVal.start_minute_day/reducedVal.count;  
                     return reducedVal;
                     
				
					return Array.sum(values);
				};
			appcollection.mapReduce(map, reduce, {
				out: {
					inline: 1
				},
				query: {
					user_id: _userId,
					package_name: {
						$nin: packagesToIgnore
					},
					start_time: {
						$gt: _duration
					},
					end_time: {
						$lt: _endDuration
					},
					geohash: {
						$exists: true
					},
					start_minute_day: {
						$gte: startHour
					},
					start_minute_day: {
						$lt: startHour + timespan
					}

				}
			}, function (error, result) {
				console.log('- %s', error);
				if (error) callback(error)
				else callback(null, result)
			});
		}
	});
};


/**
 * Updates the app information for the user.
 *
 * @param {String} userId
 * @param {String} geohash level 3
 * @param {String} Tag information
 * @param {function} callback function
 * @api public
 */
AppUsageHandler.prototype.tagAppDataForUser = function(_user_id, geohash, tag, callback) {
	this.getCollection(function(error, appCollection) {
		if (error) callback(error)
		else {
			var strObj = new String(_user_id);
			appCollection.update({
				user_id: ObjectID.createFromHexString(strObj),
				geohashZ3 : geohash
			}, {$set :{"loc_tag":[tag]}},{multi:true}, function(error, result) {
			
				if (error) callback(error)
				else callback(null, result)
			});
		}

	});
};


/**
 * Updates the app information for all users.
 *
 * @param {String} geohash level 2
 * @param {String} Tag information
 * @param {function} callback function
 * @api public
 */
AppUsageHandler.prototype.tagAppDataForAll = function(geohash, tag, callback) {
	this.getCollection(function(error, appCollection) {
		if (error) callback(error)
		else {
			appCollection.update({
				geohashZ2 : geohash
			}, {$set :{"generic_loc_tag":[tag]}},{multi:true}, function(error, result) {
				if (error) callback(error)
				else callback(null, result)
			});
		}

	});
};

/**
 * Fetches the data information for a particular user.
 *
 * @param {String} userId
 * @param {String} Tag information
 * @param {function} callback function
 * @api public
 */
AppUsageHandler.prototype.dataForUserLocTag = function(_user_id, tag, callback) {
	
	var packagesToIgnore = config.weka_ignore_packages;
	var strObj = new String(_user_id);	
	this.getCollection(function (error, appcollection) {
		if (error) callback(error)
		else {
			appcollection.find({
				user_id: ObjectID.createFromHexString(strObj),
				loc_tag :  { $in: [tag]},
				package_name: {
					$nin: packagesToIgnore
				}
			}).toArray(function (error_correction, results) {
				if (error_correction) callback(error_correction)
				else callback(null, results)
			});
		}
	});
	
};

/**
 * fetches a possible cluster of locations.
 *
 * @param {function} callback function
 * @return {Collection} the entire collection for app usage.
 * @api public
 */
AppUsageHandler.prototype.findPossibleLocationClusters = function (callback) {
	var packagesToIgnore = config.ignore_packages;

	this.getCollection(function (error, appcollection) {
		if (error) callback(error)
		else {


			var map = function () {
					emit(this.geohashZ2, {count:1}) //,time:this.active_time,start_minute_day:this.start_minute_day
				};
			var reduce = function (key, values) {
			
					var reducedVal = { count: 0}; //, time: 0, start_minute_day:0 

                     for (var idx = 0; idx < values.length; idx++) {
                         reducedVal.count += values[idx].count;
/*
                         reducedVal.time += values[idx].time;
                         reducedVal.start_minute_day += values[idx].start_minute_day;
*/
                     }

//                     reducedVal.avg = reducedVal.start_minute_day/reducedVal.count;  
                     return reducedVal;
				};
			appcollection.mapReduce(map, reduce, {
				out: {
					inline: 1
				},
				query: {

					package_name: {
						$nin: packagesToIgnore
					},
					loc_tag: {$exists:false}

				}
			}, function (error, result) {
				console.log('- %s', error);
				if (error) callback(error)
				else callback(null, result)
			});
		}
	});
};

/**
 * Fetches the data information for all the generic_loc_tag available data.
 *
 * @param {function} callback function
 * @api public
 */
AppUsageHandler.prototype.getAppDataForTaggedRecords = function(callback) {
	
	var packagesToIgnore = config.weka_ignore_packages;
	this.getCollection(function (error, appcollection) {
		if (error) callback(error)
		else {
			appcollection.find({
				generic_loc_tag :  { $exists:true},
				package_name: {
					$nin: packagesToIgnore
				}
			}).toArray(function (error_correction, results) {
				if (error_correction) callback(error_correction)
				else callback(null, results)
			});
		}
	});
	
};

exports.AppInfoHandler = AppInfoHandler;
exports.AppUsageHandler = AppUsageHandler;
exports.GeoTagHandler = GeoTagHandler;