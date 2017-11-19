var SearchQueue   = require('./SearchQueue');
var DynamicPathMonitor = require('./DynamicPathMonitor');
var findValue = require("find-value");
var objUnflatten = require("obj-unflatten");
require('colors');

function PathMonitor(esc, path) {

   this.ref = SearchQueue.fbRef(path.path);

   console.log('Indexing %s/%s using path "%s"'.grey, path.index, path.type, SearchQueue.pathName(this.ref));

   this.esc = esc;


//------------------------ Define the followings as indexes, types -----------------------------------------

   this.index = path.index;
   this.type  = path.type;
   this.filter = path.filter || function() { return true; };
   this.parse  = path.parser || function(data) { return parseKeys(data, path.fields, path.omit); };

   this._init();
}

PathMonitor.prototype = {

   _init: function() {
      this.addMonitor = this.ref.on('child_added', this._process.bind(this, this._childAdded));
      this.changeMonitor = this.ref.on('child_changed', this._process.bind(this, this._childChanged));
      this.removeMonitor = this.ref.on('child_removed', this._process.bind(this, this._childRemoved));
   },

   _stop: function() {
      this.ref.off('child_added', this.addMonitor);
      this.ref.off('child_changed', this.changeMonitor);
      this.ref.off('child_removed', this.removeMonitor);
   },

   _process: function(fn, snap) {
      var dat = snap.val();
      if( this.filter(dat) ) {
         fn.call(this, snap.key, this.parse(dat));
      }
   },
//------------------------------- create index in esc -------------------------------------------

   _index: function (key, data, callback) {
     this.esc.index({
         index: this.index,
         type: this.type,
         id: key,
         body: data
    }, function (error, response) {
         if (callback) {
           callback(error, response);
         }
    }.bind(this));
  },

//------------------ whenever a child is added in collection, index it ----------------------------

   _childAdded: function(key, data) {
      var name = nameFor(this, key);
      this._index(key, data, function (error, response) {
        if (error) {
          console.error('failed to index %s: %s'.red, name, error);
        } else {
          console.log('indexed'.green, name);
        }
      }.bind(this));
   },

//----------------- when editing the record, index the changed one ----------------------------

   _childChanged: function(key, data) {
      var name = nameFor(this, key);     
      this._index(key, data, function (error, response) {
        if (error) {
          console.error('failed to update %s: %s'.red, name, error);
        } else {
          console.log('updated'.green, name);
        }
      }.bind(this));
   },

//-----------------------when deleting the record, drop the index--------------------------------

   _childRemoved: function(key, data) {
      var name = nameFor(this, key);

      this.esc.delete({

        index: this.index,
        type: this.type,
        id: key

      }, function(error, data) {
         if( error ) {
            console.error('failed to delete %s: %s'.red, name, error);
         }
         else {
            console.log('deleted'.cyan, name);
         }
      }.bind(this));
   }
};
//-------------------------------------------------------------------------------------------------------
function nameFor(path, key) {
   return  path.index + '/' + path.type + '/' + key;
}

function parseKeys(data, fields, omit) {
  if (!data || typeof(data)!=='object') {
    return data;
  }
  var out = data;

  // restrict to specified fields list
  if( Array.isArray(fields) && fields.length) {
    out = {};
    fields.forEach(function(f) {
       //use find-value module
        let newValue = findValue(data, f);
      if(newValue !== undefined) {
        out[f] = newValue;
      }
    });
  }

   // remove omitted fields
  if( Array.isArray(omit) && omit.length) {
    omit.forEach(function(f) {
      if( out.hasOwnProperty(f) ) {
        delete out[f];
      }
    });
  }
  //show subcollection just as it is in firebase, using obj-unflatten module
  out = objUnflatten(out);
  return out;
}

function process(esc, paths, dynamicPathUrl) {
   paths && paths.forEach(function(pathProps) {
      new PathMonitor(esc, pathProps);
   });
   if (dynamicPathUrl) {
      new DynamicPathMonitor(SearchQueue.fbRef(dynamicPathUrl), function(pathProps) {
        return new PathMonitor(esc, pathProps);
      });
   }
}

exports.process= process;
