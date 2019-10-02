const request = require('request');
const garminConnectLogin = 'https://sso.garmin.com/sso/signin?service=https%3A%2F%2Fconnect.garmin.com%2Fmodern%2F&webhost=https%3A%2F%2Fconnect.garmin.com%2Fmodern%2F&source=https%3A%2F%2Fconnect.garmin.com%2Fsignin&redirectAfterAccountLoginUrl=https%3A%2F%2Fconnect.garmin.com%2Fmodern%2F&redirectAfterAccountCreationUrl=https%3A%2F%2Fconnect.garmin.com%2Fmodern%2F&gauthHost=https%3A%2F%2Fsso.garmin.com%2Fsso&locale=en_US&id=gauth-widget&cssUrl=https%3A%2F%2Fstatic.garmincdn.com%2Fcom.garmin.connect%2Fui%2Fcss%2Fgauth-custom-v1.2-min.css&privacyStatementUrl=https%3A%2F%2Fwww.garmin.com%2Fen-US%2Fprivacy%2Fconnect%2F&clientId=GarminConnect&rememberMeShown=true&rememberMeChecked=false&createAccountShown=true&openCreateAccount=false&displayNameShown=false&consumeServiceTicket=false&initialFocus=true&embedWidget=false&generateExtraServiceTicket=true&generateTwoExtraServiceTickets=false&generateNoServiceTicket=false&globalOptInShown=true&globalOptInChecked=false&mobile=false&connectLegalTerms=true&showTermsOfUse=false&showPrivacyPolicy=false&showConnectLegalAge=false&locationPromptShown=true&showPassword=true';
const garminConnectPostAuth = 'https://connect.garmin.com/modern/?';
const garminConnectWeights = 'https://connect.garmin.com/modern/proxy/userprofile-service/userprofile/personal-information/weightWithOutbound/filterByDay?from=0&until=9999999999999&_=1478359936529';

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

      let csrf = xhr.body.substr(xhr.body.indexOf('"_csrf"') + 15);
      csrf = csrf.substr(0, csrf.indexOf('"'));

      requestJar({
        uri: garminConnectLogin,
        form: {
          username,
          password,
          'embed': 'true',
          '_csrf': csrf
        },
        method: 'POST',
        headers: {
          referer: 'https://sso.garmin.com/sso/signin?service=https%3A%2F%2Fconnect.garmin.com%2Fmodern%2F&webhost=https%3A%2F%2Fconnect.garmin.com%2Fmodern%2F&source=https%3A%2F%2Fconnect.garmin.com%2Fsignin%2F&redirectAfterAccountLoginUrl=https%3A%2F%2Fconnect.garmin.com%2Fmodern%2F&redirectAfterAccountCreationUrl=https%3A%2F%2Fconnect.garmin.com%2Fmodern%2F&gauthHost=https%3A%2F%2Fsso.garmin.com%2Fsso&locale=en_US&id=gauth-widget&cssUrl=https%3A%2F%2Fstatic.garmincdn.com%2Fcom.garmin.connect%2Fui%2Fcss%2Fgauth-custom-v1.2-min.css&privacyStatementUrl=https%3A%2F%2Fwww.garmin.com%2Fen-US%2Fprivacy%2Fconnect%2F&clientId=GarminConnect&rememberMeShown=true&rememberMeChecked=false&createAccountShown=true&openCreateAccount=false&displayNameShown=false&consumeServiceTicket=false&initialFocus=true&embedWidget=false&generateExtraServiceTicket=true&generateTwoExtraServiceTickets=false&generateNoServiceTicket=false&globalOptInShown=true&globalOptInChecked=false&mobile=false&connectLegalTerms=true&showTermsOfUse=false&showPrivacyPolicy=false&showConnectLegalAge=false&locationPromptShown=true&showPassword=true'
        }
      }, function (err, xhr) {
        if (err || (xhr.statusCode != 200 && xhr.statusCode != 302)) {
          return reject('Could not post login page');
        }

        const ticketLocation = xhr.body.indexOf('?ticket=')
        if (ticketLocation === -1) {
          return reject('Bad username or password')
        }

        let ticket = xhr.body.substr(ticketLocation + 8);
        ticket = ticket.substr(0, ticket.indexOf('"'));

        requestJar(garminConnectPostAuth + 'ticket=' + ticket, function (err, xhr) {
          if (err || xhr.statusCode != 200) {
            return reject('Could not get post auth page ' + garminConnectPostAuth + 'ticket=ST-0' + ticket + ' | result: ' + (xhr ? xhr.statusCode : 'noxhr'));
          }

          requestJar(garminConnectWeights, function (err, xhr, body) {
            if (err || xhr.statusCode != 200) {
              return reject('Could not get weight data', xhr.statusCode);
            }

            resolve(JSON.parse(body));
          });
        });
        
      });
    });
  });
};
