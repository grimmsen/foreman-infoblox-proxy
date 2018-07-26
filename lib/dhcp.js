const _infoblox = require('./infoblox.js');
const _util = require('./util.js');

var dhcp = function() {

    function CIDRToNetmask(cidrsuffix) {
        var mask=[0,0,0,0];
        for(var i=0; i<4; i++) {
            for(var j=0;j<8;j++) {
                if(cidrsuffix>0) mask[3-i]+=Math.pow(2,(7-j));
                cidrsuffix--;
            }
        }
        return mask[3]+"."+mask[2]+"."+mask[1]+"."+mask[0];
    }

    const infoblox = new _infoblox();
    const util = new _util();

    // Method: GET
    // /dhcp 
    this.dhcp = function(req,res) {
        infoblox.request('network','GET',[],[],function(data) {
            if(data==null) { res.status(500).end(); return; }
            response ='[';
            for(var c=0; c<data.length; c++) {
                var netmask = CIDRToNetmask(data[c].network.split('/')[1]);
                var network = data[c].network.split('/')[0];
                response=response+'{"network":"'+network+'","netmask":"'+netmask+'","options":{}},';
            }
            response=response.replace(/,$/,"")+"]";
            res.send(response).end();
        });
    }

    // Method: GET
    // /dhcp/192.168.2.0/unused_ip
    this.unused_ip = function(req,res) {
        if(!util.is_ip(req.params.network)) { res.status(500).end(); return; }
        infoblox.request('ipv4address','GET',{network:req.params.network,status:'UNUSED'},[],function(data) {
            if(data==null) { res.status(500).end();return; }
            var candidates = [];
            for(var c=0; c<data.length; c++) {
                candidates.push(data[c].ip_address);
            }
            // with shuffle
            response = {
                ip: candidates[Math.floor(Math.random()*candidates.length)]
            };
            res.send(response).end();
        });
    }

    // Method: GET
    // /dhcp/192.168.2.0/192.168.2.128
    this.reservation_info = function(req,res) {
        if(!util.is_ip(req.params.network)||!util.is_ip(req.params.ip)) {
            res.status(500).end(); return;
        }
        infoblox.request('record:host_ipv4addr','GET',{'ipv4addr':req.params.ip},[],function(data) {
            if(data==null) { res.status(500).end();return; }
            if(data[0]===undefined) { res.send("No DHCP record for "+req.params.network+"/"+req.params.ip+" found").end(); return;}
            response = {
                hostname: data[0].host,
                ip: data[0].ipv4addr,
                mac: data[0].mac
            }
            res.send(response).end();
        });
    }

    // Method: POST
    // /dhcp/192.168.2.0
    this.create_reservation = function(req,res) {
        if(!util.is_ip(req.body.ip)||!util.is_fqdn(req.body.name)||!util.is_mac(req.body.mac)) {
            res.status(500).end(); return;
        }
        // create host
        infoblox.request('record:host','POST',[],{
            ipv4addrs:[{ipv4addr:req.body.ip}],
            comment: req.body.name,
            name: req.body.name
        },function(data) {
            // get address ref for host
            infoblox.request(data,'GET',[],[],function (data) {
                if(data===null) { res.status(500).end(); return;}
                // create mac entry
                infoblox.request(data.ipv4addrs[0]._ref,'PUT',[],{ mac:req.body.mac,configure_for_dhcp:true },function(data) {
                    res.status(200).end();
                });
            });
        });
    }

    // Method: DELETE
    // /dhcp/102.168.2.0/mac/00:11:22:33:44
    this.delete_reservation = function(req,res) {
        if(!util.is_mac(req.params.mac)||!util.is_ip(req.params.network)) {
            res.status(500).end(); return;
        }
        infoblox.request('record:host','GET',{mac:req.params.mac},[],function(data) {
            if(data===null) { res.status(500).end(); return; }
            if(data.length===0) { res.status(500).end(); return; }
            var failure = 0;
            for(var c=0; c<data.length; c++) {
                if(data[c]._ref.indexOf("record")===0) {
                    infoblox.request(data[c]._ref,"DELETE",[],[],function(data) {
                        if(data===null) failure++;
                    });
                }
            }
            res.status(200).end();
        });
    }

    // Method: GET
    // /dhcp/192.168.2.0/mac/00:11:22:33:44:55
    this.search_mac = function(req,res) {
        if(!util.is_mac(req.params.mac)||!util.is_ip(req.params.ip)) {
            res.send(500).end(); return;
        }
        infoblox.request('network','GET',{contains_address:req.params.network},[],function (data) {
            if(data===null) { res.status(500).end(); return; }
            if(data.length===0) { res.status(500).end(); return; }
            var subnetmask = CIDRToNetmask(data[0].network.split('/')[1]);
            infoblox.request('record:host','GET',{'mac':req.params.mac},[],function (data) {
                if(data===null || data===undefined) { res.send(500).end(); return;}
                if(data.length===0) { res.send("[]").end(); return;}
                var response = {
                    name: data[0].name,
                    ip: data[0].ipv4addrs[0].ipv4addr,
                    mac: req.params.mac,
                    subnet: req.params.network+'/'+subnetmask,
                    type: 'reservation',
                    deleteable: true,
                    hostname: data[0].name
                } 
                res.status(200).send(response).end();
            });
        });
    }

    // Method: GET
    // /dhcp/192.168.2.0/ip/192.168.2.55
    this.search_ip = function(req,res) {
        if(!util.is_ip(req.params.ip)||!util.is_ip(req.params.network)) {
            res.send(500).end(); return;
        }
        infoblox.request('network','GET',{contains_address:req.params.network},[],function (data) {
            if(data===null) { res.status(500).end(); return; }
            if(data.length===0) { res.status(500).end(); return; }
            var subnetmask = CIDRToNetmask(data[0].network.split('/')[1]);
            infoblox.request('record:host','GET',{'ipv4addr':req.params.ip},[],function (data) {
                if(data===null) { res.status(500).end(); return; }
                if(data.length===0) { res.send("[]").end(); return; }
                var response = [{
                    name: data[0].name,
                    ip: data[0].ipv4addrs[0].ipv4addr,
                    mac: data[0].ipv4addrs[0].mac,
                    subnet: req.params.network+'/'+subnetmask,
                    type: 'reservation',
                    deletable: true,
                    hostname: data[0].name
                }]
                res.status(200).send(response).end();
            });
        });
    }
}

module.exports = dhcp;