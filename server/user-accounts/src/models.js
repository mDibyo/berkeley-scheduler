var mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');

var DATABASE_URL = 'mongodb://localhost:27017/berkeley-scheduler';
mongoose.connect(DATABASE_URL);

var userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  name: {
    first: {
      type: String
    },
    last: {
      type: String
    }
  },
  email: {
    type: String,
    required: true
  }
}, {
  collection: 'users',
  timestamps: true
});
userSchema.plugin(uniqueValidator);
var User = mongoose.model('User', userSchema);


module.exports = {
  User: User
};
