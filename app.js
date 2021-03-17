//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const _ = require("lodash");
const mongoose = require("mongoose");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

/* const items = ["Buy Food", "Cook Food", "Eat Food"];     // Old method for storing list data
const workItems = []; */

// mongoose.connect("mongodb://localhost:27017/todolistDB", {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false});      // Create new db inside MongoDB
mongoose.connect("mongodb+srv://admin-kristian:Test123@cluster0.c8pxk.mongodb.net/todolistDB", {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false});      // 351. Changed URL to allow for use of an MongoDB Atlas cluster in order to host database

/********** DEPRECATION: This was an addition that was made by me in response to a deprication warning from Mongoose regarding '.findById...''s and '.findOneAnd...''s **********/
//mongoose.set('useFindAndModify', false);      // Added to the above '.connect()'
/********** DEPRECATION END **********/

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

/***** 346. Schema added to allow for dynamic list creation/access *****/
const listSchema = new mongoose.Schema({
  name: String,
  items: [itemsSchema]     // Identifies that a list doc will have a field that contains an array of items, which are docs themselves based on the 'itemsSchema'
});

const List = new mongoose.model("List", listSchema);


app.get("/", function(req, res) {

  Item.find({}, function(err, foundItems) {      // Mongoose method '.find()' placed inside GET method bc result will be used in render. '{}' indicates to find all docs within collection.
    if(foundItems.length === 0) {
      Item.insertMany(defaultItems, function(err) {     // Moved inside conditional inside .find() inside .get in order to verify status of list array, and ensure default items aren't repeated
        if(err) {
          console.log(err);
        }else {
          console.log("Successfully inserted documents");
        }
        res.redirect("/");      // Redirect to home page to implement results of conditional
      });
      //res.redirect("/");      // Angela originally placed the redirect here, but this would result in the BulkWriteError: E11000 because '.insertMany()' is an asynchronouse task, so calling '.redirect()' 
                                // outside of the method causes the redirect to be called over and over while the inserting is still occuring. This also causes the '.insertMany()' to be triggered more than once
    }else {
      res.render("list", {listTitle: "Today", newListItems: foundItems});     // If default items already exist, render 
    }
  });

});

app.get("/:customListName", function(req, res) {      // 346. Added to allow for dynamic list creation/accessing
  const customListName = _.capitalize(req.params.customListName);     // 348. Adds consistency for capitalization of List Titles and url's across browsers and for the titles themselves
  
  List.findOne({name: customListName}, function(err, foundList) {     // '.findOne' returns object, as opposed to '.find()' which is essentially find all, which returns an array
    if(!err) {
      if(!foundList) {      // Since cannot check array lenght as before, check if exists/list is found
        // Create a new list
        const list = new List ({
          name: customListName,
          items: defaultItems
        });

        // Timing issue between 'list.save' and 'res.redirect' that results in multiple instances of the first doc created for the 'list' collection
        list.save();
        res.redirect("/" + customListName);     // Instructs the reloading of custom page on the application. Necessary as 'list.save()' only updates the db, not the app/webpage
      }else {
        // Show existing list
        res.render("list", {listTitle: foundList.name, newListItems: foundList.items});     // Use created object 'foundList''s parameters to populate rendered page
      }
    }
  });
});

app.post("/", function(req, res){

  const itemName = req.body.newItem;
  const listName = req.body.list;     // 347. Added to assign a custom list name to a variable for usage

  const item = new Item ({
    name: itemName
  });

  if (listName === "Today") {     // 347. Added to distinguish where to insert newly created Item document
    item.save();      // Mongoose shortcut, circumvents using '.insertOne'

    res.redirect("/");      // Without this step, item will be inserted into db, but page will not be re-rendered with new item
  }else {
    List.findOne({name: listName}, function(err, foundList) {     // 347. Can use 'foundList' as document, since the 'lists' collection is comprised of documents containing embedded documents
      if(!err) {  
        foundList.items.push(item);      // 347. Can access the lists 'items' property of the document. Because the 'lists' collection schema includes the 'items' field which is an array of items, to add an item requires the 'push()' method rather to add to this array rather than simply saving
        foundList.save();     // 347. Saves the newly updated document
    
          res.redirect("/" + listName);
      }
    });
  }


//   if (req.body.list === "Work") {      // Original solution pre-database usage
//     workItems.push(item);
//     res.redirect("/work");
//   } else {
//     items.push(item);
//     res.redirect("/");
//   }
});

app.post("/delete", function(req, res) {     // Added to handle checkbox occurence indicating desire to delete an item
  const checkedItemID = req.body.checkbox;
  const listName = req.body.listName;     // 348. Added to check hidden input added to delete posting form to know which list to delete items from

  if(listName === "Today") {      // 348. Implemented in order to allow for proper deletion of items on custom lists to occur. Checks for whether the item is being deleted from the default list or a custom one
    Item.findByIdAndRemove(checkedItemID, function(err) {
      if(err) {
        console.log(err);
      }else {
        console.log("Successfully removed document");
        res.redirect("/");
      }
    });
  }else {
    List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: checkedItemID}}}, function(err, foundList) {      // Instructs to look at list with name of 'listName' in order to "pull from the items array an item with an id of 'checkedItemId'". 'foundList' is called such because document that is being found and returned is a list
      if(!err) {
        res.redirect("/" + listName);
      }
    });
  }
  // Item.findByIdAndRemove(checkedItemID, function(err) {
  //   if(err) {
  //     console.log(err);
  //   }else {
  //     console.log("Successfully removed document");
  //     res.redirect("/");
  //   }
  // });
  
});

// app.get("/work", function(req,res){      // Removed and replaced to allow for dynamic lists
//   res.render("list", {listTitle: "Work List", newListItems: workItems});
// });

app.get("/about", function(req, res){
  res.render("about");
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
