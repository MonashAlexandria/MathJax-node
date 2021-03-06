//
//  We need to load cssstyle's parsers.js, but its location differs
//  between node 4 and node 5, so check which one we have.
//

var PARSERS = 'jsdom/node_modules/cssstyle/lib/parsers.js';             // node 4 hierarchy
try {require(PARSERS)} catch (e) {PARSERS = 'cssstyle/lib/parsers.js'}  // node 5 heirarchy

//
//  Companion to implicitSetter, but for the individual parts.
//  This sets the individual value, and checks to see if all four
//  sub-parts are set.  If so, it sets the shorthand version and removes
//  the individual parts from the cssText.
//
var subImplicitSetter = function (prefix, part, isValid, parser) {
    var property = prefix + '-' + part;
    var subparts = [prefix+"-top", prefix+"-right", prefix+"-bottom", prefix+"-left"];

    return function (v) {
        if (typeof v === 'number') v = v.toString();
        if (typeof v !== 'string') return undefined;
        if (!isValid(v)) return undefined;
        v = parser(v);
        this._setProperty(property,v);
        var parts = [];
        for (var i = 0; i < 4; i++) {
            if (this._values[subparts[i]] == null || this._values[subparts[i]] === '') break;
            parts.push(this._values[subparts[i]]);
        }
        if (parts.length === 4) {
            for (i = 0; i < 4; i++) {
                this.removeProperty(subparts[i]);
                this._values[subparts[i]] = parts[i];
            }
            this._setProperty(prefix,parts.join(" "));
        }
        return v;
    };
};

//
//  Patch for CSSStyleDeclaration padding property so that it sets/clears
//  the Top, Right, Bottom, and Left properties (and also validates the 
//  padding value)
//
var PADDING = (function () {
    var parsers = require(PARSERS);
    var TYPES = parsers.TYPES;

    var isValid = function (v) {
        var type = parsers.valueType(v);
        return type === TYPES.LENGTH || type === TYPES.PERCENT;
    };

    var parser = function (v) {
        return parsers.parseMeasurement(v);
    };

    var mySetter = parsers.implicitSetter('padding', '', isValid, parser);
    var myGlobal = parsers.implicitSetter('padding', '', function () {return true}, function (v) {return v});

    return {
        definition: {
            set: function (v) {
                if (typeof v === "number") v = String(v);
                if (typeof v !== "string") return;
                var V = v.toLowerCase();
                switch (V) {
                    case 'inherit':
                    case 'initial':
                    case 'unset':
                    case '':
                        myGlobal.call(this, V);
                        break;

                    default:
                        mySetter.call(this, v);
                        break;
                }
            },
            get: function () {
                return this.getPropertyValue('padding');
            },
            enumerable: true,
            configurable: true
        },
        isValid: isValid,
        parser: parser
    };
})();

//
//  Patch for CSSStyleDeclaration margin property so that it sets/clears
//  the Top, Right, Bottom, and Left properties (and also validates the 
//  margin value)
//
var MARGIN = (function () {
    var parsers = require(PARSERS);
    var TYPES = parsers.TYPES;

    var isValid = function (v) {
        if (v.toLowerCase() === "auto") return true;
        var type = parsers.valueType(v);
        return type === TYPES.LENGTH || type === TYPES.PERCENT;
    };

    var parser = function (v) {
        var V = v.toLowerCase();
        if (V === "auto") return V;
        return parsers.parseMeasurement(v);
    };

    var mySetter = parsers.implicitSetter('margin', '', isValid, parser);
    var myGlobal = parsers.implicitSetter('margin', '', function () {return true}, function (v) {return v});

    return {
        definition: {
            set: function (v) {
                if (typeof v === "number") v = String(v);
                if (typeof v !== "string") return;
                var V = v.toLowerCase();
                switch (V) {
                    case 'inherit':
                    case 'initial':
                    case 'unset':
                    case '':
                        myGlobal.call(this, V);
                        break;

                    default:
                        mySetter.call(this, v);
                        break;
                }
            },
            get: function () {
                return this.getPropertyValue('margin');
            },
            enumerable: true,
            configurable: true
        },
        isValid: isValid,
        parser: parser
    };
})();

