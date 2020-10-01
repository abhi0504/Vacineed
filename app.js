require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
var Request = require("request");
const https = require('https');

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://abhishek_0504:9971749520a@cluster0-b6e9z.mongodb.net/vaccineuserDB", {useNewUrlParser: true , useUnifiedTopology: true});
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema ({
  email: String,
  password: String,
  googleId: String,
  secret: String,
  name: String,
  age: Number,
  blood: String,
  address: String,
  aadhar: String,
  emergency: String,
  reason: String,
  disease: String,
  link: String,
  contact: Number
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
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

app.get("/", function(req, res){
  https.get("https://api.thevirustracker.com/free-api?countryTotal=IN" , function(response)
  {
  response.on("data" , function(data)
  {
      var apidata = JSON.parse(data);
      const deaths = apidata.countrydata[0].total_deaths;
      const treated = apidata.countrydata[0].total_recovered;
      const infected = apidata.countrydata[0].total_cases;
      const newcases = apidata.countrydata[0].total_new_cases_today;


      res.render("firstPage" , { deaths:deaths , treated:treated , infected:infected , newcases:newcases})
  })
  });
});

app.get("/home", function(req, res){
  res.render("home");
});

app.get("/users_list", function(req, res){
  res.render("users_list");
});

app.get("/admin", function(req, res){
  res.render("admin");
});


app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/secrets");
  });

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});

app.get("/secrets", function(req, res){
  console.log(req);
  res.render("user" , {userInfo: req.user})
});

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});


app.post("/register", function(req, res){

  // console.log(req.body);

  User.register({username: req.body.username,
    name: req.body.name,
    age: req.body.Age,
    blood: req.body.blood_grp,
    address: req.body.address,
    aadhar: req.body.Adhaar_no,
    emergency: req.body.emergency,
    reason: req.body.reason,
    disease: req.body.disease,
    link: req.body.Signature,
    contact: req.body.contact}, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){
       res.redirect("/secrets");
      });
    }
  });

});

app.post("/login", function(req, res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        if(req.body.username === "admin@123.com")
        {
          res.redirect("/admin")
        }
        else
        {
          res.redirect("/secrets");
        }
      });
    }
  });

});

app.listen(3001, function() {
  console.log("Server started on port 3000.");
});
