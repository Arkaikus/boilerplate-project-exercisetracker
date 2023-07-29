// process.env.TZ = 'Europe/London';

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

function format_date(date) {
  // let fmted = date.toGMTString().slice(0, 16).replace(/,/g, '');
  let fmted = date.toDateString();
  console.log("date", date, "format_date", fmted, "toDateString", date.toDateString());
  return fmted;
}

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

  console.log("/api/users");
  console.log("username:", username);
  newUser.save()
    .then(user => res.json({ _id: user._id, username: user.username }))
    .catch(err => res.status(500).json({ error: "Error creating user." }));
});
app.post("/api/users/:_id/exercises", (req, res) => {
  /*creates a user exercise from 'description','duration','date'?now*/
  const userId = req.params._id;
  const { description, duration, date } = req.body;

  let _date = new Date();
  const regex = /(\d{4})-(\d{2})-(\d{2})/;
  const match = date?.match(regex) || false;
  // console.log("match", match);
  if (match) {
    const year = match[1];
    const month = match[2];
    const day = match[3]; 
    console.log(year, month, day)
    _date = new Date(year, month-1, day);
    console.log("parsed date", _date);
  }

  const exercise = { date: _date, duration: parseInt(duration), description };

  console.log("/api/users/:_id/exercises");
  console.log("userid:", userId, description, duration, date, "\nexercise:", exercise);

  User.findById(userId)
    .then(user => {
      if (!user) { throw new Error("User not found."); }
      user.log.push(exercise);
      user.count = user.log.length;
      return user.save();
    })
    .then(user => {
      response = { _id: user._id, username: user.username, ...exercise }
      // response.date = format_date(response.date);
      response.date = response.date.toDateString();
      console.log("response", response);
      res.json(response)
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({ error: "Error creating exercise." })
    });
});
app.get("/api/users/:_id/logs", (req, res) => {
  /* returns a user's exercise log from 'from' and 'to' date or 'limit' entries */
  const userId = req.params._id;
  const { from, to, limit } = req.query;

  // console.log("/api/users/:_id/logs");
  // console.log("userid:", userId, "from:", from, "to:", to, "limit:", limit);

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

      response = {
        _id: user._id,
        username: user.username,
        count: logs.length,
        log: logs.map(log => ({ description: log.description, duration: log.duration, date: log.date.toDateString() }))
      }

      // console.log("Response", response);
      res.json(response);
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({ error: "Error fetching user logs." })
    });
});



const listener = app.listen(8000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
