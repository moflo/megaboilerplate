'use strict';

var _ = require('lodash');
var fs = require('fs-extra');
var shortid = require('shortid');
var archiver = require('archiver');
var jsonfile = require('jsonfile');
var del = require('del');
var mkdirp = require('mkdirp');
var commentParser = require('comment-parser');
var Promise = require('bluebird');
var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var webpack = require('webpack');
var config = require('./webpack.config.dev');

var copy = Promise.promisify(fs.copy);
var readJson = Promise.promisify(fs.readJson);
var writeJson = Promise.promisify(fs.writeJson);

var app = express();
var compiler = webpack(config);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'assets')));
app.use(express.static(path.join(__dirname, 'modules')));

app.use(require('webpack-dev-middleware')(compiler, {
  noInfo: true,
  publicPath: config.output.publicPath
}));
app.use(require('webpack-hot-middleware')(compiler));


app.post('/download', (req, res) => {

  prepare().then((uid) => {
    let framework = req.body.framework;
    let appName = req.body.appName;
    generateFramework(framework, appName, uid).then(() => {

    });
  });

});

app.get('*', function(req, res) {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(3000, 'localhost', function(err) {
  if (err) {
    console.log(err);
    return;
  }

  console.log('Listening at http://localhost:3000');
});

function generateFramework(framework, appName, uid) {
  return new Promise((resolve, reject) => {
    let dest = path.join(__dirname, 'build', uid);

    switch (framework) {
      case 'express':
        let src = path.join(__dirname, 'modules', 'express');

        copy(src, dest).then(() => {
          let packageJson = path.join(dest, 'package.json');
          readJson(packageJson).then((packageObj) => {
            packageObj.name = appName;
            writeJson(packageJson, packageObj, { spaces: 2 }).then(() => {
              console.log('done');
            });
          });
        });
        break;
      case 'hapi':
        break;
      case 'sails':
        break;
      default:
        reject('Unsupported Framework');
    }
  });
}

function generateTemplateEngine(params) {
  return new Promise(function(resolve, reject) {
    switch (params.templateEngine) {
      case 'jade':
        if (params.framework === 'express') {
          fs.readFile(__dirname + '/modules/express/app.js', function (err, data) {
            if (err) throw err;
            console.log(data);
          });
          // open app.js
          // parse comments
          // open template-engine/jade
          var parsed = commentParser.parse(data);
          console.log(parsed);
        }
        break;
      case 'handlebars':
        break;
      case 'swig':
        break;
      case 'none':
        break;
      default:
        reject('Unsupported template engine');
    }
  });
}

function generateZip(req, res) {
  return new Promise(function(resolve, reject) {
    var archive = archiver('zip');

    archive.on('error', function(err) {
      res.status(500).send(err.message);
    });

    res.on('close', function() {
      console.log('closing...')
      console.log('Archive wrote %d bytes', archive.pointer());
      return res.status(200).send('OK').end();
    });

    res.attachment('megaboilerplate-express.zip');

    archive.pipe(res);

    var files = [
      __dirname + '/modules/express/app.js',
      __dirname + '/modules/express/package.json'
    ];

    for (var i in files) {
      archive.append(fs.createReadStream(files[i]), { name: path.basename(files[i]) });
    }

    archive.finalize();
  });
}

function cleanup() {
  del(['build/**/*']);
}

function prepare() {
  return new Promise((resolve, reject) => {
    let uid = shortid.generate();
    let location = path.join(__dirname, 'build', uid);
    mkdirp(location, (err) => {
      if (err) { reject(err); }
      else { resolve(uid); }
    });
  });
}