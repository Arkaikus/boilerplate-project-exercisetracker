const bp = require('body-parser');
const cors = require('cors')
const express = require('express')
const mongoose = require('mongoose');
require('dotenv').config()

// Basic Configuration
const app = express()
app.use(bp.urlencoded());
app.use(bp.json());
app.use(cors())
app.use(express.static('public'))

// DB
// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/app', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

const exerciseSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
});

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  log: [exerciseSchema], // Array to store exercise logs
  count: {
    type: Number,
    default: 0
  }
});

const User = mongoose.model('User', userSchema);

// Routes
app.get('/', (req, res) => { res.sendFile(__dirname + '/views/index.html') });
app.get("/api/users", (req, res) => {
  /* returns a list of users*/
  User.find({})
    .then(users => res.json(users))
    .catch(err => res.status(500).json({ error: "Error fetching users." }));
});
app.post("/api/users", (req, res) => {
  /* creates an user from 'username' returns {'_id':, 'username'}*/
  const username = req.body.username;
  const newUser = new User({ username });
  newUser.save()
    .then(user => res.json({ _id: user._id, username: user.username }))
    .catch(err => res.status(500).json({ error: "Error creating user." }));
});
app.post("/api/users/:_id/exercises", (req, res) => {
  /*creates a user exercise from 'description','duration','date'?now*/
  const userId = req.params._id;
  const { description, duration, date } = req.body;
  const exercise = { date: date || (new Date()).toDateString(), duration: parseInt(duration), description };
  User.findById(userId)
    .then(user => {
      if (!user) { throw new Error("User not found."); }
      user.log.push(exercise);
      user.count = user.log.length;
      return user.save();
    })
    .then(user => res.json({ _id: user._id, username: user.username, ...exercise }))
    .catch(err => res.status(500).json({ error: "Error creating exercise." }));
});
app.get("/api/users/:_id/logs", (req, res) => {/**
  * returns a user's exercise log from 'from' and 'to' date or 'limit' entries */
  const userId = req.params._id;
  const { from, to, limit } = req.query;

  User.findById(userId)
    .then(user => {
      if (!user) { throw new Error("User not found."); }

      let logs = user.log;

      // Filter logs based on 'from' and 'to' dates if provided
      if (from && to) {
        logs = logs.filter(log => log.date >= new Date(from) && log.date <= new Date(to));
      }

      // Limit the number of logs if 'limit' is provided
      if (limit) { logs = logs.slice(0, parseInt(limit)); }

      res.json({
        _id: user._id,
        username: user.username,
        count: logs.length,
        log: logs.map(log => ({ description: log.description, duration: log.duration, date: log.date.toDateString() }))
      });
    })
    .catch(err => res.status(500).json({ error: "Error fetching user logs." }));
});



const listener = app.listen(8000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
