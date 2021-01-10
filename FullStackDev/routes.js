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

 



    // POST NEW USER TO DATABASE

    app.post('/newUser', async (request, response) => {
    try {
        var NewuserName = request.body.userName
        var Newpassword = request.body.password

        pool.query("SELECT ACCOUNT_ID FROM registration WHERE ACCOUNT_ID = '"+ userAccnt +"'", function(err, result, field){
            if(result.lenght === 0){
               //new user logic
               pool.query(`INSERT INTO user_profile (user, password) VALUES("${NewuserName}", '${Newpassword}');`, (error, result) => {
                if (error) throw error;
                console.log('error type:', error);
                console.log('Post Success!');
                });  
            }else{  
                //existing user,
                response.send("User already exists");
            }  
    } catch {
        response.status(500).send('Error')
    }
    


};
module.exports = router;