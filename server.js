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
var FieldValue = admin.firestore.FieldValue;

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
  if(req.session.isLogined == true && req.session.nickName){ //로그인 한 사용자의 경우
    return res.render('mainPage', { //첫 방문이 아님.
      boo : req.session.booType
    });
  }else
    return res.render('index'); //첫 방문인 경우
});
app.get('/startTest', (req, res) => {
  if(req.session.isLogined == true && req.session.nickName){ //로그인 한 사용자의 경우
    return res.render('startTest');
  }else
  res.render('index');
});
app.get('/test', (req, res) => {
  res.render('test');
});
app.get('/afterTest', (req, res) => {
  res.render('afterTest');
});
app.get('/myBoo', (req, res) => {
  if(req.session.isLogined == true && req.session.nickName
    && req.session.booType != "none"){ //로그인 한 사용자의 경우
    return res.render('myBoo', {
      boo : req.session.booType,
      nick : req.session.nickName
    });
  }else if(req.session.isLogined == true && req.session.nickName
    && req.session.booType == "none"){
    return res.render('startTest');
  }else
    return res.render('index');
});
app.get('/Main', (req, res) => {
  res.render('mainPage');
});
app.get('/Search', (req, res) => {
  if(req.session.isLogined == true && req.session.nickName){ //로그인 한 사용자의 경우
    return res.render('bookSearch', {
      boo : req.session.booType,
      nick : req.session.nickName
    });
  }else
    return res.render('index');
});
app.get('/writeDetail', (req, res) => {
  res.render('writeBookDetail');
});
app.get('/MyPage', (req, res) =>{
  if(req.session.isLogined == true && req.session.nickName){ //로그인 한 사용자의 경우
    return res.render('myLibrary', {
      boo : req.session.booType,
      nick : req.session.nickName
    });
  }else
    return res.render('index');
});
app.get('/personalLibrary', (req, res) => {
  if(req.session.isLogined == true && req.session.nickName){ //로그인 한 사용자의 경우
    return res.render('personalLibrary');
  }else
    return res.render('index');
});
app.get('/editReview', (req, res) => {
  res.render('editReview');
});

app.post('/LoginCheck', async function(req, res){
  if(req.session.isLogined == true && req.session.nickName){ //로그인 한 사용자의 경우
    return res.json({msg: "login"}); 
  }else{
    return res.json({msg: "fail"});
  }
});

//userInfo form 제출 (POST)
app.post('/Intro', async function(req, res) {
  var nick = req.body.nick;
  var major = req.body.major;
  var id = req.body.email;
  var pw = Math.random().toString(36).slice(2); //랜덤 비번 생성

  var check = false;

  const nickRef = db.collection('userInfo').doc(nick);
  const doc = await nickRef.get();
  if(!doc.exists){
    //없는 닉네임. 가입 진행
    check = true;
  } else{ //이미 존재하는 닉네임을 친 경우
    //가입자 확인
    if(doc.data().email == id && doc.data().major == major){ //전공, 이멜도 정확히 쓴 경우
      req.session.isLogined = true;
      req.session.nickName = nick;
      if(doc.data().booType == "none"){ //booTest 아직 안한 경우
        req.session.booType = doc.data().booType;
        return res.json({msg: "success"});
      }else{ //booTest 까지 마친 경우
        req.session.booType = doc.data().booType;
        return res.json({msg: "login"}); 
      }
    }else{ //이미 존재하는 닉네임
      return res.json({msg: "nick-error"});
    }
  }

  //가입 확인 및 닉네임 중복검사
  admin
    .auth() 
    .getUserByEmail(id)
    .then((userRecord)=>{
      //이미 가입된 이메일
      check = false;
      return res.json({msg: "email-error"});
    })
    .catch((error)=>{
      //미가입자. 가입 진행
      check = true;
    });

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
        req.session.isLogined = true;
        req.session.nickName = nick;
        req.session.booType = "none";
        updateData(nick, major, id);
        return res.json({msg: "success"});
      })
      .catch((error)=>{
        return res.json({msg: "error"});
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

  //우선순위 가을 > 봄 > 여름 > 겨울
  var max = winter;
  var booType = 'winter';
  if(summer >= max){
    max = summer;
    booType = 'summer';
  }
  if(spring >= max){
    max = spring;
    booType = 'spring';
  }
  if(autumn >= max){
    booType = 'autumn';
  }

  setBooType(req.session.nickName, booType);
  req.session.booType = booType;
  res.json({msg: booType});
});