//
//  Patch for CSSStyleDeclaration width property that handles
//  values of "auto" properly
//
var WIDTH = (function () {
    var parseMeasurement = require(PARSERS).parseMeasurement;

    function parse(v) {
        if (String(v).toLowerCase() === "auto") {
            return "auto";
        }
        return parseMeasurement(v);
    }

    return {
        set: function (v) {
            this._setProperty('width', parse(v));
        },
        get: function () {
            return this.getPropertyValue('width');
        },
        enumerable: true,
        configurable: true
    };
})();


//
//  Patch for CSSStyleDeclaration lengthRegEx so that it includes ex units
//  (plus a number of other units that are left out)
//  
var FixValueType = function () {
    var parsers = require(PARSERS);

    var integerRegEx = /^[\-+]?[0-9]+$/;
    var numberRegEx = /^[\-+]?[0-9]*\.[0-9]+$/;
    var lengthRegEx = /^(0|[\-+]?[0-9]*\.?[0-9]+(in|cm|mm|pt|pc|px|em|ex|ch|rem|vh|vw|vmin|vmax))$/;
    var percentRegEx = /^[\-+]?[0-9]*\.?[0-9]+%$/;
    var urlRegEx = /^url\(\s*([^\)]*)\s*\)$/;
    var stringRegEx = /^(\"[^\"]*\"|\'[^\']*\')$/;
    var colorRegEx1 = /^#[0-9a-fA-F][0-9a-fA-F][0-9a-fA-F]([0-9a-fA-F][0-9a-fA-F][0-9a-fA-F])?$/;
    var colorRegEx2 = /^rgb\(([^\)]*)\)$/;
    var colorRegEx3 = /^rgba\(([^\)]*)\)$/;
    var angleRegEx = /^([\-+]?[0-9]*\.?[0-9]+)(deg|grad|rad)$/;

    parsers.valueType = function valueType(val) {
        var TYPES = parsers.TYPES;
        if (val === '' || val === null) return TYPES.NULL_OR_EMPTY_STR;
        if (typeof val === 'number') val = val.toString();
        if (typeof val !== 'string') return undefined;

        if (integerRegEx.test(val)) return TYPES.INTEGER;
        if (numberRegEx.test(val))  return TYPES.NUMBER;
        if (lengthRegEx.test(val))  return TYPES.LENGTH;
        if (percentRegEx.test(val)) return TYPES.PERCENT;
        if (urlRegEx.test(val))     return TYPES.URL;
        if (stringRegEx.test(val))  return TYPES.STRING;
        if (angleRegEx.test(val))   return TYPES.ANGLE;
        if (colorRegEx1.test(val))  return TYPES.COLOR;
        var res = colorRegEx2.exec(val);
        var parts;
        if (res !== null) {
            parts = res[1].split(/\s*,\s*/);
            if (parts.length !== 3) return undefined;
            if (parts.every(percentRegEx.test.bind(percentRegEx)) ||
                parts.every(integerRegEx.test.bind(integerRegEx))) return TYPES.COLOR;
            return undefined;
        }
        res = colorRegEx3.exec(val);
        if (res !== null) {
            parts = res[1].split(/\s*,\s*/);
            if (parts.length !== 4) return undefined;
            if (parts.slice(0, 3).every(percentRegEx.test.bind(percentRegEx)) ||
                parts.every(integerRegEx.test.bind(integerRegEx))) {
                if (numberRegEx.test(parts[3])) return TYPES.COLOR;
            }
            return undefined;
        }
        val = val.toLowerCase();
        switch (val) {
            case 'maroon':
            case 'red':
            case 'orange':
            case 'yellow':
            case 'olive':
            case 'purple':
            case 'fuchsia':
            case 'white':
            case 'lime':
            case 'green':
            case 'navy':
            case 'blue':
            case 'aqua':
            case 'teal':
            case 'black':
            case 'silver':
            case 'gray':
            // the following are deprecated in CSS3
            case 'activeborder':
            case 'activecaption':
            case 'appworkspace':
            case 'background':
            case 'buttonface':
            case 'buttonhighlight':
            case 'buttonshadow':
            case 'buttontext':
            case 'captiontext':
            case 'graytext':
            case 'highlight':
            case 'highlighttext':
            case 'inactiveborder':
            case 'inactivecaption':
            case 'inactivecaptiontext':
            case 'infobackground':
            case 'infotext':
            case 'menu':
            case 'menutext':
            case 'scrollbar':
            case 'threeddarkshadow':
            case 'threedface':
            case 'threedhighlight':
            case 'threedlightshadow':
            case 'threedshadow':
            case 'window':
            case 'windowframe':
            case 'windowtext':
                return TYPES.COLOR;
            default:
                return TYPES.KEYWORD;
        }
    };
};


