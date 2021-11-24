const http = require('http');
const express = require('express');
const ejs = require('ejs');

const app = express();
const server = http.createServer(app);

const hostname = '127.0.0.1';
const port = 3000;

var serviceAccount = require("./boo-library-firebase-adminsdk-1girc-5b4078cab2.json");
var admin = require("firebase-admin");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

app.set('view engine', 'ejs');
app.set('views', './views');
app.use(express.static(__dirname + '/public'));
app.use(express.urlencoded({ extended: true }))

app.get('/', (req, res) => {
  res.render('index');
});
app.get('/startTest', (req, res) => {
  res.render('startTest');
});
app.get('/test', (req, res) => {
  res.render('test');
});

//userInfo form 제출 (POST)
app.post('/Intro', async function(req, res) {
  console.log(req.body);

  var nick = req.body.nick;
  var major = req.body.major;
  var id = req.body.email;
  var pw = Math.random().toString(36).slice(2);
  console.log("pw: ", pw);
  const toDB = await db.collection(major).add({
    nickName : nick,
    major : major,
    email : id
  });
  console.log("toDB is: ", toDB);

  var check = 'true';
  if(check == 'true'){
    admin
      .auth()
      .createUser({
        email: req.body.email,
        password : pw,
        displayName: nick,
      })
      .then((userRecord)=>{
        console.log('Success', userRecord);
      })
      .catch((error)=>{
        console.log('Error', error);
      });
      res.json({msg: "success"});
    }
});



server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});