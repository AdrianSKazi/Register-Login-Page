//jshint esversion:6
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const PORT = 3000;
const encrypt = require('mongoose-encryption');

// MONGOOSE

const mongoose = require('mongoose');
mongoose.set('strictQuery', false);
mongoose.connect('mongodb://localhost:27017/userDB');

const app = express();

console.log(process.env.API_KEY);

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ['password']});

const User = new mongoose.model('User', userSchema);

// APP

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));

// GET

app.get(("/"),(req, res) => {
    res.render('home')
});

app.get(("/login"),(req, res) => {
    res.render('login')
});

app.get(("/register"),(req, res) => {
    res.render('register');
});

app.get(('/secrets'), (req, res) => {
    res.render('secrets');
});

// POST

app.post('/register', (req, res) => {
    const password = req.body.password;
    const userName = req.body.username;

    const newUser = new User({
        email: userName,
        password: password
    });

    newUser.save((err) => {
        if (!err) {
            console.log(err);
        }
        else {
            res.redirect('/secrets');
        }
    });
});

app.post('/login', (req, res) => {
    const password = req.body.password;
    const username = req.body.username;

    User.findOne({email: username}, (err, foundItem) => {
        if (err){
            console.log(err);
        }
        else {
            if (foundItem) {
                if (foundItem.password === password) {
                    res.redirect('/secrets');
                }
                else {
                    res.send('Wrong user or password');
                }
            } 
            else {
                res.send('Wrong user or password');
            }
        }
    })
});

// LISTEN
app.listen(PORT, () => {
    console.log('App is running on port', PORT);
})