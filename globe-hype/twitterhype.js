// run with nodejs
// 

var fs          = require('fs');
var request     = require('request');
var Twitter     = require('twitter')
var auth_data   = require('./auth_secret.js');

var writeJSONFile = writeJSONFile || function( str, filename ){
    fs.writeFile(filename, JSON.stringify(str, null, 4), function(err){
        if(err){
            console.log("failed to write data to file. " + err);
        }
        else{
            console.log("successfully wrote to file " + filename);
        }
    });
}

var hype = hype || {};

(function(lib){

    lib.teams = [
        "ANX",
        "TSM",
        "SSG",
        "C9",
        "RNG",
        "ROX",
        "NOX",
        "SKT",
        "CLG",
        "H2K",
        "G2",
        "IM",
        "FW",
        "SPY",
        "EDG",
        "ITZ"
    ];

    //lib.TWITTER_URL = "https://api.twitter.com/1.1/search/tweets.json";
    lib.REQUEST_COUNT = 100;

    lib.LIMITER = 2;

    lib.EARTH_GEOCODE = "39.793945,-77.777400,100mi";
    
    lib.client = new Twitter({
      consumer_key: auth_data.TWITTER_CONSUMER_KEY,
      consumer_secret: auth_data.TWITTER_CONSUMER_SECRET,
      //bearer_token: auth_data.TWITTER_BEARER_TOKEN,
      access_token_key: auth_data.TWITTER_ACCESS_KEY,
      access_token_secret: auth_data.TWITTER_ACCESS_SECRET
    });

    lib.formTeamTag = function(team){
        return "#" + team + "WIN";
    };

    lib.formDataFilename = function(team){
        return "data_" + team + ".json";
    };

    lib.LOCATION_FILENAME = "locations.json";

    lib.searchTag = function(tag, callback, prevtweets){
        var alltweets = prevtweets || [];
        var i = 0;
        var skipped = 0;
        var processfunc = function(error, content, response) {
            if(error){
                console.log(error);
                callback(null, error); // idk man
                return;
            }
            i++;

            if(i > lib.LIMITER){
                console.log("Exceeded depth parameter, ending probe for " + tag + ".");
                callback(alltweets);
                return;
            }

            if(content["statuses"].length > 0){
                var min_id = content["search_metadata"].max_id;
                for(var k = 0; k < content["statuses"].length; k++){
                    if(alltweets.length > 0 && content["statuses"][k].id == content["search_metadata"].max_id){
                        // console.log("Previous tweet id " + content["statuses"][k].id + " was skipped.");
                        // console.log("Skipped tweet was " + content["statuses"][k].text );
                        //console.log("Top of list was " + alltweets[alltweets.length-1].text);
                        skipped ++;
                        continue;
                    }
                    min_id = (content["statuses"][k].id < min_id) ? content["statuses"][k].id : min_id;
                    alltweets.push(content["statuses"][k]);
                }
            }
            // console.log("min id was " + min_id);
            // console.log("found " + alltweets.length + " tweets so far.");
            // console.log("requested " + i + " times.");
            // console.log("skipped " + skipped + " repeats.");
            //alltweets = alltweets.concat(content["statuses"])
            //writeJSONFile(content, "tweets.txt");
            if(content["search_metadata"].count < lib.REQUEST_COUNT){
                console.log("done.");
                callback(alltweets);
                return;
            }
            else{
                // console.log("recreating with new max of " + min_id);
                lib.client.get('search/tweets', {q:tag, count:lib.REQUEST_COUNT, max_id:min_id, include_entities:false, geocode:lib.EARTH_GEOCODE}, processfunc, alltweets);
            }
        };
        lib.client.get('search/tweets', {q:tag, count:lib.REQUEST_COUNT, include_entities:false, geocode:lib.EARTH_GEOCODE}, processfunc);
    };

    lib.test = function(team, callback){
        console.log("Searching for team " + team)
        lib.searchTag(lib.formTeamTag(team), (x,err)=>{
            if(err){
                console.log("Tag search error: " + err);
            }
            // for(var i = 0; i < x.length; i++){
            //     //console.log(x[i].id + ": " + x[i].text);
            //     continue;
            // }
            writeJSONFile(x, lib.formDataFilename(team));
            callback(x, team);
            return;
        });
    };

    lib.testAll = function(){
        var numDone = 0;
        for(var i = 0; i < lib.teams.length; i++){
            lib.test(lib.teams[i], (x, t)=>{
                numDone++;
                console.log("Finished " + t + ", " + numDone + " teams done.");
                if(numDone == lib.teams.length){
                    console.log("Completed.");
                }
                //callback(x,t);
                return;
            });
        }
    };

    lib.processTweets = function(tweets, team, data){
        var tmpdata = data || [];
        for(var i = 0; i < tweets.length; i++){
            var ptobj = {};
            var coords;
            console.log( tweets[i].geo );
            if(tweets[i].user.location){
                console.log("Location: " + tweets[i].user.location);
                tmpdata.push(tweets[i].user.location);
                continue;
            }
            if(tweets[i].coordinates && tweets[i].coordinates.type == "Point"){
                ptobj.coords = tweets[i].coordinates.coordinates;
            }
            else{
                console.log("Missing point coordinates?");
            }
        }
        return tmpdata;
    };

    lib.lookupLocations = function(locations, prevfound, callback){
        var found = prevfound || {};
        var numRequests = 0;
        var numReqsComplete = 0;
        var finalize = callback || function(f){
            writeJSONFile(f, lib.LOCATION_FILENAME);
        };

        for(var i = 0; i < locations.length; i++){
            if(!found[locations[i]]){
            numRequests = numRequests + 1;
            lib.client.get('geo/search', {query:locations[i]}, function(error, content, response){
                numReqsComplete = numReqsComplete + 1;
                console.log("numReqsComplete", numReqsComplete, " out of ", numRequests);

                if(error){
                    console.log("Error in location lookup: ",error);
                }
                else{
                    console.log("content: " + JSON.stringify(content, null, 4));
                    //console.log("res: " + JSON.stringify(response, null, 4));
                    if(content.result.places && content.result.places.length > 0){
                        console.log("Place had a center?");
                        found[content.query.params.query] = content.result.places[0].centroid;
                    }
                }
                if(numReqsComplete == numRequests){
                    finalize(found);
                }
                
            });

            }
            else{
                console.log("Location " + locations[i] + " was already located at " + found[locations[i]]);
            }
        }
        return found;
    };

    lib.lookupAll = function(){

    };

})(hype);

exports = module.exports = hype;

//hype.test(hype.teams[15]);
//hype.testAll();

var testjson = JSON.parse(fs.readFileSync('./data_ANX.json', 'utf8'));
console.log(hype.lookupLocations(hype.processTweets(testjson, hype.teams[0])));

// function twitterSearch(keyword){
//     var propertiesObject = { q:"@"+keyword, include_entities:false, };
//     request({url:TWITTER_URL, qs:propertiesObject}, function(err, response, body) {
//       if(err) { console.log(err); return; }
//       console.log("Get response: " + response.statusCode);

//       console.log(body);
//       writeJSONFile(body, "data.txt");
//     });
// }

