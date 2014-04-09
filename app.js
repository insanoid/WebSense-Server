/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');

var app = express();


var user = require('./controllers/UserController');
var appController  = require('./controllers/AppDataController');
var web  = require('./controllers/WebDataController');

// all environments
app.set('port', process.env.PORT || 3001);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.post('/user/create', user.create);
app.post('/user/authenticate', user.authenticate);

app.get('/app/trends/:duration', appController.trends);
app.get('/app/nearby/:duration', appController.nearby);
app.post('/app/update', appController.pushAppInfo);

app.get('/web/trends/:duration', web.trends);
app.get('/web/nearby/:duration', web.trends);


//Remove.
app.post('/upload/app_data',appController.pushInfofunction);

http.createServer(app).listen(app.get('port'), function(){
  console.log('WebSense Server Running: ' + app.get('port'));
});