//책 이름으로 검색하기
app.post('/searchBook', async function(req, res) {
  var bookName = req.body.book;
  var dataList = new Array();

  getBookData(bookName).then(function(bookData){
    for(var book in bookData.items){
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
    res.json(dataList);
  });
});

//review 데이터 저장하기
app.post('/review', async function(req, res) {
  var nickname = req.session.nickName;
  var boo = req.session.booType;
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
  var like = Number(req.body.like);
  var date = new Date().getTime().toString();

  updateReview(nickname, boo, title, author, publish, date, cover,
    motiv, funNum, funCom, readNum, readCom, usefNum, usefCom,
    literNum, literCom, msgNum, msgCom, intro, like, date);
  
  res.json({msg: "success"});
});

//수정한 리뷰 저장하기 -edit에서 사용
app.post('/editreviewsave', async function(req, res) {
  var nickname = req.session.nickName;
  var boo = req.session.booType;
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
  var like = Number(req.body.like);
  var date = new Date().getTime().toString();

  updateEditReview(nickname, boo, title, author, publish, date, cover,
    motiv, funNum, funCom, readNum, readCom, usefNum, usefCom,
    literNum, literCom, msgNum, msgCom, intro, like, date);
  
  res.json({msg: "success"});
});


//review한 책 목록 불러오기(MY)
app.post('/loadReview', async function(req, res) {
  var dataList = new Array();
  var user = req.session.nickName;
  dataList.push(user);
  const bookRef = db.collection('userBookData').doc(user).collection('bookDB');
  const snapshot = await bookRef.get();
  snapshot.forEach(doc => {
    dataList.push(doc.data());
  });
  res.json(dataList);
});

//review한 책 불러오기(MY) - Edit 용
app.post('/editBookforLoad', async function(req, res) {
  var dataList = new Array();
  var user = req.session.nickName;
  var bookTitle = req.body.bookTitle;

  const bookRef = db.collection('userBookData').doc(user).collection('bookDB');
  const snapshot = await bookRef.get();
  snapshot.forEach(doc => {
    if(doc.data().title == bookTitle){
      dataList.push(doc.data());
    }
  });
  res.json(dataList);
});

//review한 책 삭제하기 -delete
app.post('/deleteReview', async function(req, res) {
  var user = req.session.nickName;
  var bookTitle = req.body.bookTitle;

  if(deleteReview(user, bookTitle)){
    res.json({msg: "success"});
  }
});

//review한 책 목록 불러오기(Other)
app.post('/loadPersonalReview', async function(req, res) {
  var dataList = new Array();
  var loginUser = req.session.nickName;
  var user = req.body.pageOwner;
  const bookRef = db.collection('userBookData').doc(user).collection('bookDB');
  const snapshot = await bookRef.get();
  snapshot.forEach(doc => {
    dataList.push(doc.data());
    //dataList.push(doc.data());
  });
  res.json(dataList);
});

//like 눌른 리뷰인지 확인
app.post('/loadlikeInfo', async function(req, res) {
  var dataList = new Array();

  var user = req.session.nickName;
  var pageOw = req.body.pageOwner;
  var title = req.body.bookTitle;
  var check = true;

  const bookRef = db.collection('userBookData').doc(user).collection('likeBookDB');
  const snapshot = await bookRef.get();

  snapshot.forEach(doc => {
    if(doc.data().pageOw == pageOw){ //이미 좋아요 함.
        check = false;
        dataList.push(doc.data().title);
      }
  });
  if(check){
    return res.json({msg: "Nlike"});
  }else{
    return res.json(dataList);
  }
});

//인기 책 리스트 불러오기
app.post('/loadBestBooks', async function(req, res) {
  var dataList = new Array();

  const bookRef = db.collection('allReviewData').orderBy("like", "desc");
  const snapshot = await bookRef.get();
  snapshot.forEach(doc => {
    dataList.push(doc.data());
  });
  res.json(dataList);
});

//좋아요 누른 책 모두 불러오기
//like 눌른 리뷰인지 확인
app.post('/loadWishBooks', async function(req, res) {
  var dataList = new Array();

  var user = req.session.nickName;
  var check = true;

  const bookRef = db.collection('userBookData').doc(user).collection('likeBookDB');
  const snapshot = await bookRef.get();

  snapshot.forEach(doc => {
    dataList.push(doc.data());
  });
  res.json(dataList);
});

//like한 책이 delete됐는지 확인하는 용
app.post('/checkdeletebook', async function(req, res) {
  var user = req.session.nickName;
  var bookTitle = req.body.bookTitle;
  var pageOw = req.body.pageOw;
  var check = true;

  const bookRef = db.collection('userBookData').doc(pageOw).collection('bookDB');
  const snapshot = await bookRef.get();
  snapshot.forEach(doc => {
    if(doc.data().title == bookTitle){
      check = false;
      return res.json({msg : "have"}); //리뷰 존재
    }
  });
  if(check){ //리뷰 없으면 내 like에서도 삭제
    const myRef = db.collection('userBookData').doc(user).collection('likeBookDB');
    const snpshot2 = await myRef.get();
    var docIdinU;
    var docIdinA;
    snpshot2.forEach(doc => {
      if(doc.data().title == bookTitle){
        docIdinU = doc.id;
      }
    });
    const ownerReview = db.collection('userBookData').doc(user)
    .collection('likeBookDB').doc(docIdinU).delete();
    return res.json({msg : "deleted"});
  }
});

//like한 책이 delete됐는지 확인하는 용 -all 데이터에서
app.post('/checkdeletebookinAll', async function(req, res) {
  var bookTitle = req.body.bookTitle;
  var pageOw = req.body.pageOw;
  var check = true;

  const bookRef = db.collection('userBookData').doc(pageOw).collection('bookDB');
  const snapshot = await bookRef.get();
  snapshot.forEach(doc => {
    if(doc.data().title == bookTitle){
      check = false;
      return res.json({msg : "have"}); //리뷰 존재
    }
  });

  if(check){ //리뷰가 없으면 allReviewData에서도 삭제
    const allRef = db.collection('allReviewData');
    const snapshot3 = await allRef.get();
    snapshot3.forEach(doc => {
      if(doc.data().nick == pageOw && doc.data().title == bookTitle){
        docIdinA = doc.id;
      }
    });
    const allReview = db.collection('allReviewData').doc(docIdinA).delete();
    return res.json({msg : "deleted"});
  }
});



//모든 리뷰 불러오기
app.post('/loadAllReview', async function(req, res) {
  var dataList = new Array();

  const bookRef = db.collection('allReviewData').orderBy("date", "desc");
  const snapshot = await bookRef.get();
  snapshot.forEach(doc => {
    dataList.push(doc.data());
  });
  res.json(dataList);
});


//boo 타입 별 모든 리뷰 불러오기
app.post('/loadSeasonsReview', async function(req, res) {
  var dataList = new Array();
  var season = req.body.booType;

  const bookRef = db.collection('allReviewData');
  const snapshot = await bookRef.where('booType', '==', season).get();
  snapshot.forEach(doc => {
    dataList.push(doc.data());
  });
  res.json(dataList);
});

//좋아요 기능
app.post('/updateLike', async function(req, res) {
  var check = true;
  var user = req.session.nickName;
  var pageOw = req.body.pageOw;
  var owBoo = req.body.booType;
  var bookTitle = req.body.bookTitle;
  var bookCover = req.body.bookCover;
  var flag = req.body.like; //true면 이미 좋아요 된 것.
  var date = new Date().getTime().toString();


  if(flag=="true"){ //좋아요 취소를 진행함.
    const bookRef = db.collection('userBookData').doc(user).collection('likeBookDB');
    const snapshot = await bookRef.get();
    snapshot.forEach(doc => {
      if(doc.data().pageOw == pageOw && doc.data().title == bookTitle){
        //user의 likeBookDB에서 데이터 삭제
        updateLikeBook(false, user, pageOw, owBoo, bookTitle, bookCover, date, doc.id);
        updateLikeNum(false, pageOw, bookTitle);
      }
    });
    return res.json({msg: "unlike"});
  }else{ //좋아요 반영시작.
    updateLikeBook(true, user, pageOw, owBoo, bookTitle, bookCover, date, 'none');
    updateLikeNum(true, pageOw, bookTitle);
    return res.json({msg: "like"});
  }
});


async function getBookData(bookName){
  return new Promise(function(resolve, reject) {
    const option = {
      query : bookName, //검색어
      display : 15, //가져올 검색 결과 수
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
}

async function updateReview(
  nickname, boo, title, author, publish, date, cover, motiv,
  funNum, funCom, readNum, readCom, usefNum, usefCom, literNum, literCom,
  msgNum, msgCom, intro, like, date
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

    var check = true;
    const allreviewRef = db.collection('allReviewData');
    const snpashot = await allreviewRef.get();
    snpashot.forEach(doc => {
      if(doc.data().nick == nickname && doc.data().title == title){
        check = false; //이미 등록됐다.
      }
    });

    if(check){
      const updateallReviewRef = await db
      .collection('allReviewData')
      .doc(date)
      .set({
        nick : nickname,
        booType : boo,
        title : title,
        cover : cover,
        date : date,
        funPoint : funNum,
        readPoint : readNum,
        usefPoint : usefNum,
        literacyPoint : literNum,
        msgPoint : msgNum,
        like : like
      });
    }
}

async function updateEditReview(
  nickname, boo, title, author, publish, date, cover, motiv,
  funNum, funCom, readNum, readCom, usefNum, usefCom, literNum, literCom,
  msgNum, msgCom, intro, like, date
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

    const allreviewRef = db.collection('allReviewData');
    const snpashot = await allreviewRef.get();
    snpashot.forEach(doc => {
      if(doc.data().nick == nickname && doc.data().title == title){
        allreviewdocs = doc.id;
      }
    });
    const ownerReview = db.collection('allReviewData').doc(allreviewdocs)
    .set({
      nick : nickname,
      booType : boo,
      title : title,
      cover : cover,
      date : date,
      funPoint : funNum,
      readPoint : readNum,
      usefPoint : usefNum,
      literacyPoint : literNum,
      msgPoint : msgNum,
      like : like
    });
}

async function updateLikeBook(plus, user, nickname, boo, title, cover, time, docs){
  if(plus){ // 데이터 추가 (좋아요 누름)
    const likeRef = await db
    .collection('userBookData')
    .doc(user)
    .collection('likeBookDB')
    .doc(time)
    .set({
      pageOw : nickname,
      booType : boo,
      title : title,
      cover : cover
    });
  }else{ //데이터 삭제 (좋아요 취소)
    const likeRef = await db
    .collection('userBookData')
    .doc(user)
    .collection('likeBookDB')
    .doc(docs)
    .delete();
  }
}

async function updateLikeNum(plus, nick, title){
  var allreviewdocs;
  const likeRef = db.collection('userBookData').doc(nick).collection('bookDB').doc(title);
  const reviewRef = db.collection('allReviewData');
  const snpashot = await reviewRef.get();
  snpashot.forEach(doc => {
    if(doc.data().nick == nick && doc.data().title == title){
      allreviewdocs = doc.id;
    }
  });
  const ownerReview = db.collection('allReviewData').doc(allreviewdocs);
  if(plus){ //like 증가 (좋아요 누름)
    const res = await likeRef.update({
      like: FieldValue.increment(1)
    });
    const res2 = await ownerReview.update({
      like: FieldValue.increment(1)
    });    
  }else{ //like 감소 (좋아요 취소)
    const res = await likeRef.update({
      like: FieldValue.increment(-1)
    });
    const res2 = await ownerReview.update({
      like: FieldValue.increment(-1)
    });    
  }
}

async function deleteReview(user, title){
  var allreviewdocs;
  const likeRef = db.collection('userBookData').doc(user).collection('bookDB').doc(title).delete();
  const reviewRef = db.collection('allReviewData');
  const snpashot = await reviewRef.get();

  snpashot.forEach(doc => {
    if(doc.data().nick == user && doc.data().title == title){
      allreviewdocs = doc.id;
    }
  });
  const ownerReview = db.collection('allReviewData').doc(allreviewdocs).delete();
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