//
//  Patch jsdom functions
//
exports.patch = function (jsdom) {
    var document = jsdom('');
    var window = document.defaultView;
    //
    //  Fix setting of style attributes so shorthands work properly.
    //
    var div = document.createElement("div");
    div.style.border = "1px solid black";
    if (div.style.border !== "1px solid black") {
        var INIT = window.HTMLElement._init;
        window.HTMLElement._init = function () {
            INIT.apply(this,arguments);
            var that = this;
            this.style._onChange = function (csstext) {
                if (!that._settingCssText) {
                    that._settingCssText = true;
                    that.setAttribute('style', csstext);
                    that._settingCssText = false;
                }
            };
        }
    }
    //
    //  Add missing nodeName to Attr (after jsdom 7.1.0, it is no longer defined)
    //  since this is used in mml2jax.
    //
    if (!("nodeName" in window.Attr.prototype)) {
        Object.defineProperties(window.Attr.prototype,{
            nodeName: {get: function() {return this.name}}
        });
    }
    //
    //  Fix CSSStyleDeclaration properties that are broken (padding, margin, width)
    //
    div.style.paddingTop = "10px";
    div.style.padding = "1px";
    if (div.style.paddingTop !== "1px") {
        var core = require("jsdom/lib/jsdom/level1/core");
        Object.defineProperties(core.CSSStyleDeclaration.prototype,{
            padding: PADDING.definition,
            margin: MARGIN.definition
        });
    }
    div.style.padding = "1px 2px 3px 4px";
    div.style.paddingTop = "10px";
    if (div.style.padding !== "10px 2px 3px 4px") {
        var core = require("jsdom/lib/jsdom/level1/core");
        Object.defineProperties(core.CSSStyleDeclaration.prototype,{
            marginTop: {
                set: subImplicitSetter('margin', 'top', MARGIN.isValid, MARGIN.parser),
                get: function () {
                    return this.getPropertyValue('margin-top');
                }
            },
            marginRight: {
                set: subImplicitSetter('margin', 'right', MARGIN.isValid, MARGIN.parser),
                get: function () {
                    return this.getPropertyValue('margin-right');
                }
            },
            marginBottom: {
                set: subImplicitSetter('margin', 'bottom', MARGIN.isValid, MARGIN.parser),
                get: function () {
                    return this.getPropertyValue('margin-bottom');
                }
            },
            marginLeft: {
                set: subImplicitSetter('margin', 'left', MARGIN.isValid, MARGIN.parser),
                get: function () {
                    return this.getPropertyValue('margin-left');
                }
            },
            paddingTop: {
                set: subImplicitSetter('padding', 'top', PADDING.isValid, PADDING.parser),
                get: function () {
                    return this.getPropertyValue('padding-top');
                }
            },
            paddingRight: {
                set: subImplicitSetter('padding', 'right', PADDING.isValid, PADDING.parser),
                get: function () {
                    return this.getPropertyValue('padding-right');
                }
            },
            paddingBottom: {
                set: subImplicitSetter('padding', 'bottom', PADDING.isValid, PADDING.parser),
                get: function () {
                    return this.getPropertyValue('padding-bottom');
                }
            },
            paddingLeft: {
                set: subImplicitSetter('padding', 'left', PADDING.isValid, PADDING.parser),
                get: function () {
                    return this.getPropertyValue('padding-left');
                }
            }
        });
    }
    div.style.width = "auto";
    if (div.style.width !== "auto") {
        var core = require("jsdom/lib/jsdom/level1/core");
        Object.defineProperties(core.CSSStyleDeclaration.prototype,{width: WIDTH});
    }
    div.style.marginTop = "3ex";
    if (div.style.marginTop !== "3ex") FixValueType();
};
