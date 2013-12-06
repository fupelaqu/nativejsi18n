/*
|--------------------------------------------------------------------------
| I18n 0.2
| https://github.com/fupelaqu/nativejsi18n
|--------------------------------------------------------------------------
 */

var i18n = (function() {
    var document = window.document, navigator = window.navigator;
    var defaultLang = navigator.language || navigator.userLanguage;
    if(defaultLang){
        defaultLang = defaultLang.substring(0, 2);
    }
    var defaultDictionary = '_';

    /* begin functions */

    function asArray(args, start) {
        var result = [];
        for ( var i = (start || 0); i < args.length; i++)
            result.push(args[i]);
        return result;
    }

    function forEach(array, action) {
        // support for additional arguments required by the action to perform
        // for each element within the array
        var fixedArgs = asArray(arguments, 2);
        var copy = [].concat(array);
        for ( var i = 0; i < array.length; i++) {
            action.apply(null, [ array[i], i, copy ].concat(fixedArgs));
        }
    }

    function reduce(func, base, array) {
        forEach(array, function(element) {
            base = func(base, element);
        });
        return base;
    }

    function map(func, array) {
        var result = [];
        forEach(array, function(element) {
            result.push(func(element));
        });
        return result;
    }

    function forEachIn(object, action) {
        var fixedArgs = asArray(arguments, 2);
        for ( var property in object) {
            if (Object.prototype.hasOwnProperty.call(object, property)
                    && Object.prototype.propertyIsEnumerable.call(object,
                            property))
                action.apply(null, [ property, object[property] ]
                        .concat(fixedArgs));
        }
    }

    var op = {
        "==" : function(a, b) {
            return a == b;
        },
        "!" : function(a) {
            return !a;
        }
    };

    function partial(func) {
        var fixedArgs = asArray(arguments, 1);
        return function() {
            return func.apply(null, fixedArgs.concat(asArray(arguments)));
        };
    }

    function compose(func1, func2) {
        return function() {
            return func1(func2.apply(null, arguments));
        };
    }

    var isNumber = compose(op["!"], isNaN);
    var isUndefined = partial(op["=="], undefined);
    var isDefined = compose(op["!"], isUndefined);

    function copy(target, source) {
        forEachIn(source, function(name, value) {
            target[name] = value;
        });
        return target;
    }

    /* string functions */

    function trim(str) {
        return str ? (str.replace(/^[\s\xA0]+/, "").replace(/[\s\xA0]+$/, ""))
                : null;
    }

    /* node functions */

    function setText(element, text) {
        element.innerText = text;
        element.textContent = text;
    }

    function getByClass(element, className) {
        function hasClass(element, name) {
            var re = new RegExp('(^| )' + name + '( |$)');
            return re.test(element.className);
        }

        if (element.querySelectorAll) {
            return element.querySelectorAll('.' + className);
        }

        var result = [];
        var candidates = element.getElementsByTagName("*");
        forEach(candidates, function(element) {
            if (hasClass(element, className)) {
                result.push(element);
            }
        });
        return result;
    }

    /* end functions */

    /* begin Dictionary class */

    function Dictionary(startValues) {
        this.values = startValues || {};
        this.readProperties = function(properties) {
            var self = this;
            function readLine(line) {
                var kv = line.split('=');
                if (kv != undefined && kv.length == 2) {
                    self.store(trim(kv[0]), trim(kv[1]));
                }
            }
            var lines = [];
            if (document.all) { // IE
                lines = properties ? properties.split('\r\n') : [];
            } else { // Mozilla
                lines = properties ? properties.split('\n') : [];
            }
            forEach(lines, readLine);
        };
        this.loadProperties = function(url, callback) {
            var fixedArgs = asArray(arguments, 2);
            var xhr = null;
            var self = this;
            if (window.XMLHttpRequest) {
                xhr = new XMLHttpRequest();
            } else {
                xhr = new ActiveXObject('Microsoft.XMLHTTP');
            }
            xhr.onreadystatechange = function() {
                setTimeout(function() {
                    xhr.abort();
                    // TODO Handle timeout situation, e.g. Retry or inform user.
                }, 30000);
                if (xhr.readyState == 4) {
                    if (xhr.status != 200 && xhr.status != 0) {
                        // TODO Handle error, e.g. Display error message on page
                        return;
                    }
                    self.readProperties(xhr.responseText);
                    if (isDefined(callback) && typeof callback == 'function') {
                        callback.apply(null, fixedArgs);
                    }
                }
            };
            xhr.open('GET', url, true); // TODO add asynchronous within options
            xhr.send();
        };
    }
    Dictionary.prototype.store = function(name, value) {
        this.values[name] = value;
    };
    Dictionary.prototype.lookup = function(name) {
        return isDefined(name) ? this.values[name] : null;
    };
    Dictionary.prototype.contains = function(name) {
        return Object.prototype.hasOwnProperty.call(this.values, name)
                && Object.prototype.propertyIsEnumerable
                        .call(this.values, name);
    };
    Dictionary.prototype.each = function(action) {
        forEachIn.apply(null, [ this.values, action ].concat(asArray(arguments,
                1)));
    };
    Dictionary.prototype.names = function() {
        var names = [];
        this.each(function(name, value) {
            names.push(name);
        });
        return names;
    };

    /* end Dictionary class */

    function Translator() {
        Dictionary.apply(this, arguments);
        this.splitText = function(text) {
            function indexOrEnd(character) {
                var index = text.indexOf(character);
                return index == -1 ? text.length : index;
            }

            function takeNormal() {
                var end = reduce(Math.min, text.length,
                        map(indexOrEnd, [ '{' ]));
                var part = text.slice(0, end);
                text = text.slice(end);
                return part;
            }

            function takeUpTo(character) {
                var end = text.indexOf(character, 1);
                if (end == -1)
                    throw new Error("Missing closing '" + character + "'");
                var part = text.slice(1, end);
                text = text.slice(end + 1);
                return part;
            }

            var parts = [];

            while (text != "") {
                if (text.charAt(0) == '{') {
                    parts.push({
                        type : 'param',
                        content : takeUpTo('}')
                    });
                } else {
                    parts.push({
                        type : 'text',
                        content : takeNormal()
                    });
                }
            }
            return parts;
        };

    }
    // @inherits Dictionary
    copy(Translator.prototype, Dictionary.prototype);
    Translator.prototype.translate = function(lang, key, params) {
        var ret = [];
        if (isDefined(params) && typeof params == 'string') {
            params = [ params ];
        }
        var _self = this;
        var dico = this.lookup(lang);
        function innerLookup(key) {
            if (isDefined(dico) && dico.contains(key)) {
                return dico.lookup(key);
            }
            var _default = _self.lookup(defaultLang);
            if (isDefined(_default) && _default.contains(key)) {
                return _default.lookup(key);
            }
            var _defaultDictionary = _self.lookup(defaultDictionary);
            return isDefined(_defaultDictionary) ? _defaultDictionary.lookup(key) : null;
        }
        var message = innerLookup(key) || key;
        var parts = this.splitText(message);
        forEach(parts, function(part) {
            var type = part ? part.type : 'text';
            switch (type) {
                case 'text':
                    ret.push(part.content);
                    break;
                case 'param':
                    var param = part.content;
                    if (isNumber(param) && isDefined(params)
                            && params.length > param) {
                        ret.push(params[param]);
                    } else if (innerLookup(param)) {
                        ret.push(innerLookup(param));
                    } else {
                        ret.push(eval(param));
                    }
                    break;
            }
        });
        return ret.join('');
    };

    var translator = new Translator();

    return {
        load : function(urls, callback) {
            if (typeof urls == 'string') {
                urls = [ urls ];
            }
            var loadUrls = function(urls) {
                if (urls && urls.length > 0) {
                    var url = urls[0];
                    var dico = new Dictionary();
                    dico.loadProperties(url,
                            function() {
                                var lang = dico.lookup('lang');
                                if (isUndefined(lang)
                                        && /_\w\w\.properties$/.test(url)) {
                                    var index = url
                                            .search(/_\w\w\.properties$/);
                                    lang = url.slice(index + 1, index + 3);
                                } else {
                                    // default dictionary to use for all
                                    // messages
                                    lang = defaultDictionary;
                                }
                                var _dico = translator.lookup(lang);
                                if (isDefined(_dico)) {
                                    dico.each(function(name, value) {
                                        _dico.store(name, value);
                                    });
                                    dico = _dico;
                                }
                                translator.store(lang, dico);
                                urls.splice(0, 1);
                                loadUrls(urls);
                            });
                } else if (isDefined(callback)) {
                    setTimeout(callback, 1);
                }
            };

            loadUrls(urls);

        },
        translate : function(lang, key, params) {
            return translator.translate(lang, key, params);
        },
        translateDocument : function(lang, params) {
            var self = this;
            if (isUndefined(lang)) {
                lang = defaultLang;
            }
            forEach(getByClass(document, 'i18n'), function(element) {
                var key = element.getAttribute('i18n');
                if(isUndefined(key)){
                    key = element.id;
                }
                if (isDefined(key)) {
                    var text = self.translate(lang, key, params);
                    element.innerHTML = text;
                }
            });
        }
    };
})();
