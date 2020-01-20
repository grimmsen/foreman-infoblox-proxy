// created by andreas 2017-07-28
//
const express = require("express");
const bodyParser = require("body-parser");
const basicAuth = require("express-basic-auth");
const morgan = require("morgan");
const fs=require("fs");
const https=require("https");
const extend=require("extend");

const allowedips = JSON.parse(fs.readFileSync('conf/config.json')).allowedips;
const dnsservers = JSON.parse(fs.readFileSync('conf/config.json')).dnsservers;
const apipath = JSON.parse(fs.readFileSync('conf/config.json')).apipath;
const basicauth = JSON.parse(fs.readFileSync('conf/config.json')).basicauth;
const user = JSON.parse(fs.readFileSync('conf/config.json')).user;
const pass = JSON.parse(fs.readFileSync('conf/config.json')).pass;

process.env['NODE_TLS_REJECT_UNAUTHORIZED']='0';

const app = express();
app.use(morgan('combined'));
app.use(bodyParser.urlencoded({extended:true}));
if(basicauth===true) {
  var users = {};
  users[user]=pass;
  app.use(basicAuth({users: users }));
} else {
  app.use(function (req,res,next) {
    if(allowedips===undefined) next();
    else {
      console.log(req.ip);
      console.log(allowedips.indexOf(req.ip));
      if(allowedips.indexOf(req.ip)>=0) next();
      else res.status(401).send('not authorized').end();
    }
  });
}

const _dhcp = require('./lib/dhcp.js');
const dhcp = new _dhcp();
const _dns = require('./lib/dns.js');
const dns = new _dns(dnsservers);

app.route(apipath+'/features')
  .get(function (req,res) {
    res.send('["dhcp","dns"]').end();
  });

app.route(apipath+'/version')
  .get(function(req,res) {
    res.send('{"version":"1.20.0","modules":{"dns":"1.20.0","dhcp":"1.20.0"}}').end();
  });

app.route(apipath+'/dhcp')
  .get(dhcp.dhcp);

app.route(apipath+'/dhcp/:network/unused_ip')
  .get(dhcp.unused_ip);

app.route(apipath+'/dhcp/:network/:ip')
  .get(dhcp.reservation_info);

app.route(apipath+'/dhcp/:network/mac/:mac')
  .get(dhcp.search_mac)
  .delete(dhcp.delete_reservation);

app.route(apipath+'/dhcp/:network/ip/:ip')
  .get(dhcp.search_ip)

app.route(apipath+'/dhcp/:network')
  .post(dhcp.create_reservation);

app.route(apipath+'/dns')
  .post(dns.create);

app.route(apipath+'/dns/:value')
  .delete(dns.delete);

app.route(apipath+'/dns/:value/A')
  .delete(dns.deleteA);

app.route(apipath+'/auto/:networkname/:value')
  .put(dns.autocreate)
  .get(dns.autocreate_noop)
  .delete(dns.deleteA);

console.log("starting up....");
try {
  var privateKey  = fs.readFileSync('conf/ssl.key', 'utf8');
  var certificate = fs.readFileSync('conf/ssl.pem', 'utf8');
  var credentials = {key: privateKey, cert: certificate};
  var httpsServer = https.createServer(credentials, app);
  httpsServer.listen(8443);
  app.listen(8080,'localhost'); // for internal com
  console.log("Listening on 8443");
} catch (e) {
  console.log("SSL startup failed "+e);
  console.log("Listening on 8080");
  app.listen(8080);
}

process.on('uncaughtException', function (err) {
    console.error(err.stack);
    console.log("node NOT exiting...");
});
