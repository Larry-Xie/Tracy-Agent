(function () {
    'use strict';

    if (window === window.top) {
        return;
    }

    /* *********************************************************************************
     * Locate unique element
     * *********************************************************************************/
    var locateUniqueElement = (function () {
        'use strict';

        var getLastPath = function (xpath) {
                var paths = xpath.split('/');
                return paths[paths.length - 1];
            },

            // Return text part of an element tree or from a xpath string
            getText = function (element) {
                var matched,
                    result = '';

                if (typeof element === 'string') {
                    matched = getLastPath(element).match(/(\[\..*?\])/isgm);
                    result = (matched && matched[0]) || '';
                } else if (typeof element === 'object') {
                    result = (element.text ? ('[.="' + element.text + '"]') : '');
                }

                var text = result && result.split('"')[1];

                return (text && text.trim()) ? '[contains(., "' + text.trim() + '")]' : '';
            },

            // Return id of an element tree or from a xpath string
            getId = function (element) {
                var matched;

                if (typeof element === 'string') {
                    matched = getLastPath(element).match(/\[(@id.*?\])/igm);
                    return (matched && matched[0]) || '';
                }

                return (element.id ? ('[@id="' + element.id + '"]') : '');
            },

            // Return class name
            getClass = function (element) {
                var matched;

                if (typeof element === 'string') {
                    matched = getLastPath(element).match(/\[(@class.*?\])/igm);
                    return (matched && matched[0]) || '';
                }

                return (element.cls ? ('[@class="' + element.cls + '"]') : '');
            },

            // Return the position relative to its sibling node
            getSiblingIndex = function (element) {
                var matched;

                if (typeof element === 'string') {
                    matched = getLastPath(element).match(/(\[\d+\])/igm);
                    return (matched && matched[0]) || '';
                }

                return (element.siblingIndex !== undefined ? ('[' + (element.siblingIndex + 1) + ']') : '');
            },

            // Return element tag name
            getTag = function (element) {
                if (typeof element === 'string') {
                    return getLastPath(element).split('[')[0].toLowerCase();
                }

                return element.tag.toLowerCase();
            },

            // Construct xpath string with tag/sibling index/class name/id/text
            getStrictPathFromElement = function (element) {
                var text = '/' + getTag(element) +
                    getSiblingIndex(element) +
                    getClass(element) +
                    getId(element) +
                    getText(element);

                return text;
            },

            // Construct xpath string with tag/class name/id/text
            getLoosePathByRemoveIndex = function (element) {
                var text = '/' + getTag(element) +
                    getClass(element) +
                    getId(element) +
                    getText(element);

                return text;
            },

            // Construct xpath with tag/sibling index/id/text
            getLoosePathByRemoveClass = function (element) {
                var text = '/' + getTag(element) +
                    getSiblingIndex(element) +
                    getId(element) +
                    getText(element);

                return text;
            },

            // Construct xpath with tag/sibling index/class name/text
            getLoosePathByRemoveId = function (element) {
                var text = '/' + getTag(element) +
                    getSiblingIndex(element) +
                    getClass(element) +
                    getText(element);

                return text;
            },

            // Construct xpath with tag/sibling index/id/text
            getLoosePathByRemoveIndexClassId = function (element) {
                var text = '/' + getTag(element) + getText(element);

                return text;
            },

            // Find elements via XPath
            evaluate = function (selector, dom) {
                return new XPathEvaluator().evaluate(
                    '/' + selector,
                    dom || document.documentElement, // Use HTML BODY DOM to compare if dom parameter is null
                    null,
                    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                    null);
            },

            // Define Operation mode: One Strict mode and 4 Maintaince modes
            OperationType = {
                STRICT: 'STRICT',
                LOOSE_REMOVE_INDEX: 'LOOSE_REMOVE_INDEX',
                LOOSE_REMOVE_CLASS: 'LOOSE_REMOVE_CLASS',
                LOOSE_REMOVE_ID: 'LOOSE_REMOVE_ID',
                LOOSE_REMOVE_INDEX_CLASS_ID: 'LOOSE_REMOVE_INDEX_CLASS_ID'
            },

            getSelector = function (element, lastSelector, operationType) {
                var selector;

                switch (operationType) {
                    case OperationType.STRICT:
                        selector = getStrictPathFromElement(element);
                        break;
                    case OperationType.LOOSE_REMOVE_INDEX:
                        selector = getLoosePathByRemoveIndex(element);
                        break;
                    case OperationType.LOOSE_REMOVE_CLASS:
                        selector = getLoosePathByRemoveClass(element);
                        break;
                    case OperationType.LOOSE_REMOVE_ID:
                        selector = getLoosePathByRemoveId(element);
                        break;
                    case OperationType.LOOSE_REMOVE_INDEX_CLASS_ID:
                        selector = getLoosePathByRemoveIndexClassId(element);
                        break;
                    default:
                        throw 'ERROR: the third parameter operationType is not allowed';
                        break;
                }

                return (selector + lastSelector);
            },

            updateOperationType = function (operationType) {
                switch (operationType) {
                    case OperationType.STRICT:
                        return OperationType.LOOSE_REMOVE_INDEX;
                        break;
                    case OperationType.LOOSE_REMOVE_INDEX:
                        return OperationType.LOOSE_REMOVE_CLASS;
                        break;
                    case OperationType.LOOSE_REMOVE_CLASS:
                        return OperationType.LOOSE_REMOVE_ID;
                        break;
                    case OperationType.LOOSE_REMOVE_ID:
                        return OperationType.LOOSE_REMOVE_INDEX_CLASS_ID;
                        break;
                    case OperationType.LOOSE_REMOVE_INDEX_CLASS_ID:
                        return undefined;
                        break;
                    default:
                        throw 'ERROR: the third parameter operationType is not allowed';
                        break;
                }
            },

            getParentNode = function (element) {
                var matched;
                if (typeof element === 'string') {
                    matched = element.match(/^.*(?=\/)|^.*/igm);
                    return matched && (matched[0] === '/' ? undefined : matched[0]);
                }

                return element.parentElem;
            },

            /**
             * Locate unqiue element by element object stored before in a DOM
             * @param {Object | String} element - A element tree to record self attributes and parent relationship. Or a XPath as long as possible.
             * @param {String} lastSelector - First recurrence, the param is empty string '', for record xpath selector each recurrence
             * @param {String} Use which mode to connect Xpath selector, strict mode, or loose mode.
             * @param {Object} dom - Optional parameter, DOM will be compared
             * @returns {object} If found unique element, return the element DOM, otherwise return undefined
             */
            locateUniqueElement = function (element, lastSelector, operationType, dom) {
                var selector,
                    result,
                    newType;

                // Get Xpath selector
                selector = getSelector(element, lastSelector, operationType);
                // Evaluate Xpath selctor in HTML DOM
                result = evaluate(selector, dom);

                if (result.snapshotLength === 1) { // Found unique element
                    // return element
                    return result.snapshotItem(0);
                } else if (result.snapshotLength > 1 && getParentNode(element)) { // Found multiple elements
                    // use strict mode to lengthen xpath recursively
                    return locateUniqueElement(getParentNode(element), selector, OperationType.STRICT, dom);
                } else if (result.snapshotLength === 0) { // Not found element, use maintenance mode
                    newType = updateOperationType(operationType);
                    if (!newType) {
                        // Current mode is already the most maintenace mode, locate failed
                        return undefined;
                    }

                    return locateUniqueElement(element, lastSelector, newType, dom);
                } else if (!getParentNode(element)) {
                    return undefined;
                } else {
                    throw 'ERROR: Never runing here';
                }
            };

        /**
         * Locate unqiue element by finding element object stored before in a DOM
         * @param {Object | String} element - A element tree to record self attributes and parent relationship, or a XPath string as long as possible.
         * @param {Object} dom - Optional parameter, DOM will be compared
         * @returns {object} If found unique element, return the element DOM, otherwise return undefined
         */
        return function (element, dom) {
            return locateUniqueElement(element, '', OperationType.STRICT, dom);
        };
    })();

    /* *********************************************************************************
     * Global variables
     * *********************************************************************************/
    var parentDomain;
    var urlChangeIntervalTimer = null;
    var playActionIntervalTimer = null;
    var verifyElementIntervalTimer = null;

    var eventMap = {
        a: {
            events: ["click"],
            attr: ["href"]
        },
        button: {
            events: ["click"],
            attr: ["value", "name"]
        },
        img: {
            events: ["click"],
            attr: ["src", "alt"]
        },
        select: {
            events: ["mouseup"],
            attr: ["name", "type", "selectedIndex"]
        },
        textarea: {
            events: ["mouseup"],
            attr: ["name"]
        },
        'input[type="submit"]': {
            events: ["click"],
            attr: ["name", "type", "value"]
        },
        'input[type="button"]': {
            events: ["click"],
            attr: ["name", "type", "value"]
        },
        'input[type="radio"]': {
            events: ["click"],
            attr: ["name", "type"]
        },
        'input[type="checkbox"]': {
            events: ["click"],
            attr: ["name", "type"]
        },
        'input[type="email"]': {
            events: ["click"],
            attr: ["name", "type"]
        },
        'input[type="search"]': {
            events: ["click"],
            attr: ["name", "type"]
        },
        'input[type="tel"]': {
            events: ["click"],
            attr: ["name", "type"]
        },
        'input[type="password"]': {
            events: ["click"],
            attr: ["name", "type"]
        },
        'input[type="text"]': {
            events: ["click"],
            attr: ["name", "type"]
        }
    };

    var inputTextBoxList = [
        'input[type="email"]',
        'input[type="search"]',
        'input[type="tel"]',
        'input[type="password"]',
        'input[type="text"]',
        'input[type="undefined"]' // For some input tag doesn't write type
    ];

    var nodeTypeEnum = {
        TEXT_ELEMENT: 3,
        ELEMENT_NODE: 1,
        DOCUMENT_NODE: 9,
        DOCUMENT_FRAGMENT_NODE: 11,
        CDATA_SECTION_NODE: 4
    };

    var StateMachineStatus = {
        VIEW: 1,
        LOADING: 2,
        LOADING_ERROR: 3,
        LOOP_RUNNING: 4,
        LOOP_COMPLETED: 5,
        LOOP_PAUSE: 6,
        LOOP_STOPED_WITH_ERROR: 7,
        RECORDING: 8,
        RELOADING: 9,
        SINGLE_RUNNING: 10,
        SINGLE_COMPLETED: 11,
        SINGLE_PAUSE: 12,
        SINGLE_STOPED_WITH_ERROR: 13
    };

    var REPEAT_TOTAL_COUNT = 10;
    var REPEAT_INTERVAL = 500;

    var controlKeyDown = false;
    var isSynced;
    var syncMessage;
    var shiftKeyDown = false;
    var textBoxListeners = [];

    var isNodeTheRoot = function (node) {
        return 'BODY' === node.nodeName || null === node.parentNode;
    };

    var handleEmbeddedData = function (e) {
        return e && 0 === e.indexOf("data:") ? e.substring(0, e.indexOf(",")) : e + "";
    };

    var extractAttribute = function (e, t, n) {
        var i = e.nodeName.toLowerCase();
        if ("img" == i && "src" == t || "a" == i && "href" == t) {
            var r = e.getAttribute(t);
            return handleEmbeddedData(r)
        }
        var o = e.getAttribute;
        return o ? e.getAttribute(t) : n && typeof o != n ? null : o ? o : null;
    };

    var extractElementContext = function (e) {
        var element = {};
        element.tag = e.nodeName;
        element.id = e.id ? '' + e.id : '';
        element.cls = e.className ? '' + e.className : '';

        var tag = element.tag.toLowerCase();
        'input' === tag && (tag += '[type="' + e.type + '"]');
        element.attrs = {};

        var setAttribute = function (attrName) {
            var attr = extractAttribute(e, attrName);
            attr && (element.attrs[attrName] = attr);
        };
        eventMap[tag] && eventMap[tag].attr.forEach(setAttribute);

        if (e.attributes) {
            for (var i = 0; i < e.attributes.length; i++) {
                e.attributes[i] && setAttribute(e.attributes[i].nodeName);
            }
        }

        if (e.parentNode && e.parentNode.childNodes) {
            var childNodes = e.parentNode.childNodes;
            for (var j = 0; j < childNodes.length; j++) {
                if (childNodes[j] === e) {
                    element.myIndex = j;
                    break;
                }
            }

            var elementNodes = [];
            for (var k = 0; k < childNodes.length; k++) {
                if (childNodes[k].nodeType === nodeTypeEnum.ELEMENT_NODE && childNodes[k].tagName === e.tagName) {
                    elementNodes.push(childNodes[k]);
                }
            }

            element.siblingIndex = elementNodes.indexOf(e);
            element.siblings = elementNodes.length;
            element.child = e.childElementCount;
        }

        return element;
    };

    function isHighSurrogate(e) {
        return e >= 55296 && 56319 >= e;
    }

    function isLowSurrogate(e) {
        return e >= 56320 && 57343 >= e;
    }

    function trimSurrogate(e) {
        if (e.length < 1) {
            return e;
        }
        var t = e.slice(-1).charCodeAt(0);
        if (!isHighSurrogate(t) && !isLowSurrogate(t)) {
            return e;
        }
        if (1 === e.length) {
            return e.slice(0, -1);
        }
        if (isHighSurrogate(t)) {
            return e.slice(0, -1);
        }
        if (isLowSurrogate(t)) {
            var n = e.slice(-2).charCodeAt(0);
            if (!isHighSurrogate(n)) {
                return e.slice(0, -1)
            }
        }
        return e;
    }

    function getText(e, t) {
        var n, i = "",
            r = e.nodeType;
        if (r === nodeTypeEnum.TEXT_ELEMENT || r === nodeTypeEnum.CDATA_SECTION_NODE) {
            return e.nodeValue;
        }
        if ((r === nodeTypeEnum.ELEMENT_NODE || r === nodeTypeEnum.DOCUMENT_NODE || r === nodeTypeEnum.DOCUMENT_FRAGMENT_NODE)) {
            for (e = e.firstChild; e; e = e.nextSibling) {
                n = getText(e, t - i.length)
                if ((i + n).length >= t) {
                    return i + trimSurrogate(n.substring(0, t - i.length));
                }
                i += n;
            }
        }
        return i;
    }

    var extractElementTreeContext = function (e) {
        var t, n = {},
            i = n,
            r = e;
        do {
            t = r;
            var o = extractElementContext(t);
            i.parentElem = o;
            i = o;
            r = t.parentNode;
        } while (!isNodeTheRoot(t));

        var text = getText(e);
        text && (n.parentElem.text = text);
        n.parentElem.href = window.location.href;

        if ((e.nodeName.toLowerCase() + '["' + e.type + '"]') === 'input["text"]') {
            n.parentElem.value = e.value;
        }

        return n.parentElem;
    };

    var getTarget = function (event) {
        return event.target || event.srcElement;
    };

    var getValidTarget = function (node) {
        return node.nodeType === nodeTypeEnum.TEXT_ELEMENT ?
            node.parentNode :
            node.nodeType === nodeTypeEnum.CDATA_SECTION_NODE ? null : node.correspondingUseElement ? node.correspondingUseElement : node
    };

    var fireEvent = function (element, eventName) {
        try {
            var event1 = new MouseEvent(eventName, { 'view': window, 'bubbles': true, 'cancelable': true });
            element.dispatchEvent(event1);
        } catch (err) {
            var event = document.createEvent('Events');
            event.initEvent(eventName, true, false);
            element.dispatchEvent(event);
        }
    };

    var executeEvalString = function (evalString) {
        let result;

        evalString = evalString.split('{')[1].split('}')[0];

        try {
            result = eval(evalString);
        } catch (err) {
            console.error(err);
        }

        return result;
    }

    var isEvalString = function (str) {
        var exp = str.trim();
        return (exp[0] === '{' && exp[exp.length - 1] === '}');
    }

    var executeElement = function (element, value) {
        var tag = element.nodeName.toLowerCase();
        tag === 'input' && (tag += '[type="' + element.type + '"]');

        clickElementAnimation(element);

        setTimeout(function () {
            if (inputTextBoxList.indexOf(tag) > -1 || tag === 'textarea') {
                element.focus();
                if (value !== undefined) {
                    if (isEvalString(value)) {
                        element.value = executeEvalString(value);
                    } else {
                        element.value = value;
                    }
                    element.dispatchEvent(new Event('input', {
                        bubbles: true
                    }));
                    element.dispatchEvent(new KeyboardEvent('keydown', {
                        bubbles: true
                    }));
                    element.dispatchEvent(new KeyboardEvent('keypress', {
                        bubbles: true
                    }));
                    element.dispatchEvent(new KeyboardEvent('keyup', {
                        bubbles: true
                    }));
                }
            } else {
                var clickResult = element.click();
            }
        }, 1000);
    };

    var locateUniqueElementUsingEvalString = function (data) {
        var text = getElementText(data);
        var newData = data;
        var element;

        if (text && isEvalString(text)) {
            var list = executeEvalString(text);
            if (Array.isArray(list)) {
                for (var i = 0; i < list.length; i++) {
                    newData = setAndReturnElementText(data, list[i]);
                    element = locateUniqueElement(newData);
                    if (element) {
                        return element;
                    }
                }
            } else if (typeof list === 'string') {
                newData = setAndReturnElementText(data, list);
            } else {
                newData = setAndReturnElementText(data, '');
            }
        }

        return locateUniqueElement(newData);
    };

    var hoverWithRepeat = function (action, total, interval) {
        var count = 0;
        var element = locateUniqueElementUsingEvalString(action.data);

        if (element) {
            sendStatusPassEvent(action);
            fireEvent(element, 'mouseenter');
            return;
        }

        playActionIntervalTimer = setInterval(function () {
            element = locateUniqueElementUsingEvalString(action.data);
            if (element) {
                playActionIntervalTimer && clearInterval(playActionIntervalTimer);
                playActionIntervalTimer = null;
                sendStatusPassEvent(action);
                fireEvent(element, 'mouseenter');
                return;
            }

            if (count++ >= total) {
                playActionIntervalTimer && clearInterval(playActionIntervalTimer);
                playActionIntervalTimer = null;
                // Send Pass no matter pass/fail, will check later
                sendStatusPassEvent(action);
            }
        }, interval);
    };

    var playActionWithRepeat = function (action, total, interval) {
        var count = 0;
        var element = locateUniqueElementUsingEvalString(action.data);
        var value;

        if (element) {
            sendStatusPassEvent(action);

            if (action.value !== undefined) {
                value = action.value;
            } else if (action.data.value !== undefined) {
                value = action.data.value;
            }

            executeElement(element, value);
            return;
        }

        playActionIntervalTimer = setInterval(function () {
            element = locateUniqueElementUsingEvalString(action.data);
            if (element) {
                playActionIntervalTimer && clearInterval(playActionIntervalTimer);
                playActionIntervalTimer = null;
                sendStatusPassEvent(action);
                executeElement(element);
                return;
            }

            if (count++ >= total) {
                playActionIntervalTimer && clearInterval(playActionIntervalTimer);
                playActionIntervalTimer = null;
                sendStatusFailEvent(action, 'Do not get element');
            }
        }, interval);
    };

    var compareElement = function (action, element) {
        highlightElement(element);
        setTimeout(function () {
            removeHighlightElement(element);
        }, 1000);

        element = getValidTarget(element);
        var elementTree = extractElementTreeContext(element);
        var statusMessage = {};

        statusMessage.href = window.location.href;
        statusMessage.measure = true;
        statusMessage.elementTree = elementTree;

        sendStatusPassEvent(action, statusMessage);
    };

    var verifyElementWithRepeat = function (action, total, interval) {
        var count = 0;
        var element = locateUniqueElementUsingEvalString(action.data);

        if (element) {
            compareElement(action, element);
            return;
        }

        verifyElementIntervalTimer = setInterval(function () {
            element = locateUniqueElementUsingEvalString(action.data);
            if (element) {
                verifyElementIntervalTimer && clearInterval(verifyElementIntervalTimer);
                verifyElementIntervalTimer = null;

                compareElement(action, element);
                return;
            }

            if (count++ >= total) {
                verifyElementIntervalTimer && clearInterval(verifyElementIntervalTimer);
                verifyElementIntervalTimer = null;

                sendStatusFailEvent(action, 'Do not get element');
            }
        }, interval);
    };

    var typeKeyboard = function (action) {
        var keys = action.data;
        var keydownEvent, keyupEvent, keypressEvent;

        keys.forEach(function (key) {
            keydownEvent = new KeyboardEvent('keydown', key);
            document.dispatchEvent(keydownEvent);

            keyupEvent = new KeyboardEvent('keyup', key);
            document.dispatchEvent(keyupEvent);
        });
    };

    var clickElementAnimation = function (element) {
        var rect = element.getBoundingClientRect();
        var div = document.createElement('div');
        var i = 0;
        var sheet;
        div.style.position = 'absolute';
        div.style.left = (rect.left - 30 + rect.width / 2) + 'px';
        div.style.top = (rect.top - 30 + rect.height / 2 + document.documentElement.scrollTop) + 'px';
        div.style.width = '60px';
        div.style.height = '60px';
        div.style.border = '3px solid red';
        div.style.borderRadius = '60px';
        div.style.zIndex = 2147483647;
        div.style.animation = 'warn 0.25s ease-out infinite';

        for (i = 0; i < document.styleSheets.length; i++) {
            sheet = document.styleSheets[i];
            if (!sheet.href) break;
        }

        try {
            if (sheet && sheet.cssRules && sheet.cssRules.length) {
                sheet.insertRule(`@keyframes warn {
                    0% {
                        transform: scale(0);
                    }
                    10% {
                        transform: scale(0.1);
                    }
                    20% {
                        transform: scale(0.2);
                    }
                    30% {
                        transform: scale(0.3);
                    }
                    40% {
                        transform: scale(0.4);
                    }
                    50% {
                        transform: scale(0.5);
                    }
                    60% {
                        transform: scale(0.6);
                    }
                    70% {
                        transform: scale(0.7);
                    }
                    80% {
                        transform: scale(0.8);
                    }
                    90% {
                        transform: scale(0.9);
                    }
                    100% {
                        transform: scale(1);
                    }
                }`, sheet.cssRules.length);
            }

            document.body.appendChild(div);

            setTimeout(function () {
                document.body.removeChild(div);
            }, 1000);
        } catch (err) {}
    };

    var getElementText = function (element) {
        var matched;

        if (typeof element === 'string') {
            matched = element.split('[.="');
            return matched[1] && matched[1].split('"]')[0];
        } else if (typeof element === 'object') {
            return element.text;
        }
    };

    var setAndReturnElementText = function (element, value) {
        var matchs;

        if (typeof element === 'string') {
            matchs = element.split('[.=');
            if (value !== undefined) {
                element = `${matchs[0]}[.="${value}"]`;
            }
        } else if (typeof element === 'object') {
            element.text = value;
        }

        return element;
    };

    var mouseEnterElement = function (data) {
        var element = locateUniqueElementUsingEvalString(data);

        if (element) {
            highlightElement(element);
        }
    };

    var highlightElement = function (element) {
        var rect = element.getBoundingClientRect();
        var div = document.createElement('div');
        div.id = 'tm-highlight';
        div.style.position = 'absolute';
        div.style.left = rect.left + 'px';
        div.style.top = rect.top + document.documentElement.scrollTop + 'px';
        div.style.width = rect.width + 'px';
        div.style.height = rect.height + 'px';
        div.style.border = '2px dashed red';
        div.style.backgroundColor = 'rgba(95, 129, 170, 0.6)';
        div.style.zIndex = 2147483647;

        document.body.appendChild(div);
    };

    var removeHighlightElement = function () {
        var div;
        do {
            div = document.getElementById('tm-highlight');
            div && document.body.removeChild(div);
        } while (div);
    }

    var mouseLeaveElement = function (data) {
        removeHighlightElement();
    };

    var getHost = function (url) {
        var pathArray = url.split('/');
        var protocol = pathArray[0];
        var host = pathArray[2];

        return `${protocol}//${host}`;
    };

    var receive = function (event) {
        try {
            var message = JSON.parse(event.data);
            console.log(`${location.href} reveive ${message.type} message from ${event.origin}:`);

            if (!message.isFromParent) {
                // If message is from child frame and not load message, post it to parent frame
                if (message.type !== 'tm:iframe-ready' && message.type !== 'tm:load' && message.type !== 'tm:unload') {
                    sendToParent(message);
                    return;
                }
                // If message is from child frame and load message, send the sync message to it
                if (message.type === 'tm:load' && isSynced) {
                    sendSyncMessageToChild(message);
                    return;
                }
            }

            // If message is from parent frame and target is not current frame, post it to corresponding child frame
            if (message.isFromParent && message && message.type !== 'tm:sync' && message.type !== 'tm:record'
                && message.data && message.data.href && message.data.href.indexOf(location.host) === -1) {
                sendToChild(message, false);
                return;
            }

            switch (message.type) {
                case 'tm:action':
                    playActionWithRepeat(message.data, REPEAT_TOTAL_COUNT, REPEAT_INTERVAL);
                    break;
                case 'tm:measure':
                    verifyElementWithRepeat(message.data, REPEAT_TOTAL_COUNT, REPEAT_INTERVAL);
                    break;
                case 'tm:mouseover':
                    hoverWithRepeat(message.data, REPEAT_TOTAL_COUNT, REPEAT_INTERVAL);
                    break;
                case 'tm:keyboard':
                    typeKeyboard(message.data);
                    break;
                case 'tm:keyup':
                    if (message.data === 'ControlLeft') {
                        controlKeyDown = false;
                    } else if (message.data === 'ShiftLeft') {
                        shiftKeyDown = false;
                    }
                    break;
                case 'tm:keydown':
                    if (message.data === 'ControlLeft') {
                        controlKeyDown = true;
                    } else if (message.data === 'ShiftLeft') {
                        shiftKeyDown = true;
                    }
                    break;
                case 'tm:mouseenter':
                    mouseEnterElement(message.data);
                    break;
                case 'tm:mouseleave':
                    mouseLeaveElement(message.data);
                    break;
                case 'tm:record':
                    attachRecordEventListener();
                    sendToChild(message, true);
                    break;
                case 'tm:unrecord':
                    deattachRecordEventListener();
                    sendToChild(message, true);
                    break;
                case 'tm:sync':
                    parentDomain = getHost(message.data.href);
                    if (message.data.status === StateMachineStatus.RECORDING) {
                        isSynced = true;
                        syncMessage = message;
                        syncMessage.isFromParent = true;
                        syncMessage.data.href = location.href;
                        attachRecordEventListener();
                    } else {
                        deattachRecordEventListener();
                    }
                    break;
                default:
                    break;
            }

        } catch (error) {}
    };

    var urlChangeListener = function () {
        sendPageLoadEvent();
    };

    var detectUrlChange = function () {
        var lastBrowserUrl, browserUrl;

        var fireUrlChange = function () {
            browserUrl = window.location.href;

            if (lastBrowserUrl !== browserUrl) {
                lastBrowserUrl = browserUrl;
                urlChangeListener();
            }
        }

        urlChangeIntervalTimer = setInterval(fireUrlChange, 100);
    };

    var sendToParent = function (message) {
        console.log(`${location.href} post ${message.type} message to parent:`);
        message.isFromParent = false;
        window.parent.postMessage(JSON.stringify(message), parentDomain || '*');
    };

    var sendToChild = function (message, isBroadcast) {
        var iframeElements = document.querySelectorAll('iframe');
        message.isFromParent = true;
        if (isBroadcast) {
            console.log(`${location.href} post broadcast ${message.type} message to child:`);
            for (var i = 0; i < iframeElements.length; i++) {
                iframeElements[i].contentWindow.postMessage(JSON.stringify(message), '*');
            }
        } else {
            for (var i = 0; i < iframeElements.length; i++) {
                if (getHost(iframeElements[i].src) === getHost(message.data.href)) {
                    console.log(`${location.href} post ${message.type} message to child ${message.data.href}:`);
                    iframeElements[i].contentWindow.postMessage(JSON.stringify(message), '*');
                    break;
                }
            }
        }
    };

    var sendSyncMessageToChild = function (originalMessage) {
        var iframeElements = document.querySelectorAll('iframe');
        for (var i = 0; i < iframeElements.length; i++) {
            if (getHost(iframeElements[i].src) === getHost(originalMessage.href)) {
                console.log(`${location.href} post sync message to child ${originalMessage.href}.`);
                iframeElements[i].contentWindow.postMessage(JSON.stringify(syncMessage), '*');
                break;
            }
        }
    };

    var sendMessageToParent = function (messageType, data) {
        var message = {};
        message.type = messageType;
        message.guid = +new Date();
        message.href = location.href;
        data && (message.data = data);

        sendToParent(message);
    };

    var sendActionEvent = function (action) {
        sendMessageToParent('tm:action', action);
    };

    var sendMouseOverEvent = function (data) {
        sendMessageToParent('tm:mouseover', data);
    };

    var sendTextboxEvent = function (value) {
        sendMessageToParent('tm:textbox', value);
    };

    var sendMeasureEvent = function (measure) {
        sendMessageToParent('tm:measure', measure);
    };

    var sendStatusPassEvent = function (action, value) {
        var statusMessage = {};
        statusMessage.status = 'PASSED';
        statusMessage.guid = action.guid;
        value && (statusMessage.value = value);
        sendMessageToParent('tm:status', statusMessage);
    };

    var sendStatusFailEvent = function (action, value) {
        var statusMessage = {};
        statusMessage.status = 'FAILED';
        statusMessage.guid = action.guid;
        value && (statusMessage.value = value);
        sendMessageToParent('tm:status', statusMessage);
    };

    var sendIframeReadyEvent = function () {
        sendMessageToParent('tm:iframe-ready');
    };

    var sendUnloadEvent = function () {
        sendMessageToParent('tm:unload');
    };

    var sendPageLoadEvent = function () {
        sendMessageToParent('tm:load');
    };

    var isTextBox = function (elementTree) {
        var tag = elementTree.tag.toLowerCase();

        tag === 'input' && (tag += '[type="' + elementTree.attrs.type + '"]');

        return (inputTextBoxList.indexOf(tag) > -1) || (tag === 'textarea');
    };

    var isInvalidClick = function (event) {
        return (!event.clientX || !event.clientY);
    };

    var handleTextBoxKeyUp = function (e) {
        sendTextboxEvent(e.target.value);
    };

    // Event listener functions
    var handleClickEvent = function (event) {
        if (isInvalidClick(event)) {
            return;
        }

        var node = getTarget(event);
        node = getValidTarget(node);
        var elementTree = extractElementTreeContext(node);

        if (isTextBox(elementTree)) {
            var index = textBoxListeners.findIndex(function (listener) {
                return listener.target === event.target;
            });

            if (index === -1) {
                event.target.addEventListener('keyup', handleTextBoxKeyUp);
                textBoxListeners.push({
                    target: event.target,
                    message: 'keyup',
                    handler: handleTextBoxKeyUp
                });
            }
        }

        if (controlKeyDown) {
            event.preventDefault();
            event.stopPropagation();
            sendMeasureEvent(elementTree);
        } else {
            sendActionEvent(elementTree);
        }
    };

    var handleKeyDownEvent = function (event) {
        if (event.code === 'ControlLeft') {
            controlKeyDown = true;
        }

        if (event.code === 'ShiftLeft') {
            shiftKeyDown = true;
        }
    };

    var handleKeyUpEvent = function (event) {
        if (event.code === 'ControlLeft') {
            controlKeyDown = false;
        }

        if (event.code === 'ShiftLeft') {
            shiftKeyDown = false;
        }
    };

    var handleMouseOverEvent = function (event) {
        if (!shiftKeyDown) {
            return;
        }

        var node = getTarget(event);
        node = getValidTarget(node);
        var elementTree = extractElementTreeContext(node);

        sendMouseOverEvent(elementTree);
    };

    var attachRecordEventListener = function () {
        document.addEventListener('click', handleClickEvent, true);
        document.addEventListener('mouseover', handleMouseOverEvent, false);
        document.addEventListener('keydown', handleKeyDownEvent, false);
        document.addEventListener('keyup', handleKeyUpEvent, false);
    };

    var deattachRecordEventListener = function () {
        document.removeEventListener('click', handleClickEvent, true);
        document.removeEventListener('mouseover', handleMouseOverEvent, false);
        document.removeEventListener('keydown', handleKeyDownEvent, false);
        document.removeEventListener('keyup', handleKeyUpEvent, false);

        textBoxListeners.forEach(function (listener) {
            listener.target.removeEventListener(listener.message, listener.handler);
        });
        textBoxListeners = [];
    };

    var handleUnloadEvent = function () {
        sendUnloadEvent();
        urlChangeIntervalTimer && clearInterval(urlChangeIntervalTimer);
        playActionIntervalTimer && clearInterval(playActionIntervalTimer);
        verifyElementIntervalTimer && clearInterval(verifyElementIntervalTimer);
        deattachRecordEventListener();
        window.removeEventListener('message', receive, false);
        window.removeEventListener('unload', handleUnloadEvent, false);
    };

    var hasTarget = function (elementTree) {
        if (!elementTree) {
            return false;
        }

        if (elementTree.tag.toLowerCase() === 'a' &&
            elementTree.attrs.target &&
            (elementTree.attrs.target === '_blank' ||
                elementTree.attrs.target === '_top')) {
            return elementTree.attrs;
        }

        return hasTarget(elementTree.parentElem);
    };

    var hasATag = function (elementTree) {
        if (!elementTree) {
            return false;
        }

        if (elementTree.tag.toLowerCase() === 'a') {
            return elementTree.attrs;
        }

        return hasATag(elementTree.parentElem);
    }

    var handleEveryClickEvent = function (event) {
        var node = getTarget(event);
        node = getValidTarget(node);
        var elementTree = extractElementTreeContext(node);

        var target = hasATag(elementTree);
        if (target && target.href && target.href !== 'null' &&
            target.href.toLowerCase().indexOf('#') !== 0 &&
            target.href.toLowerCase().indexOf('javascript') !== 0) {
            event.preventDefault();
            event.stopPropagation();
            if (!controlKeyDown) {
                window.location.href = target.href;
            }
        }
    };

    var bindGlobalEventListener = function () {
        document.addEventListener('click', handleEveryClickEvent, true);
        window.addEventListener('message', receive, false);
        window.addEventListener('unload', handleUnloadEvent, false);
    }

    var init = function () {
        detectUrlChange();
        bindGlobalEventListener();
        sendIframeReadyEvent();
    }

    init();
})();