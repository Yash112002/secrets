//jshint esversion:6
require('dotenv').config();
// const md5 = require('md5');
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
// const bcrypt = require('bcrypt');
// const saltRounds = 10;
// const encrypt = require("mongoose-encryption");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");

mongoose.connect("mongodb://localhost:27017/userDB", {
    useNewUrlParser: true
});

const app = express();
// console.log(process.env.SECRET);
// console.log(process.env.API_KEY);

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(session({
    secret: 'Our Little Secret.',
    resave: false,
    saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId:String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// userSchema.plugin(encrypt, {
//     secret: process.env.SECRET,
//     encryptedFields: ['password']
// });

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());
passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (user, done) {
    done(null, user);
});

passport.use(new GoogleStrategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/secrets",
        userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
    },
    function (accessToken, refreshToken, profile, cb) {
        // console.log(profile);
        User.findOrCreate({
            googleId: profile.id
        }, function (err, user) {
            return cb(err, user);
        });
    }
));

app.get("/", (req, res) => {
    res.render("home");
});

app.get('/auth/google',
    passport.authenticate('google', {
        scope: ["profile"]
    }));

app.get('/auth/google/secrets',
    passport.authenticate('google', {
        failureRedirect: '/login'
    }),
    function (req, res) {
        // Successful authentication, redirect secrets.
        res.redirect('/secrets');
    });


app.get("/login", (req, res) => {
    res.render("login");
});
app.get("/register", (req, res) => {
    res.render("register");
});
app.get("/secrets", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("secrets");
    } else {
        res.redirect("/login");
    }
});
app.get('/logout', function (req, res) {
    req.logout((err) => {
        if (err) console.log(err);
        res.redirect("/");
    });
});

app.post("/register", (req, res) => {
    // bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
    //     // Store hash in your password DB.
    //     if (err) console.log(err);
    //     else {
    //         const newUser = new User({
    //             email: req.body.username,
    //             password: hash
    //         });
    //         newUser.save((err) => {
    //             if (err) console.log(err);
    //             else res.render("secrets");
    //         });
    //     }
    // });
    User.register({
        username: req.body.username
    }, req.body.password, (err, user) => {
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, () => {
                res.redirect("/secrets");
            })
        }
    })
});

app.post("/login", (req, res) => {
    // const username = req.body.username;
    // const password = req.body.password;
    // // console.log(password);
    // User.findOne({
    //     email: username
    // }, (err, found) => {
    //     if (err) console.log(err);
    //     else {
    //         // if (found.password === password) res.render("secrets");
    //         if (found) {
    //             bcrypt.compare(password, found.password, function (err, result) {
    //                 if (err) console.log(err);
    //                 else if (result == true) res.render("secrets");
    //             });
    //         } else res.send("no user found!!");
    //     }
    // });
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });
    req.login(user, (err) => {
        if (err) console.log(err);
        else {
            passport.authenticate("local")(req, res, () => {
                res.redirect("/secrets");
            })
        }
    })
})



app.listen(3000, () => {
    console.log("Server started on port 3000");
})