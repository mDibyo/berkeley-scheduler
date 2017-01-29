const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongodb = require('mongodb');
const morgan = require('morgan');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const models = require('./models');

const CREDENTIALS_DIR = path.posix.join(__dirname, '..', '..', '.credentials');


const app = express();

// Configuration
app.set('httpPort', process.env.HTTP_PORT || 10080);
app.set('httpsPort', process.env.HTTPS_PORT || 10443);

// Passport
passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, (email, password, done) => {
  models.User.findOne({email}, (err, user) => {
    if (err) {
      return done(err);
    }

    if (!user) {
      return done(null, false, {message: 'Unknown user'});
    }

    if (user.password !== password) {
      return done(null, false, { message: 'Invalid password'})
    }

    return done(null, user);
  });
}));

// Middleware
app.use(morgan('dev'));
app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', 'https://berkeleyscheduler.com');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(passport.initialize());

// Routes
app.get('/ping', function(req, res) {
  res.send('Hello World!');
});
app.post('/users', function (req, res) {
  const object = req.body;

  if (!object.email) {
    res.status(400).send('Did not send email.');
  } else if (!object.userId) {
    res.status(400).send('Did not send user id.')
  } else if (!object.password) {
    res.status(400).send('Did not send password.')
  } else {
    const user = models.User({
      userId: object.userId,
      name: {
        first: object.firstName,
        last: object.lastName
      },
      email: object.email,
      password: object.password
    });
    user.save().then(function() {
      res.status(200);
    }, function(err) {
      if (err) {
        res.status(500).send('Could not create new user: ' + err);
      } else {
        res.status(200).send('Created');
      }
    });
  }
});

app.get('/users', passport.authenticate('local'), (req, res) => {
  res.status(200).send(req.user.userId);
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

