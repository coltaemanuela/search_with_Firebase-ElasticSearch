var Firebase = require('firebase');


fbRef= function (path) {
   return Firebase.database().ref().child(path);
};


pathName = function(ref) {
   var p = ref.parent.key;
   return (p? p+'/' : '')+ref.key;
};

exports.fbRef= fbRef;
exports.pathName = pathName;

//-------------------------------------- SearchQueue Constuctor ---------------------------------------------------------------

function SearchQueue(esc, reqRef, resRef, cleanupInterval) {
   
   this.esc = esc;
   this.inRef = reqRef;
   this.outRef = resRef;
   this.cleanupInterval = cleanupInterval;
   
   console.log('Queue started, IN: "%s", OUT: "%s"'.grey, pathName(this.inRef), pathName(this.outRef));
   
   setTimeout(function() {
      this.inRef.on('child_added', this._process, this);
   }.bind(this), 1000);
   this._nextInterval();
}

//-------------------------------------------------------------------------------------------------------------------------------

SearchQueue.prototype = {
  
 //module.exports.myESsearchFunction=
 _process: function(snap) {
                  var dat = snap.val();
                  var key = snap.key;
     if (this._assertValidSearch(key, dat)) {

  
   // ---------Perform (a very simple) ElasticSearch query --------------------------------------------  
     this.esc.search({
      
            index: dat.index,
            q: dat.query // Query in the Lucene query string syntax
           //var q1 = {"query":{"match":{"_all":q}}};
            
      }, function(error, response) {
        if (error) {
          this._reply(key, {error: error, total: 0});
        } else {
          this._reply(key, response);
        }
      }.bind(this));
    }
  },

   _reply: function(key, results) {
      if( results.error ) {
         this._replyError(key, results.error);
      }
      else {
         console.log('result %s: %d hits'.yellow, key, results.hits.total);
         this._send(key, results.hits);
      }
   },

//------------------------ validation condition for search --------------------------------------------

   _assertValidSearch: function(key, props) {
      var res = true;
      if( typeof(props) !== 'object' || !props.index || !props.type || !props.query ) {
         this._replyError(key, 'search request must be a valid object with keys index, type, and query');
      }
      return res;
   },
//---------------------------- send error --------------------------------------------------------------
   _replyError: function(key, err) {
      this._send(key, { total: 0, error: err });
   },

   _send: function(key, data) {
      this.inRef.child(key).remove(this._abortOnWriteError.bind(this));
      this.outRef.child(key).setWithPriority(data, new Date().valueOf());
   },

   _abortOnWriteError: function(err) {
      if( err ) {
         console.log((err+'').red);
         throw new Error('Unable to remove queue item, probably a security error? '+err);
      }
   },
//-------------------------- remove all responses which are older than CHECK_INTERVAL--------------------------------------

   _housekeeping: function() {
      var self = this;
      // remove all responses which are older than CHECK_INTERVAL
      this.outRef.endAt(new Date().valueOf() - self.cleanupInterval).once('value', function(snap) {
        //get their number 
         var count = snap.numChildren();
        //if there is one, remove it
         if( count ) {
            console.warn('housekeeping: found %d orphans (removing them now) %s'.red, count, new Date());
            snap.forEach(function(ss) { ss.ref.remove(); });
         }
         self._nextInterval();
      });
   },

   _nextInterval: function() {
      var interval = this.cleanupInterval > 60000? 'minutes' : 'seconds';
      console.log('Next cleanup in %d %s'.grey, Math.round(this.cleanupInterval/(interval==='seconds'? 1000 : 60000)), interval);
      setTimeout(this._housekeeping.bind(this), this.cleanupInterval);
   },

   _isJson: function(str) {
       try {
           JSON.parse(str);
       } catch (e) {
           return false;
       }
       return true;
   }
};

//---------------------------------------------- initiate search ---------------------------------------------------------

function init(esc, reqPath, resPath, matchWholeWords, cleanupInterval) {
   new SearchQueue(esc, fbRef(reqPath), fbRef(resPath), matchWholeWords, cleanupInterval);
};


exports.SearchQueue= SearchQueue;
exports.init = init;