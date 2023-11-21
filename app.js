const express = require("express");
const bodyParser = require("body-parser")
const mongoose = require("mongoose");
const session = require ("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

require("dotenv").config();

const app = express();
const port = 3000;

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://127.0.0.1:27017/userDB");

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String, 
  secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, {
      id: user.id,
      username: user.username,
      picture: user.picture
    });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets",
  
},
function(accessToken, refreshToken, profile, cb) {
  console.log(profile); 
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/auth/google", 
  passport.authenticate("google", { scope: ['profile'] })
);

app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/secrets");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/logout", function(req, res){
  req.logout((err)=>{
    if (err) {
      console.log(err);
    } else {
      res.redirect("/");
    }
  });
});

app.get("/secrets", async function(req, res){
  await User.find({"secret": {$ne:null}}).then((foundUsers)=>{
    if (foundUsers) {
      res.render("secrets", {usersWithSecrets : foundUsers});
    }
  }).catch((err) => {
    console.log(err);
  });
});

app.get("/submit", function(req, res) {
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", async function(req, res) {
  const submittedSecret = req.body.secret;

  console.log(req.user.id);
  await User.findById(req.user.id).then((foundUser) => {
    if (foundUser) {
      foundUser.secret = submittedSecret;
      foundUser.save();
      res.redirect("/secrets");
    }
  }).catch((err)=> {
    console.log(err);
  });

})

app.post("/register", (req, res) => {
  User.register({username: req.body.username}, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
      });
    }
  })
  
  
});

app.post("/login", (req, res) => {

  const user = new User({
    username : req.body.username,
    passport: req.body.password
  });

  req.login(user, function(err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
      })
    }
  })
});  


app.listen(port, () => {
  console.log(`Server started on port ${port}.`);
});

