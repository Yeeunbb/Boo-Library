const http = require('http');
const express = require('express');
const session = require('express-session');
const ejs = require('ejs');

const app = express();
const server = http.createServer(app);

var serviceAccount = require("./boo-library-firebase-adminsdk-1girc-5b4078cab2.json");
var admin = require("firebase-admin");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
const NAVER_CLIENT_ID = '1NocLRDOeeZo5fptyb4n';
const NAVER_CLIENT_SECRET = 'QSZvjQ6x12';
const option = {
  query : '소크라테스의 변명', //검색어
  display : 5, //가져올 검색 결과 수
  start : 1,

}
const request = require('request');

app.set('view engine', 'ejs');
app.set('views', './views');
app.use(express.static(__dirname + '/public'));
app.use(express.urlencoded({ extended: true }))
app.use(session({
  secret:"qwef!#@#12opiozcxz^",
  resave: false,
  saveUninitialized : true
}));

app.get('/', (req, res) => {
  // request.get({
  //   uri: 'https://openapi.naver.com/v1/search/book.json',
  //   qs : option,
  //   headers: {
  //     'X-Naver-Client-Id' : NAVER_CLIENT_ID,
  //     'X-Naver-Client-Secret' : NAVER_CLIENT_SECRET
  //   }
  // }, function(err, res, body){
  //   let json = JSON.parse(body);
  //   for(var book in json.items){
  //     console.log(json.items[book].title);
  //   }
  //   // console.log(json.items[0].title);
  // });
    
  if(req.session.isLogined == true)
    return res.render('myBoo', {
      boo : req.session.booType
    });
  else
    return res.render('index');
  // res.render('index');
});
app.get('/startTest', (req, res) => {
  res.render('startTest');
});
app.get('/test', (req, res) => {
  res.render('test');
});
app.get('/afterTest', (req, res) => {
  res.render('afterTest');
});
app.get('/myBoo', (req, res) => {
  res.render('myBoo', {
    boo : req.session.booType
  });
});

//userInfo form 제출 (POST)
app.post('/Intro', async function(req, res) {
  console.log(req.body);
  var nick = req.body.nick;
  var major = req.body.major;
  var id = req.body.email;
  var pw = Math.random().toString(36).slice(2); //랜덤 비번 생성
  console.log("pw: ", pw);

  var check = false;

  //가입 확인 및 닉네임 중복검사
  admin
    .auth() 
    .getUserByEmail(id)
    .then((userRecord)=>{
      //이미 가입된 이메일
      res.json({msg: "email-error"});
    })
    .catch((error)=>{
      //미가입자. 가입 진행
      check = true;
    });

  const nickRef = db.collection('nickName').doc(nick);
  const doc = await nickRef.get();
  if(!doc.exists){
    //없는 닉네임. 가입 진행
    check = true;
  } else{
    //이미 존재하는 닉네임.
    res.json({msg: "nick-error"});
    check = false;
  }

  //db에 회원 정보 저장
  if(check){
    admin
      .auth()
      .createUser({
        email: req.body.email,
        password : pw,
        displayName: nick,
      })
      .then((userRecord)=>{
        console.log('Success', userRecord);
        req.session.isLogined = true;
        req.session.nickName = nick;
        updateData(nick, major, id);
        res.json({msg: "success"});
      })
      .catch((error)=>{
        console.log('Error', error);
        res.json({msg: "error"});
      });
  }
});

//BooType test결과 받아오기
app.post('/testRes', async function(req, res) {
  var testRes = req.body.testRes;
  var spring = 0;
  var summer = 0;
  var autumn = 0;
  var winter = 0;
  console.log("res: ", testRes);
  for (var i=0; i<10; i++){
    if(i==6){
      if(testRes[i]=='1' || testRes[i]=='2'){
        autumn++;
        winter++;
      }else{
        spring++;
        summer++;
      }
      continue;
    }
    if(testRes[i]=='1') summer++;
    if(testRes[i]=='2') spring++;
    if(testRes[i]=='3') autumn++;
    if(testRes[i]=='4') winter++;
  }
  console.log(summer, spring, autumn, winter);

  //우선순위 여름 > 가을 > 봄 > 겨울
  var max = winter;
  var booType = 'winter';
  if(spring >= max){
    max = spring;
    booType = 'spring';
  }
  if(autumn >= max){
    max = autumn;
    booType = 'autumn';
  }
  if(summer >= max){
    booType = 'summer';
  }

  setBooType('예니3', booType);
  req.session.booType = booType;
  res.json({msg: booType});
});


async function updateData(nickname, major, email) {
  const userUD = await db.collection('dataByMajor').doc(major).set({
    like : 0,
    dislike : 0,
  });
  const nickUD = await db.collection('nickName').doc(nickname).set({
    nickName : nickname,
    major : major,
    email : email,
    booType : 'none'
  });
  // console.log("DB is:  ", userUD);
}

async function setBooType(nickname, btype){
  const userRef = db.collection('nickName').doc(nickname);
  const res = await userRef.update({'booType' : btype});
}


// const hostname = '127.0.0.1';
const port = 3000;
server.listen(port, () => {
  console.log("app is running on port " + port);
});
