const express = require("express");
const bodyParser = require("body-parser")
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");
require("dotenv").config();


const app = express();
const port = 3000;


app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));

mongoose.connect("mongodb://127.0.0.1:27017/userDB");

const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

userSchema.plugin(encrypt, {
  requireAuthenticationCode: false,
  secret: process.env.SECRET, 
  encryptedFields:["password"], 
});

const User = new mongoose.model("User", userSchema);

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", (req, res) => {
  const newUser = new User({
    email: req.body.username,
    password: req.body.password
  });

  newUser.save()
  .then(() => {
    res.render("secrets");
  })
  .catch((err) => {
    console.log(err);
  });
});

app.post("/login", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  User.findOne({email:username})
  .then(function(result){
    if (result) {
        if (result.password === password) {
            res.render("secrets")
        } else {
          res.status(401).send("Invalid credentials.");
        }
    }
  }).catch(function(err){
      console.log(err);
      res.status(500).send("Internal server error.");
  });
});  

app.get("/login", (req, res) => {
  res.render("login");
});


app.listen(port, () => {
  console.log(`Server started on port ${port}.`);
});

