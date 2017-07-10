const mongoose = global.mongoose

const UserSchema = mongoose.Schema({
  name: String,
  id: String,
  count: Number
})

module.exports = mongoose.model('User', UserSchema)
