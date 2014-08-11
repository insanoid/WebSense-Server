/**
 * Module dependencies.
 */
var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');
var config = require('./local.config');
var app = express();
var user = require('./controllers/UserController');
var contextInfo = require('./controllers/ContextController');
var appController = require('./controllers/AppDataController');
var web = require('./controllers/WebDataController');
var mongoadapter = require('./model/MongoConnector');


var databaseconnection = new mongoadapter.DatabaseAccessObject();
databaseconnection.connect(config.mongo.host, config.mongo.port, function(_dbConn) {

	user.initDBConnection(_dbConn);
	appController.initDBConnection(_dbConn);
	web.initDBConnection(_dbConn);
	contextInfo.initDBConnection(_dbConn);

});


// all environments
app.set('port', process.env.PORT || 21129);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json({limit: '500mb'}));
app.use(express.urlencoded({limit: '500mb'}));
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
	app.use(express.errorHandler());
}
app.get('/', routes.index);
app.get('/eula', routes.eula);
app.post('/user/create', user.create);
app.post('/user/authenticate', user.authenticate);

app.get('/app/trends/:duration', appController.trends);
app.get('/app/nearby/:duration', appController.nearby);

app.get('/app/userrecords', appController.getUserAnalytics);
app.get('/app/stats', appController.getUsageAnalytics);

app.get('/context/userrecords', contextInfo.getUserAnalytics);
app.get('/context/stats', contextInfo.getUsageAnalytics);

app.post('/app/update', appController.pushAppInfo);
app.get('/web/trends/:duration', web.trends);
app.get('/web/nearby/:duration', web.nearby);

app.post('/context/update', contextInfo.pushContextInfo);
app.get('/users', user.findAll);
//private
app.get('/app/scrape/:appId', appController.getAppInfo);
http.createServer(app).listen(app.get('port'), function() {
	console.log('WebSense Server Running: ' + app.get('port'));
});
