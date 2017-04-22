var fs = require('fs');
var http = require('http');
var https = require('https');
var path = require('path');

var express = require('express');
var bodyParser = require('body-parser');
var mongodb = require('mongodb');
var morgan = require('morgan');

var DATABASE_URL = 'mongodb://localhost:27017/berkeley-scheduler';
var USER_EMAILS_COLLECTION = 'user-emails';
var CREDENTIALS_DIR = path.posix.join(__dirname, '..', '..', '.credentials');


var app = express();

// Configuration
app.set('httpPort', process.env.HTTP_PORT || 10080);
app.set('httpsPort', process.env.HTTPS_PORT || 10443);

app.use(morgan('dev'));
app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', 'https://berkeleyscheduler.com');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

mongodb.MongoClient.connect(DATABASE_URL, function(err, db) {
  if (err) {
    console.error('Unable to connect to the mongoDB server: ', err)
  } else {
    console.log('Connection established.');

    var userEmails = db.collection(USER_EMAILS_COLLECTION);

    app.get('/ping', function(req, res) {
      res.send('Hello World!');
    });

    app.post('/users', function (req, res) {
      var object = req.body;

      if (!object.email) {
        res.status(400).send('Did not send email.');
      } else {
        userEmails.insertOne({
          created_at: new Date(),
          fist_name: object.firstName,
          last_name: object.lastName,
          email: object.email
        }).then(function() {
          res.status(200).send('Email added');
        }, function(err) {
          res.status(500).send('Could not create new user: err');
        })
      }
    });

    // Servers
    http.createServer(app).listen(app.get('httpPort'), function() {
      console.log('HTTP Server listening on port ', app.get('httpPort'));
    });

    const pemDir = path.posix.join(CREDENTIALS_DIR, 'api.berkeleyscheduler.com');
    https.createServer({
      key: fs.readFileSync(path.posix.join(pemDir, 'key.pem')),
      cert: fs.readFileSync(path.posix.join(pemDir, 'cert.pem'))
    }, app).listen(app.get('httpsPort'), function() {
      console.log('HTTPS Server listening on port ', app.get('httpsPort'));
    });
  }
});

