'use strict';

const app              = require('express')();
const getGarminWeights = require('./GarminConnect');
const googleFit        = require('./GoogleFit');
const messages         = {
  0              : false,
  success        : {
    title  : 'Successful Import',
    message: 'Garmin Connect weights were imported into Google Fit!',
    class  : 'success'
  },
  nothingToImport: {
    title  : 'No new data to import',
    message: 'Garmin Connect does not have any new weights to import.',
    class  : 'warning'
  },
  added          : {
    title  : 'Google Fit Data Source Created',
    message: 'Successfully created a data source on Google Fit',
    class  : 'success'
  },
  garminauth     : {
    title  : 'Garmin Connect',
    message: 'Your username or password was incorrect for Garmin Connect.',
    class  : 'error'
  }
};

app.engine('handlebars', require('express-handlebars')({
  defaultLayout: 'main'
}));

app.set('view engine', 'handlebars');

app.use(require('body-parser')
  .urlencoded({extended: false}));

app.use(require('cookie-session')({
  name   : 'session',
  expires: new Date('2100-1-1'),
  keys   : ['daffdafdsafdsafdsafsafsadhggfdhhgfhgfdhgfd', 'qrerrqewreqwreqwreqwrqwevvzvczxvcxvcxvcxvczxvczx']
}));

app.use(function (req, res, next) {
  if (req.session.googleAuth) {
    googleFit.setAuthToken(req.session.googleAuth);
  }
  next();
});

app.all('/', function (req, res) {
  if (req.body.username && req.body.password) {
    req.session.garminCreds = {
      username: req.body.username,
      password: req.body.password
    };
  }

  res.render('home', {
    session: req.session,
    message: messages[req.query.message || 0]
  });
});

app.get('/adddatasource', function (req, res) {
  googleFit.addDataSource()
    .catch((err) => {
      if (err.code === 409) {
        req.session.dataSource = true;
        res.redirect('/?message=added');
      }
      res.send(err);
    })
    .then(() => res.redirect('/?message=added'));
});

app.get('/importGarminToFit', function (req, res) {
  googleFit.getWeights()
    .then(function (googleFitWeights) {
      var lastGoogle = new Date('2010-1-1');
      if (googleFitWeights && googleFitWeights.length) {
        lastGoogle = new Date(googleFitWeights[googleFitWeights.length - 1].endTimeNanos / 1000000);
      }

      getGarminWeights(req.session.garminCreds.username, req.session.garminCreds.password)
        .then(function (garminConnectWeights) {

          // filter the weights down to the ones google fit does not have
          var toRecordOnGoogle = garminConnectWeights.filter(row => row.date > lastGoogle.getTime());

          // if there are any records, add them to google fit
          if (toRecordOnGoogle && toRecordOnGoogle.length > 0) {
            googleFit.addWeights(toRecordOnGoogle)
              .then(() => res.redirect('/?message=success'))
              .catch((err) => res.send(err));
          } else {
            res.redirect('/?message=nothingToImport')
          }
        })
        .catch(err => res.send(err));
    })
    .catch(err => res.send(err));
});

app.get('/fit', function (req, res) {
  if (req.query.code) {
    googleFit.oauth(req.query.code)
      .then((tokens) => {
        req.session.googleAuth = tokens;
        res.redirect('/');
      })
      .catch((err) => res.send(err));
  } else {
    googleFit.oauth()
      .then((url) => {
        res.redirect(url);
      });
  }
});

app.get('/googlefit', function (req, res) {
  googleFit.getWeights()
    .then(d => res.json(d))
    .catch(err => res.send(err));
});

app.get('/googlefitsources', function (req, res) {
  googleFit.listDataSources()
    .then(d => res.json(d))
    .catch(err => res.send(err));
});

app.get('/gcweights', function (req, res) {
  getGarminWeights(req.session.garminCreds.username, req.session.garminCreds.password)
    .then(data => {
      res.json(data)
    })
    .catch(err => {
      if (err.indexOf('username or password')) {
        req.session.garminCreds = null;
        return res.redirect('/?message=garminauth')
      }
      res.send(err);
    });
});

app.listen(2222, function () {
  console.log('Example app listening on port 2222!')
});
