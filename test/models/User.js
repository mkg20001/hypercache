const mongoose = global.mongoose

const UserSchema = mongoose.Schema({
  name: String,
  id: String
})

module.exports = mongoose.model('User', UserSchema)
