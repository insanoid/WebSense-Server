/**
 * Module dependencies.
 */
var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');
var config = require('./local.config');
var app = express();

///	Custom controllers.
var user = require('./controllers/UserController');
var contextInfo = require('./controllers/ContextController');
var appController = require('./controllers/AppDataController');
var web = require('./controllers/WebDataController');

/// API Controller
var appAPI = require('./controllers/WebAPIController');

/// Database controller
var mongoadapter = require('./model/MongoConnector');


var databaseconnection = new mongoadapter.DatabaseAccessObject();
databaseconnection.connect(config.mongo.host, config.mongo.port, function (_dbConn) {

	user.initDBConnection(_dbConn);
	appController.initDBConnection(_dbConn);
	web.initDBConnection(_dbConn);
	contextInfo.initDBConnection(_dbConn);
	appAPI.initDBConnection(_dbConn);
});


// all environments
app.set('port', process.env.PORT || 21129);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));

app.use(express.json({
	limit: '500mb'
}));
app.use(express.urlencoded({
	limit: '500mb'
}));
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
	app.use(express.errorHandler());
}


/// Webpage routes (Simple HTML Pages)

app.get('/', routes.index);
app.get('/eula', routes.eula);

app.post('/user/create', user.create);
app.post('/user/authenticate', user.authenticate);
app.post('/user/update/:userId', user.updateUserObject);

app.get('/app/trends/:duration', appController.trends);
app.get('/app/nearby/:duration', appController.nearby);

app.get('/app/userrecords', appController.getUserAnalytics);
app.get('/app/stats', appController.getUsageAnalytics);

app.get('/context/userrecords', contextInfo.getUserAnalytics);
app.get('/context/stats', contextInfo.getUsageAnalytics);

app.post('/app/update', appController.pushAppInfo);
app.get('/web/trends/:duration', web.trends);
app.get('/web/nearby/:duration', web.nearby);

app.get('/app/userrecords/detailed', appController.getUserAppUsageData);

app.get('/cluster', routes.cluster);
app.get('/heatmap', routes.heatmap);
app.get('/geocluster', routes.geocluster);

//for office and home tagging
app.get('/userprocess', routes.userprocess);
app.get('/userdual', routes.userdual);
app.get('/user/tag', routes.usertag);

//for foursquare tagging.
app.get('/allcluster', appController.getAllClusters);
app.get('/updateClustertags', appController.updateClusterTags);

//get weka file.
app.get('/weka/user', routes.wekatag);
app.get('/user/rawdata_tags', appController.getDataSetForAllTags); 
app.get('/user/rawdata', appController.getDataSetForTag);
app.get('/data/all/tagged_data', appController.getTaggedDataSetForAll);
app.get('/data/all/apps', appController.getAllPossibleAppData);
app.get('/weka/all', appController.getDataSetForGenericTag);

app.get('/api/web/trends/time/localised/:duration/:start_time/:timespan/:lat/:lng/', appAPI.webDuringHoursAtLocation);


//API Methods
//APP information
app.get('/api/app/trends/location/:duration/:lat/:lng/', appAPI.appNearby);
app.get('/api/app/trends/time/:duration/:start_time/:timespan/', appAPI.appDuringHours);
app.get('/api/app/trends/time/localised/:duration/:start_time/:timespan/:lat/:lng/', appAPI.appDuringHoursAtLocation);


//DEBUG calls
app.get('/debug/app/update', appAPI.updateAll);
app.get('/debug/context/update', contextInfo.updateAllContext);
app.get('/debug/cluster', appController.getUserGeoCluster);
app.get('/debug/timeBasedCluster', appController.getUserGeoClusterForTimeRange);
app.get('/debug/tag/:userId/:geohash/:tag', appController.updateAppTagsForUserInRange);

//WEB information
app.get('/api/web/trends/location/:duration/:lat/:lng/', appAPI.webNearby);
app.get('/api/web/trends/time/:duration/:start_time/:timespan/', appAPI.webDuringHours);
app.get('/api/web/trends/time/localised/:duration/:start_time/:timespan/:lat/:lng/', appAPI.webDuringHoursAtLocation);


app.post('/context/update', contextInfo.pushContextInfo);
app.get('/users', user.findAll);

//private
app.get('/app/scrape/:appId', appController.getAppInfo);
http.createServer(app).listen(app.get('port'), function () {
	console.log('WebSense Server Running: ' + app.get('port'));
});