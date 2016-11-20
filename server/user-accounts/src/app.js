var http = require('http');
var express = require('express');
var bodyParser = require('body-parser');
var mongodb = require('mongodb');

var DATABASE_URL = 'mongodb://localhost:27017/berkeley-scheduler';
var USERS_COLLECTION = 'users';


mongodb.MongoClient.connect(DATABASE_URL, function(err, db) {
  if (err) {
    console.error('Unable to connect to the mongoDB server: ', err)
  } else {
    console.log('Connection established.');

    var users = db.collection(USERS_COLLECTION);

    var app = express();
    app.set('port', process.env.port || 8085);
    app.use(bodyParser.urlencoded({ extended: true }));

    app.post('/users', function (req, res) {
      var object = req.body;

      if (!object.first_name || !object.email) {
        res.sendStatus(400).send('Did not send first name and email.');
      } else {
        users.insertOne({
          created_at: new Date(),
          fist_name: object.first_name,
          last_name: object.last_name,
          email: object.email
        }).then(function() {
          res.sendStatus(200);
        }, function(err) {
          res.sendStatus(500).send('Could not create new user: err');
        })
      }
    });

    http.createServer(app).listen(app.get('port'), function() {
      console.log('Server listening on port ', app.get('port'));
    });
  }
});

