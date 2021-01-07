// DEFINE APP
const router = app => {

    app.get('/', (request, response)=> {
        response.send("So this message is coming from your app, which is also known as your server!");
    });


    app.get('/lyrics', (request, response)=>{
        response.send("And that smell of sweet perfume comes drifting through The cool night air like Shalimar")
    });

    app.get('/name', (request, response)=>{
        response.send('hey [put your name here], are you getting the hang of this yet?')
    })

};
module.exports = router;