var express = require('express');
var userDetail = require('./../node/user_details');
var userDao = require('./../node/dao/user.dao');
var doctorDao = require('./../node/dao/doctor.dao');

var router = express.Router();

router.post('/login', function (req, res, next) {
  var reqBody = req.body;

  var userName = reqBody.userName;
  var password = reqBody.password;

  if (userName == null) {
    res.send({
      status: 'failed',
      message: "user name can't be blank"
    });
    return;
  }

  if (userName.trim() == userDetail.DR_ASSISTANT_NAME) {
    res.send({
      status: 'failed',
      message: "I have never seen any bot logging in"
    });
    return;
  }

  if (password == null) {
    res.send({
      status: 'failed',
      message: "password can't be blank"
    });
    return;
  }

  if (userName !== password) {
    res.send({
      status: 'failed',
      message: "user name and password combination is not valid"
    });
    return;
  }

  req.session.appData = {
    id: userName.trim(),
    userName: userName
  };

  userDao.createUserEntry(userName);

  res.send({
    status: 'success',
    message: "login success"
  });
});


router.get('/currentUser', function (req, res, next) {

  var userData = {
    loggedIn: false,
    userName: null
  };

  if (req.session.appData !== undefined && req.session.appData !== null) {
    userData.loggedIn = true;
    userData.userName = req.session.appData.userName;
  }

  res.send(userData);
});

router.get('/logout', function (req, res, next) {

  req.session.destroy(function (err) {
    console.log("Session destroyed");
  });

  res.send({
    status: 'success',
    message: "logout success"
  });

});

router.post('/designation', function (req, res, next) {

  var userName = req.body.userName;

  doctorDao.findDesignation(userName, function (designation) {
    res.send({
      designation: designation
    });
  });

});

module.exports = router;