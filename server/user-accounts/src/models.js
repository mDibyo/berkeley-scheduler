const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');


mongoose.Promise = global.Promise;

const DATABASE_URL = 'mongodb://localhost:27017/berkeley-scheduler';
mongoose.connect(DATABASE_URL);

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  name: {
    first: String,
    last: String
  },
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  }
}, {
  collection: 'users',
  timestamps: true
});
userSchema.plugin(uniqueValidator);

module.exports = {
  User: mongoose.model('User', userSchema)
};
