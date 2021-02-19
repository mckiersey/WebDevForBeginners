// LINK TO DATABASE CONNECTION
const pool = require('./config.js')
var path = require("path");

// google auth
const { OAuth2Client } = require('google-auth-library');
const CLIENT_ID = '170958026096-1delfs3g8tg4hoeg6bgs5ickhpe7k5pt.apps.googleusercontent.com'
const client = new OAuth2Client(CLIENT_ID);

//VERIFICATION FUNCTION

// Check authenticity of user id
// take the token and verify it and if it is good then gives back user id (from google)
// if token is 'wrong' (expired/ doesn't exist etc.) it returns false
// so this only returns user if if an active true token exists in the browser

async function verify(CLIENT_ID, token) {
    const client = new OAuth2Client(CLIENT_ID);
    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID
        });
        console.log('User Verified')

        const payload = ticket.getPayload();
        console.log(payload)
        const AuthUserId = payload['sub'];
        const UserName = payload.name
        return AuthUserId

    } catch (error) {
        console.log('im in verify false')
        return false
    }


};






// DEFINE APP
const router = app => {


    app.get('/', (request, response) => {
        response.send("So this message is coming from your app, which is also known as your server!");
    });


    app.get('/home', (request, response) => {
        homepage_file = "/Users/Seansmac/Desktop/Dev/Full_stack_for_absolute_beginners/myrepo/FullStackDev/homepage.html"
        response.sendFile(homepage_file)
    });


    app.get('/ProtectedProfileredirect', (request, response) => {
        console.log('middleware')
        response.redirect(301, '/ProtectedProfile');
    });

    app.get('/logout', function (req, res) {
        res.redirect('/');
    });

    app.get('/ProtectedProfile', (request, response) => {
        console.log('in protected profile get request')
        response.render("ProtectedProfile.ejs", { message: "im tired of this shit" });
    })



    app.get('/users', (request, response) => {
        pool.query(`SELECT * FROM auth_data`, (error, result) => {
            if (error) throw error;

            response.send(result);
            console.log('all users: ' + result);
        });

    });

    // An API CALL THAT REQUIRES VERIFICATION FIRST
    app.post('/ProtectedRoute', async (request, response) => {
        token = request.body.token

        console.log('token = ', token)
        user = await verify(CLIENT_ID, token)
        console.log('value of verify function: ', user)
        if (!user) { //if verify function returns false (not user)
            console.log('User not logged in')
            //response.send('User not logged in')


            // add login redirect           
        } else {
            // next logic
            console.log('verified user: ', user)
            // example: protected page
            response.redirect(301, '/ProtectedProfileRedirect');
        }

    });

    // https://stackoverflow.com/a/65006287/6065710 - getting tokens

    // LOGOUT
    /*
    app.get('/SignOut', (req, res) => {
        console.log('Sign Out route')
        res.clearCookie('USER_SESSION_TOKEN');
        //res.send('User cookies deleted')
        res.redirect('/LandingPage')
    
    })
    */

    app.get('/LandingPage', (req, res) => {
        console.log('redirect to landing page')
        res.render('LandingPage');
    })

    app.get('/SignOut', (req, res) => {
        console.log('sign out route')
        res.clearCookie('USER_SESSION_TOKEN');
        res.redirect('/LandingPage')

    })


    // POST NEW USER TO DATABASE
    app.post('/SignIn', async (request, response) => {

        let token = request.body.token
        response.cookie('USER_SESSION_TOKEN', token) // passing a verified token to the browser
        response.send('Token set- user logged in & session started'); // THIS ISNT CORRECT- NEED TO VERIFY BEFORE STARTING A SESSION
        console.log('token set')

        //var NewuserName = request.body.userName
        //var NewuserEmail = request.body.userEmail

    });
    /*
            var NewUserDetails = { auth_user_id: AuthUserId, email: NewuserEmail }
            // check if user already exists in database
            try {
                pool.query("SELECT auth_user_id FROM auth_data WHERE auth_user_id = ?", AuthUserId, function (error, result, field) {
                    if (error) throw error;
                    console.log('error type:', error);
    
                    if (result.length === 0) {
                        console.log('inserting new user')
                        //new user logic
                        pool.query('INSERT INTO auth_data SET ?', NewUserDetails, (error, result) => {
                            response.send('New User ' + AuthUserId + ' Written to database')
                            if (error) throw error;
                            console.log('error type:', error);
                        });
                    } else {
                        response.send("Existing user- signing in");
                    }
                });
    
            } catch (err) {
                console.log('backend fail: ' + err)
            }
            
        }
        
    
        )
        */

};
module.exports = router;