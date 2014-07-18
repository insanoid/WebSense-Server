
/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', { title: 'Websense - A University of Birmingham (Network & Data Sciences Lab) Project' });
};

exports.eula = function(req, res){
  res.render('eula', { title: 'WebSense Android App: EULA/Concent' });
};