var util = function() {
    this.is_ip = function(ip) {
        return (ip.match(/^(?!0)(?!.*\.$)((1?\d?\d|25[0-5]|2[0-4]\d)(\.|$)){4}$/)!==null)?true:false;
    }

    this.is_mac = function(mac) {
        return (mac.match(/([0-9a-fAF]{2}:){4}([0-9a-fAF]){2}/)!==null)?true:false;
    }

    this.is_ptr = function(ptr) {
        return (ptr.match(/^.*\.in-addr.arpa$/)!==null)?true:false;
    }

    this.is_fqdn = function(fqdn) {
        return (fqdn.match(/(?=^.{4,253}$)(^((?!-)[a-zA-Z0-9-]{1,63}(?<!-)\.)+[a-zA-Z]{2,63}$)/)!==null)?true:false;
    }
}

module.exports = util;