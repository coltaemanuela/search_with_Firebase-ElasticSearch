//===============Modules=============================

var express = require('express');
firebase = require('firebase');
var bodyParser = require('body-parser');
var session = require('express-session');
var paginate = require('express-paginate');
var path = require('path');
var gcloud = require('google-cloud');
var ElasticSearch = require('elasticsearch');

var admin = require("firebase-admin"); //used for ServiceAccount's substitution with Firebase Admin

var app = express();

//-------------------------------------Files----------------------------------------------------------------------------
var api = require('./api');

var escutils = require('./escutils');
var  PathMonitor = require('./lib/PathMonitor');
var SearchQueue = require('./lib/SearchQueue');


//-------------------------------- View engine setup---------------------------------------------------------------------

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

//------------------------------- Firebase initializtion -----------------------------------------------------------------

var config = {
   apiKey: "***",
   authDomain: "*your-project-id-here*.firebaseapp.com",
   databaseURL: "https://*your-project-id*.firebaseio.com",
   storageBucket: "***.appspot.com",
   messagingSenderId: "**",
   privateKey: "-----BEGIN PRIVATE KEY-----\n*****\n-----END PRIVATE KEY-----\n"
 
};
//set the session, the active interval
app.use(session({
    secret: "H***h",
    resave:true,
    saveUninitialized:true,
    cookie:{},
    duration: 45 * 60 * 1000,
    activeDuration: 15 * 60 * 1000
}));

firebase.initializeApp(config);

//---------------------------------------------------ElasticSearch Initialization ---------------------------------------
//create a new client
var esc = escutils.elasticSearchClient = new ElasticSearch.Client({
    hosts: [
        escutils.serverOptions //use the options already described in escutils.js and exported
    ]
});

//verify the connection
console.log('Connected to ElasticSearch host:'+ escutils.serverOptions.host +",on port: " + escutils.serverOptions.port);

PathMonitor.process(esc, escutils.paths, escutils.FB_PATH);
SearchQueue.init(esc, escutils.FB_REQ, escutils.FB_RES, escutils.CLEANUP_INTERVAL);

//-------------------------------------------------------------------------------------------------------------------------

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/api/search', api); //route prefix


//-------------------------------------Create the Server----------------------------------------------------------------------

app.listen(3000, function () {
  console.log('Example app listening on port 3000');
});
