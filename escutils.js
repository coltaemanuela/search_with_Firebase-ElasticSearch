exports.FB_URL   = 'https://****.firebaseio.com';
exports.FB_REQ   = process.env.FB_REQ || 'search/request';
exports.FB_RES   = process.env.FB_RES || 'search/response';
exports.FB_SERVICEACCOUNT = "**your-service-account-here**.json";
exports.API_KEY = "**your api key here**";

//--------------------------ElasticSearch Settings --------------------------------------
   var serverOptions = {
      host: 'localhost',
      port: 9200,
      log: 'trace'
   };
   exports.serverOptions= serverOptions;
//----------------------------Declaring the paths and the included attributes ------------------------------------------------------------
var paths = [
   {
      path:  "users",
      index: "index",         
      type:  "user",
      _source : {
            "include": ["friends", "profile.username","profile.firstname"],
            "exclude": [ "favorite"]
            },
      fields: [ "profile.firstname",  "profile.username",],
      properties: {"analyzer": "keyword"},
   }, 
   {
      path:  "users",
      index: "indeex",
      type:  "user",
      _source : {
            "include": ["friends",],
            "exclude": [ "favorite" ]
            },
      fields: ["profile.email"],
      properties: {"analyzer": "keyword"},   
   },

];

exports.paths=paths;

// load the path
var FB_PATH = process.env.FB_PATHS || null;
exports.FB_PATH= FB_PATH;
//set here how often should the script remove unclaimed results
exports.CLEANUP_INTERVAL =
   process.env.NODE_ENV === 'production'?  3600*1000 : 60*1000 ;    //if it's in production, set the interval to 3 minutes. Otherwise, to one minute


