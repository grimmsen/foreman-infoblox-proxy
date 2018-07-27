const https  = require('https');
const dns = require('dns');
const querystring = require('querystring');
const fs = require('fs');

var infoblox = function(conf) {

    const InfoBloxConf = JSON.parse(fs.readFileSync('conf/config.json'));

    function JSONToGET(args) {
    	var GET = "?"
    	for(var key in args) {
    		GET+=key+"="+args[key]+"&";
    	}
    	return GET.replace(/&$/,"");
    };

    this.request = function(name,method,args,postdata,callback) {
        var deb = console;
    	var options = {
    		protocol: 'https:',
    		hostname: InfoBloxConf.host,
    		port: 443,
    		method: method,
    		auth: InfoBloxConf.user+":"+InfoBloxConf.pass,
    		path: InfoBloxConf.path+name+JSONToGET(args),
    		headers: {
    			'Content-Type':'application/json',
    		}
    	};
    	const req = https.request(options, function (res) {
    		const statusCode = res.statusCode;
			var rawData="";
			var parsed="";
    		if(statusCode>299) { 
                callback(null);
    		} 
    		res.setEncoding('utf8');
    		res.on('data',function(b) {
    			rawData+=b;
    		});
    		res.on('end',function() {
                try {
                    parsedData=JSON.parse(rawData);
                } catch (e) {
                    callback(null);
                }
    			if(statusCode<299) callback(parsedData);
    			else { deb.log(parsedData.Error); callback(null); };
    		});
        
    	});	
    	req.on('error',function(e){console.log(e);callback(null); });
    	req.write(JSON.stringify(postdata));
    	req.end();
    }
}

module.exports = infoblox;