// LINK TO DATABASE CONNECTION
const pool = require('./config.js')
var path = require("path");

// google auth
const { OAuth2Client } = require('google-auth-library');
const CLIENT_ID = '170958026096-1delfs3g8tg4hoeg6bgs5ickhpe7k5pt.apps.googleusercontent.com' // Given by Google when you set up your Google OAuth client ID: https://developers.google.com/identity/sign-in/web/sign-in

//VERIFICATION FUNCTION: The ticket inspector

// Check authenticity of user id - basically like ticket inspector
// take the token and verify it and if it is good then gives back user id (from google)
// if token is 'wrong' (expired/ doesn't exist etc.) it returns false
// so this only returns user if if an active true token exists in the browser

async function verify(CLIENT_ID, token) {
    const client = new OAuth2Client(CLIENT_ID);
    try {
        const ticket = await client.verifyIdToken({ // Function to inspect the user's "ticket" (token)
            idToken: token,
            audience: CLIENT_ID
        });
        console.log('Token Verified')

        const payload = ticket.getPayload(); // The verified token gives back a ticket. This ticket contains things like user ID, email and profile picture (all from a user's Google Account)
        const AuthUserId = payload.sub;
        const UserName = payload.name;
        const UserEmail = payload.email;
        const UserPicture = payload.picture;
        return [AuthUserId, UserName, UserEmail, UserPicture]

    } catch (error) {
        console.log('Token not verified')
        return false
    }


};


// DEFINE APP
const router = app => {


    // VERIFY USER & POST NEW USER TO DATABASE IF NECESSARY: SET COOKIE VALUE IN BROWSER
    app.post('/SignIn', async (request, response) => {
        let token = request.body.token
        VerifiedTokenPayload = await verify(CLIENT_ID, token)

        if (!VerifiedTokenPayload) { // if value == false
            response.send('* Token verification FAIL: User not logged in *')

        } else {
            response.cookie('USER_SESSION_TOKEN', token) // passing a verified token to the browser
            var AuthUserId = VerifiedTokenPayload[0]
            var AuthUserName = VerifiedTokenPayload[1]
            var AuthUserFirstName = AuthUserName.split(" ", 1)[0]
            var AuthUserEmail = VerifiedTokenPayload[2]
            var AuthUserImage = VerifiedTokenPayload[3]

            var AuthUserData = { auth_user_id: AuthUserId, email: AuthUserEmail }
            var AuthUserProfile = { first_name: AuthUserFirstName, full_name: AuthUserName, profile_picture: AuthUserImage }
            // check if user already exists in database

            try {
                pool.query("SELECT auth_user_id FROM auth_data WHERE auth_user_id = ?", AuthUserId, function (error, result, field) {
                    if (error) throw console.log('Query if user exists error type:', error);
                    console.log('Query if user exists result: ', result)

                    if (result.length === 0) {
                        console.log('No result from existing user query: Inserting new user into Auth DB')
                        // TABLE: AUTH_DATA
                        pool.query('INSERT INTO auth_data SET ?', AuthUserData, (error, result) => {
                            if (error) throw console.log('Authentication DB error: ', error);

                        });
                        //TABLE: USER_PROFILE
                        pool.query('INSERT INTO user_profile SET?', AuthUserProfile, (error, result) => {
                            if (error) throw console.log('User profile DB error: ', error);

                        });
                        response.send("New user added");

                    } else {
                        response.send("Existing user- signing in");
                    }
                });
            } catch (err) {
                console.log('Sign up route fail: ' + err)
            }
        }
    });

    // An API CALL THAT REQUIRES VERIFICATION FIRST
    app.post('/ProtectedRoute', async (request, response) => {
        token = request.body.token

        VerifiedTokenPayload = await verify(CLIENT_ID, token)
        if (!VerifiedTokenPayload) { //if value == false
            response.send('* Token verification FAIL: User not logged in *')
        } else {
            // FIND APP USER ID (use internal app ID rather than google id to identify a user)
            console.log('verified token (google user id): ', VerifiedTokenPayload[0])
            pool.query("SELECT user_id FROM AUTH_DATA WHERE auth_user_id = ?", VerifiedTokenPayload[0], (error, result) => { // value of app user id on row of google user id 
                if (error) throw console.log('Find user ID error: ', error);
                console.log('result from auth data query: ', result[0])
                user_id = result[0].user_id
                var SuccessResponseArray = ["* Token verification SUCCESS: User logged in *", user_id] // send to Frontend
                response.send(SuccessResponseArray)
            }); // FIND APP USER ID: END
        } // END OF IF/ELSE CLAUSE VERIFICATION CLAUSE
    }); // END OF POST: PROTECTED ROUTE


    // Please refer to the schematic to understand how /ProtectedRoute is related to /ProtectedProfile
    app.get('/ProtectedProfile', (request, response) => {
        console.log('Protected Profile route')

        user_id = request.query.user_id
        console.log('redirected protected profile:', request.query)

        // RETRIEVE APP USER DATA
        pool.query("SELECT * FROM USER_PROFILE WHERE user_id = ?", user_id, (error, result) => {
            if (error) throw console.log('retieval error:', error);
            user_data = result[0]

            response.render("ProtectedProfile.ejs", {
                data: {
                    name: user_data.first_name, user_id: user_data.user_id,
                    profile_picture: user_data.profile_picture
                }
            }); // END OF RESPONSE.RENDER PROTECTED PROFILE
        }); // RETRIEVE APP USER DATA: END
    }) // END OF GET: PROTECTED PROFILE


    app.get('/home', (request, response) => {
        homepage_file = "/Users/Seansmac/Desktop/Dev/Full_stack_for_absolute_beginners/myrepo/FullStackDev/homepage.html"
        response.sendFile(homepage_file)
    });

    // This is optional, but it is a handy way to see the list of users who have been signed up to your app.
    // Just type http://localhost/users to trigger this and it'll show the list of users signed up.
    app.get('/users', (request, response) => {
        pool.query(`SELECT * FROM auth_data`, (error, result) => {
            if (error) throw error;
            response.send(result);
        });

    });

    // Simple sign out route
    app.get('/SignOut', (req, res) => {
        console.log('sign out route')
        res.clearCookie('USER_SESSION_TOKEN'); // This works by clearing the cookies from a user's browsers. No cookie = no token.
        console.log('Cookie cleared: logged out page redirection')
        res.redirect('/LoggedOutPage')
    })

    app.get('/LoggedOutPage', (req, res) => {
        console.log('redirect to landing page')
        res.render('LandingPage');
    })

    // ROTUE TO DELETE A USER
    app.get('/deleteuser', (request, response) => {
        var UserToDelete = request.query.email
        console.log('request to delete this data:', UserToDelete);
        pool.query(`DELETE FROM auth_data WHERE email = '${UserToDelete}'`, (error, result) => {
            if (error) throw error;
            console.log('Delete response: ', result);

            pool.query(`SELECT * FROM auth_data`, (error, result) => {
                if (error) throw console.log('remiaing users error: ', error);
            });
        });
        console.log('sign out redirection')
        response.redirect('/SignOut') //to delete cookie
    });

    // DELETE ME
    //Protected route test
    app.get('/UserData', (req, res) => {
        console.log('Loading user data for user: ', req)
        res.send('response from test')
    })



};
module.exports = router;