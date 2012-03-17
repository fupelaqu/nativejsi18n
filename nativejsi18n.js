/*
|--------------------------------------------------------------------------
| I18n 0.1
| https://github.com/fupelaqu/nativejsi18n
|--------------------------------------------------------------------------
*/

var I18n = (function() {

	if (!window.console) console = {};
	console.log = console.log || function(){};
	console.warn = console.warn || function(){};
	console.error = console.error || function(){};
	console.info = console.info || function(){};

	if (String.prototype.trim == null){
	    String.prototype.trim = function(){
	        return (this.replace(/^[\s\xA0]+/, "").replace(/[\s\xA0]+$/, ""));
	    };
	}

	var Client = (function(){
	    var _parameters = null;
	    return {
	    	loadHttpParameters : function(){
	    		_parameters = [];
	    	    var search = document.location.search;
	    	    if (search != null && search.length > 0) {
	    	        search = search.substring(1);
	    	        var params = search.split('&');
	    	        for ( var i = 0; i < params.length; i++) {
	    	            var kv = params[i].split('=');
	    	            var k = kv[0].trim();
	    	            var v = kv[1].trim();
	    	            _parameters[k] = decodeURI(v);
	    	        }
	    	    }
	    	},
	        getHttpParameter : function(_key, _default) {
	        	if(_parameters == undefined){
	        		this.loadHttpParameters();
	        	}
	            var ret = _parameters[_key];
	            return ret != undefined ? ret : _default;
	        },
	        load : function(url, callback) {
	            var xmlhttp;
	            if (window.XMLHttpRequest) {
	                xmlhttp = new XMLHttpRequest();
	            } else {
	                xmlhttp = new ActiveXObject('Microsoft.XMLHTTP');
	            }
	            xmlhttp.onreadystatechange = function() {
	                if (xmlhttp.readyState == 4) {
	                    var data = xmlhttp.responseText;
	                    var status = xmlhttp.status;
	                    if (callback != undefined && typeof callback == 'function') {
	                        callback.call(this, data, status);
	                    }
	                }
	            };
	            xmlhttp.open('GET', url, true);
	            xmlhttp.send();
	        }
	    };

	})();

	var Dictionary = function(data){
	    var _readProperties = function(properties) {
	        var ret = [];
	        var lines;
	        if (document.all) { // IE
	            lines = properties.split('\r\n');
	        } else { // Mozilla
	            lines = properties.split('\n');
	        }
	        if (lines.length > 0) {
	            do {
	                var line = lines[0];
	                var kv = line.split('=');
	                if (kv != undefined && kv.length == 2) {
	                    var k = kv[0].trim();
	                    var v = kv[1].trim();
	                    if (v.indexOf('eval:') == 0) {
	                        v = eval(v.substring(5));
	                    }
	                    ret[k] = v;
	                }
	                lines.splice(0, 1);
	            } while (lines.length > 0);
	        }
	        return ret;
	    };

	    var _messages = _readProperties(data);

	    return {
	        translate : function(key, params){
	            var msg = key;
	            if(key != undefined && _messages[key] != undefined){
	                msg = _messages[key];
	            }
	            if(msg){
	                var indexDeb = msg.indexOf('{');
	                if (indexDeb != -1){
	                    var indexFin = msg.indexOf('}', indexDeb);
	                    var param = msg.substring(indexDeb + 1, indexFin);
	                    if(!isNaN(param) && params.length > parseInt(param)){
	                        try{
	                            var valeurParam = params[parseInt(param)];
	                            var newMsg = msg.substring(0, indexDeb) + valeurParam + msg.substring(indexFin + 1); 
	                            return this.translate(newMsg, params);
	                        }
	                        catch(e){
	                        }
	                    }
	                }
	            }
	            return msg;
	        }
	    };
	};

    var language = window.navigator.userLanguage || window.navigator.language;
    
    var _defaultLang  = language != undefined ? language.substring(0, 2) : null;

    var _dictionaries = [];

    var _dictionary = null;

    var _loadDictionaries = function(dictionaries, callback) {
        if (dictionaries != undefined && dictionaries.length > 0) {
            if(_defaultLang == undefined){
                _defaultLang = Client.getHTTPParameter('lang');
            }
            var _lang = dictionaries[0].lang;
            var _url = dictionaries[0].url;
            var _default = _lang === _defaultLang;
            if(_url != undefined && _lang != undefined){
                Client.load(_url, function(data, textStatus) {
                    if (textStatus == 200) {
                        var _d = new Dictionary(data);
                        _dictionaries[_lang] = _d;
                        if(_default || _dictionary == undefined){
                            _dictionary = _d;
                        }
                        dictionaries.splice(0, 1);
                        _loadDictionaries(dictionaries, callback);
                    } else {
                        console.error('error loading ' + _url + ':' + textStatus);
                    }
                });
            }
            else{
                console.error('url and lang are mandatory attributes for each dictionary');
            }
        } else {
            if (callback != undefined && typeof callback == 'function') {
                setTimeout(function() {
                    try {
                        callback.call(this);
                    } catch (err) {
                        notify(err);
                    }
                }, 100);
            }
        }
    };

    return {
        init : function(dictionaries, lang, callback) {
            if(lang != undefined){
                _defaultLang = lang;
            }
            _loadDictionaries(dictionaries, callback);
        },
        resetLang : function(lang){
            if(lang != undefined && _dictionaries[lang] != undefined){
                _dictionary = _dictionaries[lang];
            }
            else{
                console.error('failed to reset lang to ' + lang);
            }
        },
        translate : function(key, lang, params){
            var _dico = _dictionary;
            if(lang != undefined && _dictionaries[lang] != undefined){
                _dico = _dictionaries[lang];
            }
            return key!=undefined && _dico != undefined ? _dico.translate(key, params) : null;
        }
    };
})();
