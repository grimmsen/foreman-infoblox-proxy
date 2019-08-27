const _infoblox = require('./infoblox.js');
const _util = require('./util.js');
const request = require('request');
const dnshelper = require('dns');
const fs = require('fs');

var dns = function(dnsservers) {
    var infoblox = new _infoblox();
    var util = new _util();
    var dnsservers = dnsservers;
    var dnscache = {};
    this.create = function(req,res) {
        if(req.body.type==='PTR') {
            if(!util.is_fqdn(req.body.fqdn)||!util.is_ptr(req.body.value)) {
                res.send(500).end(); return;
            }
            infoblox.request('record:ptr','POST',[],{
                ptrdname: req.body.fqdn,
                // value is in in-addr.arpa format
                ipv4addr: req.body.value.replace(/\.in-addr\.arpa$/,"").split(".").reverse().join('.')
            },function(data) {
                if(data===null) { res.status(500).end(); return; }
                res.status(200).end();
            });
        }
        if(req.body.type==='A') {
            if(!util.is_fqdn(req.body.fqdn)||!util.is_ip(req.body.value)) {
                res.send(500).end(); return;
            }
            infoblox.request('record:a','POST',[],{
                ipv4addr: req.body.value,
                name: req.body.fqdn
            }, function(data) {
                if(data===null) { res.status(500).end(); return; }
                res.status(200).end();
            });
        }
    }

    this.deleteA = function(req,res) {
        if(util.is_fqdn(req.params.value)) {
            infoblox.request('record:a','GET',{name:req.params.value},[],function(data) {
                for(var c=0; c<data.length; c++) {
                    if(data[c]._ref.indexOf("record:")===0) {
                        infoblox.request(data[c]._ref,'DELETE',[],[],function (data) {
                            if(data===null) { res.send(500).end(); return; }
                            return;
                        });
                    }
                }
                res.status(200).end(); return;
            });
        } else {
            res.status(500).end();
        }
    }

    this.delete = function(req,res) {
        if(util.is_ptr(req.params.value)) {
            infoblox.request('record:ptr','GET',
                { ipv4addr:req.params.value.replace(/\.in-addr\.arpa$/,"").split(".").reverse().join('.')},[],
                function (data) {
                for(var c=0; c<data.length; c++) {
                    if(data[c]._ref.indexOf("record:")===0) {
                        infoblox.request(data[c]._ref,'DELETE',[],[],function (data) {
                            if(data===null) { res.send(500).end(); return; }
                            return;
                        });
                    }
                }
                res.status(200).end(); return;
            });
            return;
        }
        if(util.is_ip(req.params.value)) {
            infoblox.request('record:a','GET',{ipv4addr:req.params.value},[],function (data) {
                for(var c=0; c<data.length; c++) {
                    if(data[c]._ref.indexOf("record:")===0) {
                        infoblox.request(data[c]._ref,'DELETE',[],[],function (data) {
                            if(data===null) { res.send(500).end(); return; }
                            return;
                        });
                    }
                }
                res.status(200).end(); return; 
            });
            return;
        }
        res.status(500).end();
    }

  // noop clone of autocreate
    this.autocreate_noop = function(req,res) {
        infoblox.request('network','GET',{'comment:~':req.params.networkname},[],function(data) {
            if(data[0] !== undefined) {
                // CALLBACK HELL!!!
                // check cache
                if(dnscache[req.params.value]!==undefined) {
                  res.send(dnscache[req.params.value]).end();
                  return;
                }
                if(dnsservers!==undefined) { dnshelper.setServers(dnsservers); console.log("Using "+dnsservers+" for resolving..."); }
                dnshelper.resolve(req.params.value,function(err,records) {
                    if(records!==undefined) {
                        res.send(records[0]).end();
                        return;
                    } else {
                        res.status(500).send("ERR no such host").end();
                    }
                });
            } else {
              res.status(500).send("ERR no such network").end();
            }
        });
    }

    this.clear_cache = function(req,res) {
        var msg = {'msg':dnscache.length+' entries deleted from cache'}
        dnscache.length = 0;
        res.status(200).send(JSON.stringify(msg));
    }

    // convinience function for simplified creation of host entries for hosts not managed by foreman
    this.autocreate = function(req,res) {
        infoblox.request('network','GET',{'comment:~':req.params.networkname},[],function(data) {
            if(data[0] !== undefined) {
                // CALLBACK HELL!!!
                // check cache
                if(dnscache[req.params.value]!==undefined) {
                  res.send(dnscache[req.params.value]).end();
                  return;
                }
                if(dnsservers!==undefined) { dnshelper.setServers(dnsservers); console.log("Using "+dnsservers+" for resolving..."); }
                dnshelper.resolve(req.params.value,function(err,records) {
                    if(records!==undefined) {
                        dnscache[req.params.value] = records[0];
                        res.send(records[0]).end();
                        return;
                    } else {
                      dnscache[req.params.value] = undefined;
                        // find unused ip
                        request('http://localhost:8080/dhcp/'+data[0].network.split('/')[0]+'/unused_ip',function(err,response,body) {
                            try {
                                console.log(body);
                                var ip = JSON.parse(body).ip;
                                // create A record
                                request.post('http://localhost:8080/dns',{form:{fqdn:req.params.value,value:ip,type:'A'}},function(err,response,body) {
                                    if(err) {
                                        res.status(500).send('ERR error on reservation');
                                        return;
                                    }
                                    dnscache[req.params.value]=ip;
                                    res.status(200).send(ip);
                                });
                            } catch (e) {
                                res.status(500).send('ERR invalid data from ipam'+e).end();
                            }
                        });
                    }
                });
            } else {
                res.status(500).send("ERR no such network").end();
            }
        });
    }
}

module.exports = dns;
