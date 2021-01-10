// LINK TO DATABASE CONNECTION
const pool = require('./config.js')

// DEFINE APP
const router = app => {

    app.get('/', (request, response)=> {
        response.send("So this message is coming from your app, which is also known as your server!");
    });


    app.get('/home', (request, response)=>{
        response.sendFile("/Users/Seansmac/Desktop/Dev/Full_stack_for_absolute_beginners/myrepo/FullStackDev/homepage.html")
    });

    pool.query('SELECT * FROM user_profile;', function (err, result, fields) {
        if (err) throw new Error(err)
        // Do something with result.
    })



};
module.exports = router;