
/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', { title: 'Express' });
};

exports.eula = function(req, res){
  res.render('eula', { title: 'WebSense Android App: EULA/Concent' });
};