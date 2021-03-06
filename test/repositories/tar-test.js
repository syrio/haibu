/*
 * tar-test.js: Tests for Tar repository.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var assert = require('assert'),
    path = require('path'),
    eyes = require('eyes'),
    vows = require('vows'),
    helpers = require('../helpers'),
    haibu = require('../../lib/haibu');

var ipAddress = '127.0.0.1', 
    port = 9000, 
    httpApp = {
      "name": "test",
      "user": "marak", 
      "repository": {
        "type": "tar",
        "protocol": "http",
        "url": "http://c0027507.cdn1.cloudfiles.rackspacecloud.com/hellonode.tar.gz"
      },
      "scripts": {
        "start": "server.js"
      }
    },
    cloudfilesApp = {
      "name": "test",
      "user": "charlie",
      "repository": {
        "type": "tar",
        "protocol": "cloudfiles",
        "filename": "hellonode.tar.gz",
        "container": "nodejitsu-apps",
        "auth": helpers.auth
      },
      "scripts": {
        "start": "server.js"
      }
    };

// Create the vows test suite
var suite = vows.describe('haibu/repositories/tar').addBatch(helpers.requireInit());
//
// Iterate over the two remote types we wish to execute
// identical tests for.
//
[httpApp, cloudfilesApp].forEach(function (app) {
  var remoteType = (app === httpApp) ? "http" : "cloudfiles";
  var tests = {};
  
  tests["with an " + remoteType + " remote"] = {
    topic: function () {
      return haibu.repository.create(app);
    },
    "should be a valid repository": function (tar) {
      assert.equal(haibu.repository.validate(tar.app).valid, true);
      assert.isFunction(tar.init);
      assert.isFunction(tar.exists);
      assert.isFunction(tar.update);
      assert.isFunction(tar.fetchHttp);
      assert.isFunction(tar.fetchCloudfiles);
    },
    "the init() method": {
      topic: function (tar) {
        var self = this;
        tar.bootstrap(function () {
          tar.init(self.callback);
        })
      },
      "should untar to the specified location": function (err, success, files) {
        assert.isNull(err);
        assert.isArray(files);
      }
    }
  };
  
  var batch = {
    "When using haibu": {
      "an instance of the Tar repository": tests
    }
  };
  
  suite.addBatch(batch);
});

if (helpers.auth) { 
  //
  // If there is no config file, we can't run the remote tests
  //
  suite.export(module);
}
