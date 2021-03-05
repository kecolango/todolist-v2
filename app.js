//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

/* const items = ["Buy Food", "Cook Food", "Eat Food"];     // Old method for storing list data
const workItems = []; */

mongoose.connect("mongodb://localhost:27017/todolistDB", {useNewUrlParser: true, useUnifiedTopology: true});      // Create new db inside MongoDB

const itemsSchema = new mongoose.Schema({     // Create schema
  name: String
});

const Item = new mongoose.model("Item", itemsSchema);     // Create model

const item1 = new Item ({     // Create default items documents
  name: "Welcome to the To-Do List"
});

const item2 = new Item ({
  name: "Press + to add a new item"
});

const item3 = new Item ({
  name: "<-- Press here to delete an item"
});

const defaultItems = [item1, item2, item3];


app.get("/", function(req, res) {

  Item.find({}, function(err, foundItems) {      // Mongoose method '.find()' placed inside GET method bc result will be used in render. '{}' indicates to find all docs within collection.
    if(foundItems.length === 0) {
      Item.insertMany(defaultItems, function(err) {     // Moved inside conditional inside .find() inside .get in order to verify status of list array, and ensure default items aren't repeated
        if(err) {
          console.log(err);
        }else {
          console.log("Successfully inserted documents");
        }
      });
      res.redirect("/");      // Redirect to home page to implement results of conditional
    }else {
      res.render("list", {listTitle: "Today", newListItems: foundItems});     // If default items already exist, render 
    }
  });

});

app.post("/", function(req, res){

  const itemName = req.body.newItem;

  const item = new Item ({
    name: itemName
  });

  item.save();      // Mongoose shortcut, circumvents using '.insertOne'

  res.redirect("/");      // Without this step, item will be inserted into db, but page will not be re-rendered with new item

//   if (req.body.list === "Work") {
//     workItems.push(item);
//     res.redirect("/work");
//   } else {
//     items.push(item);
//     res.redirect("/");
//   }
});

app.post("/delete", function(req, res) {     // Added to handle checkbox occurence indicating desire to delete an item
  const checkedItemID = req.body.checkbox;

  Item.findByIdAndRemove(checkedItemID, function(err) {
    if(err) {
      console.log(err);
    }else {
      console.log("Successfully removed document");
      res.redirect("/");
    }
  });
});

app.get("/work", function(req,res){
  res.render("list", {listTitle: "Work List", newListItems: workItems});
});

app.get("/about", function(req, res){
  res.render("about");
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
