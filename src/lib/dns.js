const _infoblox = require('./infoblox.js');
const _util = require('./util.js');

var dns = function() {
    var infoblox = new _infoblox();
    var util = new _util();
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
}

module.exports = dns;