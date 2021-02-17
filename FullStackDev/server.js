const express = require('express');
const app = express();
const port = 80;
const path = require('path');
const routes = require('./routes.js');
const bodyParser = require('body-parser')
cookieParser = require('cookie-parser');




// middlewear
app.set('view engine', 'ejs')
app.use(express.json());
app.use(cookieParser());
app.use(express.static('public')); //delete me


// view engine
app.set('views', '/Users/Seansmac/Desktop/Dev/Full_stack_for_absolute_beginners/myrepo/FullStackDev/views');


// Add body parser for routes.js file
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
    extended: true
}));



//start the server
const server = app.listen(port, (error) => {
    if (error) return console.log(`** SERVER ERROR: ${error}`);

    console.log(`Server is running on port: ${server.address().port}`);

});

routes(app)
