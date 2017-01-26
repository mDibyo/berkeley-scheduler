var fs = require('fs');
var http = require('http');
var https = require('https');
var path = require('path');

var express = require('express');
var bodyParser = require('body-parser');
var mongodb = require('mongodb');
var morgan = require('morgan');

var CREDENTIALS_DIR = path.posix.join(__dirname, '..', '..', '.credentials');

var DATABASE_URL = 'mongodb://localhost:27017/berkeley-scheduler';
var USERS_COLLECTION = 'users';

mongodb.MongoClient.connect(DATABASE_URL)
    .then(function(db) {
      console.log('Connection established.');

      var users = db.collection(USERS_COLLECTION);

      var app = express();

      // Configuration
      app.set('httpPort', process.env.HTTP_PORT || 80);
      app.set('httpsPort', process.env.HTTPS_PORT || 443);

      // Middleware
      app.use(morgan('dev'));
      app.use(bodyParser.urlencoded({ extended: true }));
      app.use(bodyParser.json());

      // Routes
      app.get('/ping', function(req, res) {
        res.send('Hello World!');
      });
      app.post('/users', function (req, res) {
        var object = req.body;

        if (!object.email) {
          res.sendStatus(400).send('Did not send first name and email.');
        } else {
          users.insertOne({
            created_at: new Date(),
            fist_name: object.firstName,
            last_name: object.lastName,
            email: object.email
          }).then(function() {
            res.sendStatus(200);
          }, function(err) {
            res.sendStatus(500).send('Could not create new user: ', err);
          })
        }
      });

      http.createServer(app).listen(app.get('httpPort'), function() {
        console.log('HTTP Server listening on port ', app.get('httpPort'));
      });

      var pemDir = path.posix.join(CREDENTIALS_DIR, 'api.berkeleyscheduler.com');
      https.createServer({
        key: fs.readFileSync(path.posix.join(pemDir, 'key.pem')),
        cert: fs.readFileSync(path.posix.join(pemDir, 'cert.pem'))
      }, app).listen(app.get('httpsPort'), function() {
        console.log('HTTPS Server listening on port ', app.get('httpsPort'));
      });
    })
    .catch(function(err) {
      console.error('Unable to connect to the mongoDB server: ', err);
    });

