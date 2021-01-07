// DEFINE APP
const router = app => {

    app.get('/', (req, res)=> {
        res.send("So this message is coming from your app, which is also known as your server!");
    });

   
};
//ONCE THE ROUTER IS BUILT (ABOVE), WE EXPORT IT SO IT CAN BE USED IN THE APPLICATION
module.exports = router;