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
        const AuthUserId = payload.sub;
        const UserName = payload.name;
        const UserEmail = payload.email;
        const UserPicture = payload.picture;
        return [AuthUserId, UserName, UserEmail, UserPicture]

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

    // POST NEW USER TO DATABASE
    app.post('/SignIn', async (request, response) => {
        let token = request.body.token
        google_user_id = await verify(CLIENT_ID, token)

        console.log('value of verify function: ', google_user_id)
        if (!google_user_id) {
            response.send('* Token verification FAIL: User not logged in *')

        } else {
            response.cookie('USER_SESSION_TOKEN', token) // passing a verified token to the browser
            response.send('* Token verification SUCCESS: User logged in *')

        }

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

        google_user_id = await verify(CLIENT_ID, token)
        console.log('value of verify function: ', google_user_id)
        if (!google_user_id) {
            response.send('* Token verification FAIL: User not logged in *')
        } else {
            response.send('* Token verification SUCCESS: User logged in *')
        }
    });

    app.get('/ProtectedProfile', (request, response) => {
        console.log('in protected profile get request')
        response.render("ProtectedProfile.ejs", { message: "Private profile message" });
    })


    // https://stackoverflow.com/a/65006287/6065710 - getting tokens

    app.get('/SignOut', (req, res) => {
        console.log('sign out route')
        res.clearCookie('USER_SESSION_TOKEN');
        res.redirect('/LoggedOutPage')

    })

    app.get('/LoggedOutPage', (req, res) => {
        console.log('redirect to landing page')
        res.render('LandingPage');
    })



};
module.exports = router;