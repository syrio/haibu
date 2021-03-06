/*
 * helpers.js: Test helpers for haibu
 *
 * (C) 2011 Nodejitsu Inc.
 * MIT LICENSE
 *
 */

var assert = require('assert'),
    exec = require('child_process').exec,
    fs = require('fs'),
    path = require('path'),
    util = require('util'),
    request = require('request'),
    haibu = require('../lib/haibu');

var helpers = exports,
    configMissing = false,
    testConfig;

function showConfigError () {
  if (!configMissing) {
    console.log("Config file config/auth.json doesn't have valid data. Skipping remote tests");
    configMissing = true;
  }
}

helpers.loadConfig = function () {
  //
  // TODO (olauzon) load all /config/*.json at once in parallel
  //
  var configFile = path.join(__dirname, '..', 'config', 'auth.json');

  try {
    var stats = fs.statSync(configFile),
        config = JSON.parse(fs.readFileSync(configFile).toString());

    if ((config.auth.username === 'test-username') ||
        (config.auth.apiKey === 'test-apiKey')) {
      return showConfigError();
    }

    testConfig = config;
    return config;
  }
  catch (ex) {
    return showConfigError();
  }
};

Object.defineProperty(helpers, 'auth', {
  get: function () {
    if (helpers.loadConfig() !== null) {
      return helpers.loadConfig().auth;
    }
  }
});

helpers.cleanAutostart = function (callback) {
  exec('rm -rf ' + path.join(haibu.config.get('directories:autostart'), '*'), callback);
};

helpers.init = function (callback) {
  helpers.cleanAutostart(function () {
    haibu.init({ env: 'development' }, function (err) {
      haibu.use(haibu.plugins.logger, {
        loggly: haibu.config.get('loggly'),
        console: {
          level: 'silly',
          silent: true
        }
      });

      return callback(err);
    });
  });
};

helpers.start = function (port, callback) {
  helpers.init(function (err) {
    haibu.drone.start({
      minUptime: 0,
      port: port,
      maxRestart: 2,
      init: false
    }, function (err, server) {
      return callback(err, server);
    });
  });
};

helpers.startHook = function (callback) {
  helpers.init(function (err) {
    haibu.drone.startHook(callback);
  });
}

helpers.requireInit = function (initialized) {
  return {
    "This test requires haibu.init": {
      topic: function () {
        helpers.init(this.callback);
      },
      "should respond with no error": function (err) {
        assert.isTrue(!err);
        if (initialized) {
          initialized();
        }
      }
    }
  };
};

helpers.requireHook = function (initialized) {
  return {
    "This test requires haibu.running.hook": {
      topic: function () {
        helpers.startHook(this.callback);
      },
      "should respond with no error": function (err, hook) {
        assert.isTrue(!err);
        if (initialized) {
          initialized();
        }
      }
    }
  }
}

helpers.requireStart = function (port, started) {
  return {
    "This test requires haibu.drone.start": {
      topic: function () {
        helpers.start(port, this.callback);
      },
      "should respond with no error": function (err, server) {
        assert.isTrue(!err);
        if (started) {
          started(server);
        }
      }
    }
  };
};

helpers.assertApp = function (message, assertFn) {
  var context = {
    topic: function (res, body) {
      var result = JSON.parse(body);
      request({ 
        uri: 'http://' + result.drone.host + ':' + result.drone.port
      }, this.callback);
    }
  };
  
  context[message] = assertFn;
  return context
}

helpers.assertTestApp = function () {
  return helpers.assertApp("should respond with 'hello, i know nodejitsu.'", function (err, res, body) {
    assert.equal(body, 'hello, i know nodejitsu.');
  });
};