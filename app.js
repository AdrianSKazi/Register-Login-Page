//jshint esversion:6
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const PORT = 3000;
// const encrypt = require('mongoose-encryption');
// const md5 = require('md5'); // funkcja hashujaca
// const bcrypt = require('bcrypt');
// const saltRounds = 10;
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const mongoose = require('mongoose');
const app = express();
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');

// APP
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));

// APP USE SESSION
app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false,
}));

// APP USE PASSPORT
app.use(passport.initialize());
app.use(passport.session());


// MONGOOSE
mongoose.set('strictQuery', false);
mongoose.connect('mongodb://localhost:27017/userDB');

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    facebookId: String,
    secret: String
});

// USER SCHEMA
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model('User', userSchema);

// PASSPORT SESSION
passport.use(User.createStrategy());

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => {
        done(err, user);
    })
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: 'http://localhost:3000/auth/facebook/secrets',
    profileFields: ['emails','displayName','name','picture']
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

// GET

app.get(("/"),(req, res) => {
    res.render('home')
});

    // OAuth Google

app.get('/auth/google', 
    passport.authenticate('google', { scope: ['profile'] })
    );

app.get('/auth/google/secrets', 
    passport.authenticate('google', {failureRedirect: '/login'}),
    function(req, res){
        res.redirect('/secrets');
    });

    // OAuth Facebook

app.get('/auth/facebook', 
    passport.authenticate('facebook', { scope: ['email'] })
    );

app.get('/auth/facebook/secrets', 
    passport.authenticate('facebook', {failureRedirect: '/login'}),
    function(req, res){
        res.redirect('/secrets');
    });

    // Login

app.get("/login",(req, res) => {
    res.render('login')
});

    // Register

app.get("/register",(req, res) => {
    res.render('register');
});

    // Secrets

app.get('/secrets', (req, res) => {
    User.find({'secret': {$ne: null}}, (err, foundUsers) => {
        if (err) {
            console.log(err)
        } else {
            if (foundUsers) {
                res.render('secrets', {usersWithSecrets: foundUsers});
            }
        }
    });
});

    // Submit

app.get('/submit', (req, res) => {
    if (req.isAuthenticated()) {
        res.render('submit');
    } else {
        res.redirect('/login');
        console.log(req.isAuthenticated());
    }
});

    // Logout

app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err){
            console.log(err);
        } else {
            res.redirect('/');
        }
    });
});

// POST

    // Register

app.post("/register", function(req,res){
    User.register({username:req.body.username},req.body.password,function(err,user){
      if(err){
        console.log("Error in registering.",err);
        res.redirect("/register");
      }else{
        passport.authenticate("local")(req,res, function(){
        console.log(user,101);
          res.redirect("/secrets");
      });
  }});
  });

    // Login

app.post('/login', (req, res) => {

   const user = new User({
        username: req.body.username,
        password: req.body.password
   });

   req.login(user, function(err){
    if (err) {
        console.log(err);
    } else {
        passport.authenticate("local")(req,res, function(){
            console.log(user,101);
              res.redirect("/secrets");
          });
    }
   })

});

    // Submit

app.post('/submit', (req, res) => {
    const submittedSecret = req.body.secret;

    User.findById(req.user.id, (err, foundUser) => {
        if (err) {
            console.log(err);
        } else {
            if (foundUser) {
                foundUser.secret = submittedSecret;
                foundUser.save(() => {
                    res.redirect('/secrets');
                });
            }  
        }
    });
});

// LISTEN
app.listen(PORT, () => {
    console.log('App is running on port', PORT);
});