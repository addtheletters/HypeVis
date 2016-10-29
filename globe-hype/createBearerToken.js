// based on a script by elmariachi111 on Github
var R = require("request");
var auth_data   = require('./auth_secret.js');

var key = auth_data.TWITTER_CONSUMER_KEY;
var secret = auth_data.TWITTER_CONSUMER_SECRET;
var cat = key +":"+secret;
var credentials = new Buffer(cat).toString('base64');

var url = 'https://api.twitter.com/oauth2/token';

R({ url: url,
    method:'POST',
    headers: {
        "Authorization": "Basic " + credentials,
        "Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"
    },
    body: "grant_type=client_credentials"

}, function(err, resp, body) {
    if(err){
        console.log(err);
    }
    console.dir(body);
});
