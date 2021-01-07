const express = require('express');
const app = express();
const port = 80;
const path = require('path');
const routes = require('./routes.js');



//start the server
const server = app.listen(port, (error) => {
    if(error) return console.log(`** SERVER ERROR: ${error}`);

    console.log(`Server is running on port: ${server.address().port}`);

});

routes(app)
