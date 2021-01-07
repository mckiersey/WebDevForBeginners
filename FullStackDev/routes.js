// DEFINE APP
const router = app => {

    app.get('/', (request, response)=> {
        res.send("So this message is coming from your app, which is also known as your server!");
    });
};

module.exports = router;