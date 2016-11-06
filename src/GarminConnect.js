const request               = require('request');
const garminConnectLogin    = 'https://sso.garmin.com/sso/login?service=https%3A%2F%2Fconnect.garmin.com%2Fpost-auth%2Flogin&webhost=olaxpw-connect04&source=https%3A%2F%2Fconnect.garmin.com%2Fen-US%2Fsignin&redirectAfterAccountLoginUrl=https%3A%2F%2Fconnect.garmin.com%2Fpost-auth%2Flogin&redirectAfterAccountCreationUrl=https%3A%2F%2Fconnect.garmin.com%2Fpost-auth%2Flogin&gauthHost=https%3A%2F%2Fsso.garmin.com%2Fsso&locale=en_US&id=gauth-widget&cssUrl=https%3A%2F%2Fstatic.garmincdn.com%2Fcom.garmin.connect%2Fui%2Fcss%2Fgauth-custom-v1.1-min.css&clientId=GarminConnect&rememberMeShown=true&rememberMeChecked=false&createAccountShown=true&openCreateAccount=false&usernameShown=false&displayNameShown=false&consumeServiceTicket=false&initialFocus=true&embedWidget=false&generateExtraServiceTicket=false';
const garminConnectPostAuth = 'https://connect.garmin.com/post-auth/login?';
const garminConnectWeights  = 'https://connect.garmin.com/modern/proxy/userprofile-service/userprofile/personal-information/weightWithOutbound/filterByDay?from=0&until=9999999999999&_=1478359936529';

module.exports = function getGarminWeights(username, password) {
  return new Promise((resolve, reject) => {
    var j = request.jar();
    var requestJar = request.defaults({
      jar: j
    });
    requestJar(garminConnectLogin, function (err, xhr) {
      if (err || xhr.statusCode != 200) {
        return reject('Could not get login page' + xhr.statusCode);
      }

      requestJar({
        uri   : garminConnectLogin,
        form  : {
          username,
          password,
          'embed'              : 'true',
          'lt'                 : 'e1s1',
          '_eventId'           : 'submit',
          'displayNameRequired': 'false'
        },
        method: 'POST'
      }, function (err, xhr) {
        if (err || (xhr.statusCode != 200 && xhr.statusCode != 302)) {
          return reject('Could not post login page');
        }

        var loginSuccess = false;
        xhr.headers['set-cookie'].forEach(function (cookie) {
          if (cookie.indexOf('CASTGC') === 0) {
            loginSuccess = true;
            var ticket   = cookie.substr(11, cookie.indexOf(';') - 11);

            requestJar(garminConnectPostAuth + 'ticket=ST-0' + ticket, function (err, xhr) {
              if (err || xhr.statusCode != 200) {
                return reject('Could not get post auth page ' + garminConnectPostAuth + 'ticket=ST-0' + ticket + ' | result: ' + (xhr ? xhr.statusCode : 'noxhr'));
              }

              requestJar("https://connect.garmin.com/legacy/session", function (err, xhr) {
                if (err || xhr.statusCode != 200) {
                  return reject('Could not get legacy session');
                }

                requestJar(garminConnectWeights, function (err, xhr, body) {
                  if (err || xhr.statusCode != 200) {
                    return reject('Could not get weight data', xhr.statusCode);
                  }

                  resolve(JSON.parse(body));
                });
              });
            });
          }
        });
        if (!loginSuccess) {
          reject('Bad username or password, could not get ticket # from cookie');
        }
      });
    });
  });
};
