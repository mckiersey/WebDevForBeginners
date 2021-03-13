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

        const payload = ticket.getPayload(); // The verified token gives back a ticket. This ticket contains things like user ID, email and profile picture (all from a user's Google Account)
        const AuthUserId = payload.sub;
        const UserName = payload.name;
        const UserEmail = payload.email;
        const UserPicture = payload.picture;
        return [AuthUserId, UserName, UserEmail, UserPicture]

    } catch (error) {
        return false
    }


};


// DEFINE APP
const router = app => {


    //////////////////////////////////////////////////////////////////
    //// *** VIEW A PROFILE & SIGN IN *** ////
    //////////////////////////////////////////////////////////////////

    // HOME: DESCRIPTION
    // 1) Display landing page
    app.get('/home', (request, response) => {
        homepage_file = "/homepage.html"
        response.sendFile(homepage_file, { root: __dirname })
    });


    // SIGN IN: DESCRIPTION 
    //VERIFY USER & POST NEW USER TO DATABASE IF NECESSARY: SET COOKIE VALUE IN BROWSER
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
                pool.query("SELECT * FROM user_profile WHERE google_user_id = ?", google_user_id, function (error, result) {
                    // User not in user_profile table => This is a New User
                    if (result.length === 0) {
                        console.log('No result from existing user query: Inserting new user into user_profile DB')
                        try {  //INSERT NEW USER INTO: USER_PROFILE
                            pool.query('INSERT INTO user_profile SET?', new_user_data, (error, result) => {
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

    // POST PROFILE ROUTE: DESCRIPTION 
    // FUNCTION: Deliever profile user id to FrontEnd based on the token given after a user signs in
    // 1) Validates token sent from FE
    // 2) If valid, find google_user_id from verified token
    // 3) Find associated (app) user Id
    // 4) Send to FE
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
    }); // END OF POST: PROFILE ROUTE


    // GET PROFILEPAGE ROUTE: DESCRIPTION
    // FUNCTION: Display a user's profile, with relevant data
    // 1) Take query parameter from browser (this is what is seen in the browser's URL)
    // 2) SELECT all fields from user_profile corresponding to the user's ID
    // 3) If no result is returned, send "User does not exist error", else;
    // 4) Render (display) the user's profile page, with dynamically updated data for first name, user id and profile picture.
    app.get('/ProfilePage', (request, response) => {
        user_id = request.query.user_id // User Id set as a cookie in /ProfileRoute and retrieved in FE FROM the response (but also could have been retrieved from the cookie)
        // RETRIEVE APP USER DATA
        try {
            pool.query("SELECT * FROM user_profile WHERE user_id = ?", user_id, (error, result) => {
                if (result.length === 0) {
                    response.send('Error: User does not exist. Please enter an existing user id in the url.')
                } else {
                    user_data = result[0]
                    response.render("ProfilePage.ejs", {
                        data: {
                            name: user_data.first_name, user_id: user_data.user_id,
                            profile_picture: user_data.profile_picture
                        }
                    }); // END OF RESPONSE.RENDER PROTECTED PROFILE
                } // END OF IF/ELSE CLAUSE
            }); // RETRIEVE APP USER DATA: END
        } catch (error) {
            console.log('Error retrieving user data, error: ', error)
        }
    }) // END OF GET: PROTECTED PROFILE



    // GET VIDEO ROUTE: DESCRIPTION
    // FUNCTION: Populate profile with relevant data
    // 1) Take profile page ID from browser
    // 2) Select data in 'content' corresponding to this profile (user) ID
    // 3) Rather than taking all data, select only the last row, which has the latest entry - this is an unsophisticated way of dealing with > 1 rows for a user (eg if a user submitted multiple videos)
    // 4) Send this data back to the FrontEnd
    app.get("/Video", (request, response) => {
        user_id = request.query.user_id
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


    //////////////////////////////////////////////////////////////////
    //// *** EDIT PROFILE *** ////
    //////////////////////////////////////////////////////////////////

    /// THE FOLLOWING ROUTES REQUIRE TWO CONDITIONS:
    // 1) THE USER IS SIGNED IN WITH A VALID TOKEN
    // 2) THE USER IS ON HER OWN PAGE

    // IF THESE CONDITIONS ARE MET, THE USER CAN EDIT HER PAGE.

    // GET OWNER ROUTE: DESCRIPTION
    // FUNCTION: Check whether the profile viewer is the profile owner- e.g. are you viewing your own profile, or your friend's?
    // 1) Verify token, taken from browser is valid
    // 2) If valid, find google user id associated with valid token = FrontEndGoogleUserId
    // 3) Find StoredGoogleUserId corresponding to profile (user) Id- taken from browser url
    // 4) Compare FrontEndGoogleUserId (from token) with StoredGoogleUserID (corresponding to profile ID)
    // 5) If both match, the logged in user (from token) has the same google ID as that which is associated with the profile user id => The logged in user is viewing her own profile, and not someone else's
    app.get("/Owner", async (request, response) => {
        ProfileUserId = request.query.ProfileId
        token = request.query.token

        VerifiedTokenPayload = await verify(CLIENT_ID, token)
        var FrontEndGoogleUserId = VerifiedTokenPayload[0] //Google user ID
        if (!VerifiedTokenPayload) { //if value == false
            response.send('* Token verification FAIL: User not logged in *')
        } else {
            // Now we ensure that this token corresponds to the ProfileUserId (the user Id seen in the browser url)
            try {
                pool.query("SELECT google_user_id FROM user_profile WHERE user_id = ?", ProfileUserId, (error, result) => { // value of app user id on row of google user id                   
                    StoredGoogleUserID = result[0].google_user_id
                    if (FrontEndGoogleUserId == StoredGoogleUserID) {
                        console.log('Authorised user editing correct profile')
                        response.send('User is profile owner')
                    } else {
                        response.send('User is not profile owner')
                    }
                });
            } catch (error) {
                console.log('Error from check that token matches profile')
            }
        }
    });

    // POST ADDVIDEO ROUTE: DESCRIPTION
    // FUNCTION: ENABLE USER TO ADD CONTENT (BUT ONLY TO HER PAGE)
    // 1) Verify token, taken from browser is valid
    // 2) If valid, find google user id associated with valid token = FrontEndGoogleUserId
    // 3) Find StoredGoogleUserId corresponding to profile (user) Id- taken from browser url
    // 4) Compare FrontEndGoogleUserId (from token) with StoredGoogleUserID (corresponding to profile ID)
    // 5) If both match, the logged in user (from token) has the same google ID as that which is associated with the profile user id
    // 6) Insert content (VideoLink) into user_content table

    app.post("/AddVideo", async (request, response) => {

        console.log('Add video route')
        token = request.body.token
        ProfileUserId = request.body.ProfileId
        VideoLink = request.body.VideoLink

        VerifiedTokenPayload = await verify(CLIENT_ID, token)
        var FrontEndGoogleUserId = VerifiedTokenPayload[0] //Google user ID

        if (!VerifiedTokenPayload) { //if value == false
            response.send('* Token verification FAIL: User not logged in *')

        } else { //Token has been verified

            // Now we ensure that this token corresponds to the ProfileUserId (the user Id seen in the browser url)
            try { // SELECT GOOGLE ID
                pool.query("SELECT google_user_id FROM user_profile WHERE user_id = ?", ProfileUserId, (error, result) => { // value of app user id on row of google user id 

                    StoredGoogleUserID = result[0].google_user_id

                    if (FrontEndGoogleUserId == StoredGoogleUserID) {
                        console.log('Authorised user editing correct profile')
                        InsertData = { user_id: ProfileUserId, content: VideoLink }
                        // ADD VIDEO LINK TO DATA BASE
                        try { // INSET VIDEO
                            pool.query('INSERT INTO user_content SET ?', InsertData, (error, result) => {
                            });
                            response.send('New Video Added')
                        } catch (error) {
                            console.log('Something went wrong, video not added: ', error)
                            response.send('Video not Added')
                        }
                    } else {
                        console.log('FrontEnd token Id does not match BackEnd Google ID')
                        response.send('Video not Added')
                    }
                }); // END OF: SELECT GOOGLE ID
            } catch (error) {
                console.log('Error from check that token matches profile')
                response.send('Video not Added')
            }
        }
    })



    //////////////////////////////////////////////////////////////////
    //// *** SIGN OUT *** ////
    //////////////////////////////////////////////////////////////////

    // SIGN OUT ROUTE
    app.get('/SignOut', (req, res) => {
        res.clearCookie('USER_SESSION_TOKEN'); // This works by clearing the cookies from a user's browsers. No cookie = no token = user signed out.
        res.send('CookieDeleted')
        console.log('Cookie deleted')
    })

    // UNLOGGED LANDING PAGE
    app.get('/LoggedOutPage', (req, res) => {
        res.render('LoggedOutPage');

    })



};
module.exports = router;