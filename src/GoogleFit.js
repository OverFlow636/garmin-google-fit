const google             = require('googleapis');
const OAuth2             = google.auth.OAuth2;
const fitness            = google.fitness('v1');
const weightDataStreamId = 'derived:com.google.weight:com.google.android.gms:merge_weight';
const auth               = require('./../client_id.json');
const scopes             = [
  'https://www.googleapis.com/auth/fitness.body.read',
  'https://www.googleapis.com/auth/fitness.body.write'
];
const newSource = {
  "dataStreamName": "garmin-google-fit",
  "type"          : "derived",
  "application"   : {
    "detailsUrl": "http://garmin.overflow636.com",
    "name"      : "Garmin Connect Google Fit Importer",
    "version"   : "1"
  },
  "dataType"      : {
    "field": [
      {
        "name"  : "weight",
        "format": "floatPoint"
      }
    ],
    "name" : "com.google.weight"
  },
  "device"        : {
    "manufacturer": "Garmin",
    "model"       : "Connect",
    "type"        : "Scale",
    "uid"         : "1000001",
    "version"     : "1.0"
  }
};
const oauth2Client       = new OAuth2(
  auth.web.client_id,
  auth.web.client_secret,
  process.env.NODE_ENV === 'production' ? 'http://garmin.overflow636.com/fit' : 'http://localhost:2222/fit'
);

function getWeights(from) {
  return new Promise((resolve, reject) => {
    fitness.users.dataSources.datasets.get({
      userId      : 'me',
      dataSourceId: weightDataStreamId,
      datasetId   : (new Date(from ? from : '2010-1-1').getTime() * 1000000) + '-' + (new Date().getTime() * 1000000),
      auth        : oauth2Client
    }, {}, (err, response) => err ? reject(err) : resolve(response.point));
  });
}

function addDataSource() {
  return new Promise((resolve, reject) => {
    fitness.users.dataSources.create({
      userId  : 'me',
      resource: newSource,
      auth    : oauth2Client
    }, {}, (err, result) => err ? reject(err) : resolve(result));
  });
}

function listDataSources() {
  return new Promise((resolve, reject) => {
    fitness.users.dataSources.list({
      userId  : 'me',
      auth    : oauth2Client
    }, {}, (err, result) => err ? reject(err) : resolve(result));
  });
}

function addWeights(weights) {
  return new Promise((resolve, reject) => {
    var oldestToRecord   = weights[weights.length - 1].date;
    var latestToRecord   = weights[0].date;
    var newDataSetToPost = {
      dataSourceId  : 'derived:com.google.weight:198100505479:Garmin:Connect:1000001:garmin-google-fit',
      maxEndTimeNs  : latestToRecord * 1000000 + 1,
      minStartTimeNs: oldestToRecord * 1000000,
      point         : weights.map(function (toRecord) {
        return {
          dataTypeName      : 'com.google.weight',
          endTimeNanos      : toRecord.date * 1000000,
          originDataSourceId: toRecord.samplePk,
          startTimeNanos    : toRecord.date * 1000000,
          rawTimestampNanos : toRecord.date * 1000000,
          value             : [
            {
              fpVal: toRecord.weight / 1000 // garmin (grams) to google fit (kilograms)
            }
          ]
        };
      })
    };

    fitness.users.dataSources.datasets.patch({
      userId      : 'me',
      resource    : newDataSetToPost,
      dataSourceId: 'derived:com.google.weight:198100505479:Garmin:Connect:1000001:garmin-google-fit',
      datasetId   : (oldestToRecord * 1000000) + '-' + (latestToRecord * 1000000),
      auth        : oauth2Client
    }, {}, (err, result) => err ? reject(err) : resolve(result));
  });
}

function setAuthToken(token) {
  oauth2Client.setCredentials(token);
}

function oauth(code) {
  return new Promise((resolve, reject) => {
    if (code) {
      oauth2Client.getToken(code, (err, tokens) => err ? reject(err) : resolve(tokens));
    } else {
      resolve(oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope      : scopes
      }));
    }
  });
}

module.exports = {
  oauth,
  getWeights,
  addWeights,
  setAuthToken,
  addDataSource,
  listDataSources
};
