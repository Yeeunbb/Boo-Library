const http = require('http');
const express = require('express');
const session = require('express-session');
const ejs = require('ejs');

const app = express();
const server = http.createServer(app);

//DB 정보
var serviceAccount = require("./boo-library-firebase-adminsdk-1girc-5b4078cab2.json");
var admin = require("firebase-admin");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

//Naver 검색 api
const NAVER_CLIENT_ID = '1NocLRDOeeZo5fptyb4n';
const NAVER_CLIENT_SECRET = 'QSZvjQ6x12';
const request = require('request');

app.set('view engine', 'ejs');
app.set('views', './views');
app.use(express.static(__dirname + '/public'));
app.use(express.urlencoded({ extended: true }))
//브라우저 쿠키 사용
app.use(session({
  secret:"qwef!#@#12opiozcxz^",
  resave: false,
  saveUninitialized : true
}));

//mainPage
app.get('/', (req, res) => {
  if(req.session.isLogined == true) //로그인 한 사용자의 경우
    return res.render('mainPage', {
      boo : req.session.booType
    });
  else
    return res.render('index'); //첫 방문인 경우
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
    boo : req.session.booType,
    nick : req.session.nickName
  });
});
app.get('/Main', (req, res) => {
  res.render('mainPage');
});
app.get('/Search', (req, res) => {
  res.render('bookSearch');
});
app.get('/writeDetail', (req, res) => {
  res.render('writeBookDetail');
})
app.get('/MyPage', (req, res) =>{
  res.render('myLibrary');
})

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

  const nickRef = db.collection('userInfo').doc(nick);
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

  setBooType(req.session.nickName, booType);
  req.session.booType = booType;
  res.json({msg: booType});
});


//책 이름으로 검색하기
app.post('/searchBook', async function(req, res) {
  var bookName = req.body.book;
  var dataList = new Array();
  console.log("book Title: ", bookName);

  getBookData(bookName).then(function(bookData){
    for(var book in bookData.items){
      //console.log(json.items[book].title);
      var data = new Object();
      //제목
      var title = bookData.items[book].title;
      title = title.replace(/<b>/g, '');
      data.title = title.replace(/<\/b>/g, '');
      //작가
      var author = bookData.items[book].author; 
      author = author.replace(/<b>/g, '');
      data.author = author.replace(/<\/b>/g, '');
      //출판사
      var publisher = bookData.items[book].publisher; 
      publisher = publisher.replace(/<b>/g, '');
      data.publisher = publisher.replace(/<\/b>/g, '');
      //출간일
      data.pubdate = bookData.items[book].pubdate; 
      //책 커버
      data.image = bookData.items[book].image; 
      //데이터 푸시
      dataList.push(data);
    }
    //console.log(dataList);
    res.json(dataList);
  });
});

app.post('/review', async function(req, res) {
  console.log(req.body);
  var nickname = req.session.nickName;
  var title = req.body.title;
  var author = req.body.author;
  var publish = req.body.publish;
  var date = req.body.date;
  var cover = req.body.cover;
  var motiv = req.body.motiv;
  var funNum = req.body.funPoint;
  var funCom = req.body.funComment;
  var readNum = req.body.readPoint;
  var readCom = req.body.readComment;
  var usefNum = req.body.usefPoint;
  var usefCom = req.body.usefComment;
  var literNum = req.body.literacyPoint;
  var literCom = req.body.literacyComment;
  var msgNum = req.body.msgPoint;
  var msgCom = req.body.msgComment;
  var intro = req.body.introComment;
  var like = req.body.like;

  updateReview(nickname, title, author, publish, date, cover,
    motiv, funNum, funCom, readNum, readCom, usefNum, usefCom,
    literNum, literCom, msgNum, msgCom, intro, like);
  
  res.json({msg: "success"});

});


async function getBookData(bookName){
  return new Promise(function(resolve, reject) {
    const option = {
      query : bookName, //검색어
      display : 10, //가져올 검색 결과 수
      start : 1,
    }
    request.get({
      uri: 'https://openapi.naver.com/v1/search/book.json',
      qs : option,
      headers: {
        'X-Naver-Client-Id' : NAVER_CLIENT_ID,
        'X-Naver-Client-Secret' : NAVER_CLIENT_SECRET
      }
        }, function(err, res, body){  
            let bookInfos = JSON.parse(body);
            resolve(bookInfos);
     });
  });
}


async function updateData(nickname, major, email) {
  const userRef = await db.collection('userInfo').doc(nickname).set({
    nickName : nickname,
    major : major,
    email : email,
    booType : 'none'
  });
  // console.log("DB is:  ", userUD);
}

async function updateReview(
  nickname, title, author, publish, date, cover, motiv,
  funNum, funCom, readNum, readCom, usefNum, usefCom, literNum, literCom,
  msgNum, msgCom, intro, like
){
  const reviewRef = await db
    .collection('userBookData')
    .doc(nickname)
    .collection('bookDB')
    .doc(title)
    .set({
      title : title,
      author : author,
      publish : publish,
      date : date,
      cover : cover,
      motiv : motiv,
      funPoint : funNum,
      funComment : funCom,
      readPoint : readNum,
      readComment : readCom,
      usefPoint : usefNum,
      usefComment : usefCom,
      literacyPoint : literNum,
      literacyComment : literCom,
      msgPoint : msgNum,
      msgComment : msgCom,
      introComment : intro,
      like : like
    });
}

async function setBooType(nickname, btype){
  const userRef = db.collection('userInfo').doc(nickname);
  const res = await userRef.update({'booType' : btype});
}


// const hostname = '127.0.0.1';
const port = 3000;
server.listen(process.env.PORT || port, () => {
  console.log("app is running on port " + port);
});
//heroku 배포시 port를 지정하면 안됨.