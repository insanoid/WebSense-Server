
/*
 * GET normal HTML pages.
 */

exports.index = function(req, res){
  res.render('index', { title: 'Websense - A University of Birmingham (Network & Data Sciences Lab) Project' });
};

exports.cluster = function(req, res){
  res.render('cluster', { title: 'Websense: Cluster', email:req.param('email')});
};

exports.heatmap = function(req, res){
  res.render('heatmap', { title: 'Websense: Heatmap', email:req.param('email')});
};

exports.geocluster = function(req, res){
  res.render('geocluster', { title: 'Websense: Geo-Cluster Algorithm', email:req.param('email')});
};


exports.userprocess = function(req, res){
  res.render('userprocess', { title: 'Websense: user Process'});
};

exports.userdual = function(req, res){
  res.render('userdual', { title: 'Websense: L1/L2'});
};

exports.usertag = function(req, res){
  res.render('process_user_appInfo', { title: 'Websense: Tag'});
};



exports.eula = function(req, res){
  res.render('eula', { title: 'WebSense Android App: EULA/Concent' });
};