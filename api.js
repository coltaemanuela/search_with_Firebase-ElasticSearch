var express = require('express');
var escutils = require('./escutils');
var firebase = require('firebase');
var SearchQueue = require('./lib/SearchQueue'); 
var DynamicPathMonitor = require('./lib/DynamicPathMonitor');
var PathMonitor = require('./lib/PathMonitor');
var router = express.Router();

//----------------------------------------------------------------------------------------------

// middleware that is specific to this router
router.use(function timeLog(req, res, next) {
    console.log('Time: ', Date.now(), ',Request: ', req.baseUrl);
    req.requestTime = Date.now();
    next();
});

// define the home page route
router.get('/', function(req, res) {

    var responseText = 'You are at: ' + req.baseUrl + '<br>';
    responseText += '<small>Requested at: ' + req.requestTime + '</small>';
    res.send(responseText);
});

//----------------------------Search users by email --------------------------------------------------

router.get('/index/users/email/:email', function(req, res) {
    var searchedEmail = req.params.email;
    escutils.elasticSearchClient.search({
        q: `${searchedEmail}`, //query user's email
        index: "indeex",
        type: "user"
    }, function(err, data) {
        if (err) {
            return res.status(400).json({
                error: err
            });
        }
        res.json(data);
    });
});

//----------------------------Search users by username -------------------------------------------------

router.get('/index/users/username/:username', function(req, res) {
    var username = req.params.username;
    escutils.elasticSearchClient.search({
        q: `*${username}*`, //use ** chars to complete search
        index: "index",
        type: "user"
     }, function(err, data) {
        if (err) {
            return res.status(400).json({
                error: err
            });
        }
        res.json(data);
    });
});


module.exports = router;