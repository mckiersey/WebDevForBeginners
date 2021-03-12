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

        } else { //Token has been verified
            response.cookie('USER_SESSION_TOKEN', token) // Setting a verified token in the browser
            var google_user_id = VerifiedTokenPayload[0]
            var google_user_name = VerifiedTokenPayload[1]
            var google_first_name = google_user_name.split(" ", 1)[0]
            var google_email = VerifiedTokenPayload[2]
            var google_profile_picture = VerifiedTokenPayload[3]

            // Here the name before the colon corresponds to the field name in the table we created, the name after corresponds to the data, found in the verified token, above.
            var new_user_data = {
                google_user_id: google_user_id, first_name: google_first_name, full_name: google_user_name,
                email: google_email, profile_picture: google_profile_picture
            }

            try { // CHECK IF USER ALREADY EXISTS IN DATABASE
                pool.query("SELECT google_user_id FROM user_profile WHERE google_user_id = ?", new_user_data, function (error, result, field) {
                    // User not in user_profile table => This is a New User
                    if (result.length === 0) {
                        console.log('No result from existing user query: Inserting new user into user_profile DB')
                        try {  //INSERT NEW USER INTO: USER_PROFILE
                            pool.query('INSERT INTO user_profile SET?', google_user_data, (error, result) => {
                            });
                        } catch (error) {
                            console.log('Unable to create new user, error: ', error)
                        }
                        response.send("New user added");
                        // User exists in user_profile table => This is NOT a New User
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
    app.post('/ProfileRoute', async (request, response) => {
        token = request.body.token
        VerifiedTokenPayload = await verify(CLIENT_ID, token)

        if (!VerifiedTokenPayload) { //if value == false
            response.send('* Token verification FAIL: User not logged in *')

        } else { //Token has been verified
            google_user_id = VerifiedTokenPayload[0]
            // FIND APP USER ID (use internal app ID, rather than google id to identify a user)
            pool.query("SELECT user_id FROM user_profile WHERE google_user_id = ?", google_user_id, (error, result) => { // value of app user id on row of google user id 
                if (error) throw console.log('Find user ID error: ', error);
                user_id = result[0].user_id
                var SuccessResponseArray = ["* Token verification SUCCESS: User logged in *", user_id]
                response.send(SuccessResponseArray)
            }); // FIND APP USER ID: END
        } // END OF IF/ELSE CLAUSE VERIFICATION CLAUSE
    }); // END OF POST: PROTECTED ROUTE


    // 
    app.get('/ProfilePage', (request, response) => {
        user_id = request.query.user_id // User Id set as a cookie in /ProfileRoute and retrieved in FE FROM the response (but also could have been retrieved from the cookie)
        // RETRIEVE APP USER DATA
        pool.query("SELECT * FROM user_profile WHERE user_id = ?", user_id, (error, result) => {
            if (error) console.log('retrieval error:', error);
            user_data = result[0]
            response.render("ProfilePage.ejs", {
                data: {
                    name: user_data.first_name, user_id: user_data.user_id,
                    profile_picture: user_data.profile_picture
                }
            }); // END OF RESPONSE.RENDER PROTECTED PROFILE
        }); // RETRIEVE APP USER DATA: END
    }) // END OF GET: PROTECTED PROFILE


    // POST NEW VIDEO
    app.post("/NewVideo", async (request, response) => {

        console.log('new video route')
        FrontEndToken = request.body.token
        FrontEndUserId = request.body.ProfileId
        VideoLink = request.body.VideoLink

        VerifiedTokenPayload = await verify(CLIENT_ID, FrontEndToken)
        var FrontEndAuthUserId = VerifiedTokenPayload[0] //Google user ID

        if (!VerifiedTokenPayload) { //if value == false
            response.send('* Token verification FAIL: User not logged in *')

        } else { //Token has been verified

            // Now we ensure that this token corresponds to the FrontEndUserId (the user Id seen in the browser url)
            try {

                pool.query("SELECT google_user_id FROM user_profile WHERE user_id = ?", FrontEndUserId, (error, result) => { // value of app user id on row of google user id 
                    console.log('Security check FE user id: ', FrontEndUserId)
                    console.log('security check:', result)
                    console.log('Security check Backend End Google user ID: ', result[0].google_user_id)
                    StoredGoogleAuthID = result[0].google_user_id

                    if (FrontEndAuthUserId == StoredGoogleUserID) {
                        console.log('Authorised user editing correct profile')
                        InsertData = { user_id: FrontEndUserId, content: VideoLink }
                        // ADD VIDEO LINK TO DATA BASE
                        pool.query('INSERT INTO user_content SET ?', InsertData, (error, result) => {
                            if (error) throw console.log('User profile DB error: ', error);
                        });
                        response.send('New Video Saved')
                    } else {
                        console.log('User not on correct profile')
                    }
                });
            } catch (error) {
                console.log('Error from check that token matches profile')
            }
        }
    })

    // CHECK IF PAGE VIEWER IS PAGE OWNER
    app.get("/Owner", async (request, response) => {
        FrontEndUserId = request.query.ProfileId
        FrontEndToken = request.query.token

        VerifiedTokenPayload = await verify(CLIENT_ID, FrontEndToken)
        var FrontEndAuthUserId = VerifiedTokenPayload[0] //Google user ID
        if (!VerifiedTokenPayload) { //if value == false
            response.send('* Token verification FAIL: User not logged in *')
        } else {
            // Now we ensure that this token corresponds to the FrontEndUserId (the user Id seen in the browser url)
            try {
                console.log(FrontEndUserId)
                pool.query("SELECT google_user_id FROM user_profile WHERE user_id = ?", FrontEndUserId, (error, result) => { // value of app user id on row of google user id                   
                    StoredGoogleUserID = result[0].google_user_id
                    if (FrontEndAuthUserId == StoredGoogleUserID) {
                        console.log('Authorised user editing correct profile')
                        response.send('User signed in')
                    } else {
                        response.send('User not signed in')
                    }
                });
            } catch (error) {
                console.log('Error from check that token matches profile')
            }
        }
    });




    // GET VIDEO
    app.get("/Video", (request, response) => {
        user_id = request.query.user_id
        console.log(user_id)
        // RETRIEVE USER CONTENT DATA
        pool.query("SELECT content FROM user_content WHERE user_id = ? ORDER BY row_num DESC LIMIT 1 ", user_id, (error, result) => { // ORDER BY/DESC => Last input value
            if (error) console.log('Content retrieval error:');
            try {
                user_content = result[0]
                if (result.length === 0) {
                    console.log('No video data')
                } else {
                    response.send(user_content.content)
                }
            } catch (error) {
                console.log("User content error (likely no data for this user)")
            }
        }); // RETRIEVE USER CONTENT DATA: END
    });


    // HOME PAGE ROUTE
    app.get('/home', (request, response) => {
        homepage_file = "/homepage.html"
        response.sendFile(homepage_file, { root: __dirname })
    });

    // SIGN OUT ROUTE
    app.get('/SignOut', (req, res) => {
        res.clearCookie('USER_SESSION_TOKEN'); // This works by clearing the cookies from a user's browsers. No cookie = no token.
        res.clearCookie('APP_USER_ID'); // This works by clearing the cookies from a user's browsers. No cookie = no token.
        console.log('Cookie cleared: logged out page redirection')
        res.redirect('/LoggedOutPage')
    })

    // UNLOGGED LANDING PAGE
    app.get('/LoggedOutPage', (req, res) => {
        console.log('redirect to landing page')
        res.render('LandingPage');
    })

    // DELETE USER ROUTE: TO BE REMOVED IN FINAL VERSION, NOTE THIS SHOULD BE A 'DELETE' METHOD, NOT A 'GET' METHOD
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

};
module.exports = router;