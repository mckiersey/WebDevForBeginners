// LINK TO DATABASE CONNECTION
const pool = require('./config.js')

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
        console.log('post verification')

        const payload = ticket.getPayload();
        console.log(payload)
        const SubmittedUserId = payload['sub'];
        const UserName = payload.name
        return SubmittedUserId

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

    app.get('/users', (request, response) => {
        pool.query(`SELECT * FROM auth_data`, (error, result) => {
            if (error) throw error;

            response.send(result);
            console.log('all users: ' + result);
        });

    });

    // An API CALL THAT REQUIRES VERIFICATION FIRST
    app.post('/userA', async (request, response) => {
        token = request.body.token

        console.log('token = ', token)
        user = await verify(CLIENT_ID, token)
        console.log('value of verify function: ', user)
        if (!user) { //if verify function returns false (not user)
            console.log('User not logged in')
            response.send('User not logged in')

            // add login redirect           
        } else {
            // next logic
            console.log('verified user: ', user)
            // example: protected query
            pool.query(`SELECT * FROM auth_data`, (error, result) => {
                if (error) throw error;

                response.send(result);
                console.log('all users: ' + result);
            });
        }

    });

    // https://stackoverflow.com/a/65006287/6065710 - getting tokens

    // LOGOUT
    app.get('/logout', (req, res) => {
        res.clearCookie('session-token');
        res.redirect('/home')

    })

    // POST NEW USER TO DATABASE
    app.post('/login', async (request, response) => {
        console.log('login api call: ', request.body)

        let token = request.body.token
        response.cookie('MYSESSIONTOKEN', token) // passing a verified token to the browser
        response.send('Token set');
        console.log('token set')

        //var NewuserName = request.body.userName
        //var NewuserEmail = request.body.userEmail

    });
    /*
            var NewUserDetails = { user_id: SubmittedUserId, email: NewuserEmail }
            // check if user already exists in database
            try {
                pool.query("SELECT user_id FROM auth_data WHERE user_id = ?", SubmittedUserId, function (error, result, field) {
                    if (error) throw error;
                    console.log('error type:', error);
    
                    if (result.length === 0) {
                        console.log('inserting new user')
                        //new user logic
                        pool.query('INSERT INTO auth_data SET ?', NewUserDetails, (error, result) => {
                            response.send('New User ' + SubmittedUserId + ' Written to database')
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