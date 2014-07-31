(function (window) {
    "use strict";
    var sriptDict = {}
    var pageDict = {}
    var domDict = {}
    function makeUrl(root, url) {
        root = root.substr(0, root.lastIndexOf("/") + 1);
        if (url[0] == "/") {
            return Options.domain + url;
        } else {
            return Options.domain+root + url;
        }
    }

    function defineClass(constructor, memberMethods, staticMember, parentClass) {
        if(parentClass===undefined)
        {
            parentClass = Object;
        }
        constructor.prototype = Object.create(parentClass.prototype);
        for (var k in memberMethods) {
            constructor.prototype[k] = memberMethods[k];
        }
        for (var k in staticMember) {
            constructor[k] = staticMember[k];
        }
        return constructor;
    }
    window.KingoJS = {
        log: function (msg) {
            Helper.log(msg);
        },
        genName: function () {
            return "cl" + Math.round(Math.random() * 10000) + new Date().valueOf();
        },
        Class: {
            define: defineClass
        },
        Promise: defineClass(function () {
            this.status = "init";
            this.listener = [];
            this.res = null;
            this.errorRes = null;
        },
        {
            error:function(res){
                if (this.status != "init") {
                    return null;
                }
                this.status = "error";
                this.errorRes = res;
                this._OnEnd();
            },
            resolve: function (res) {
                if (this.status != "init") {
                    return null;
                }
                this.status = "complete";
                this.res = res;
                this._OnEnd();
            },
            _OnEnd:function(){
                if(this.status == "init") return;
                if(this.status == "complete"){
                    var res = this.res;
                    if (res instanceof KingoJS.Promise) {
                        this.listener.forEach(function (listener) {
                            if (listener.onComplete) {
                                res.then(function (res) {
                                    var arg = listener.onComplete(res);
                                    listener.promise.resolve(arg);
                                });
                            }
                        });
                    } else {
                        this.listener.forEach(function (listener) {
                            if (listener.onComplete) {
                                var arg = listener.onComplete(res);
                                listener.promise.resolve(arg);
                            }
                        });
                    }
                }
                else if(this.status == "error"){
                    var res = this.errorRes;
                    this.listener.forEach(function (listener) {
                        if (listener.onError) {
                            var arg = listener.onError(res);
                            listener.promise.resolve(arg);
                        }else{
                            listener.promise.error(res);
                        }
                    });
                }
                this.listener = [];
            },
            then: function (onComplete,onError,onProgress) {
                if (onComplete == undefined || typeof onComplete != "function") {
                    return undefined;
                }
                var p = new KingoJS.Promise();
                this.listener.push({
                    onComplete: onComplete,
                    onError:onError,
                    onProgress:onProgress,
                    promise: p
                });
                if (this.status != "init") this._OnEnd();
                return p;
            }
        },
        {
            as: function (res) {
                var p = new KingoJS.Promise();
                p.resolve(res);
                return p;
            },
            join: function (ps) {
                var p = new KingoJS.Promise();
                p.jjtotal = ps.length;
                p.jjcnt = 0;
                ps.forEach(function (item) {
                    if (!item) {
                        p.jjcnt++;
                    } else {
                        item.then(function () {
                            p.jjcnt++;
                            if (p.jjcnt == p.jjtotal)
                                p.resolve();
                        })
                    };
                });
                if (p.jjtotal == 0)
                    p.resolve();
                return p;
            },
            timeout: function (ms) {
                var p = new KingoJS.Promise();
                if (!ms) ms = 10;
                setTimeout(function () { p.resolve(); }, ms);
                return p;
            }
        }),
        Template: defineClass(function (selector) {
            this.originNode = document.querySelector(selector);
        },
            {
                render: function (data) {
                    return KingoJS.Promise.timeout().then(function () {
                        var node = this.originNode.cloneNode(true);
                        //removeNamedItem("id") also remove class in ie
                        //if(node.attributes.getNamedItem("id")) node.attributes.removeNamedItem("id");
                        if (node.getAttribute("id")) node.removeAttribute("id");
                        KingoJS.Template.renderNode(node, data);
                        node.style["display"] = "block";
                        return node;
                    }.bind(this));
                }
            },
            {
                renderNode: function (node, data) {
                    if (node.getAttribute("data-win-bind")) {
                        node.getAttribute("data-win-bind").split(",").forEach(function (item) {
                            var kv = item.split(":");
                            node[kv[0]] = data[kv[1]];
                        });
                        node.removeAttribute("data-win-bind")
                    }
                    var len = node.children.length;
                    for (var i = 0; i < len; ++i) {
                        KingoJS.Template.renderNode(node.children[i], data);
                    }
                }
            }
        ),
        Page: {
            render: function (location, element, state, parented, isBack) {
                /// <param name="element" domElement="true" />
                try {
                    if (domDict[location]) {
                        var dom = domDict[location];
                        if (dom.flag == "loaded") {
                            var p = new KingoJS.Promise();
                            element.innerHTML = dom.dom;
                            element.control = pageDict[location];
                            p.resolve(element);
                            if (parented) {
                                parented.then(function () {
                                    pageDict[location].ready(element, state, isBack);
                                });
                            } else {
                                pageDict[location].ready(element, state, isBack);
                            }
                            return p;
                        } else {
                            return dom.promise.then(function () {
                                element.innerHTML = dom.dom;
                                element.control = pageDict[location];
                                if (parented) {
                                    parented.then(function () {
                                        pageDict[location].ready(element, state, isBack);
                                    });
                                } else {
                                    pageDict[location].ready(element, state, isBack);
                                }
                                return element;
                            });
                        }
                    }
                    domDict[location] = {};
                    domDict[location].flag = "loading";
                    domDict[location].promise = new KingoJS.Promise();
                    var remoteLocation = location;
                    if (location[0] == '/')
                        remoteLocation = location.substr(1);
                    return Helper.getFile(remoteLocation).then(function (res) {
                        var doc = document.implementation.createHTMLDocument("doc");
                        doc.documentElement.innerHTML = res;
                        //var m = /<head>([\s\S\n\r]*)<\/head>[\s\S\n\r]*<body>([\s\S\n\r]*)<\/body>/;
                        //var match = res.match(m);
                        //doc.head.innerHTML = match[1];
                        //doc.body.innerHTML = match[2];
                        var pj = [];
                        var scripts = doc.querySelectorAll("script");
                        var len = scripts.length;
                        for (var i = 0; i < len; ++i) {
                            if (scripts[i].attributes["src"]) {
                                var srcUrl = makeUrl(location, scripts[i].attributes["src"].value);
                                if (sriptDict[srcUrl] == undefined) {
                                    sriptDict[srcUrl] = 1;
                                    var copyNode = document.createElement("script");
                                    copyNode.src = srcUrl;
                                    copyNode.promise = new KingoJS.Promise();
                                    pj.push(copyNode.promise);
                                    copyNode.onload = function () {
                                        this.promise.resolve();
                                        this.onload = undefined;
                                        this.promise = undefined;
                                    }
                                    scripts[i].parentNode && scripts[i].parentNode.removeChild(scripts[i]);
                                    document.head.appendChild(copyNode);
                                }
                            } else {
                                var copyNode = document.createElement("script");
                                copyNode.innerHTML = scripts[i].innerHTML;
                                scripts[i].parentNode && scripts[i].parentNode.removeChild(scripts[i]);
                                window.document.head.appendChild(copyNode);
                            }
                        }
                        var css = doc.querySelectorAll("link[rel='stylesheet']");
                        var len = css.length;
                        for (var i = 0; i < len; ++i) {
                            var newCss = document.createElement("link");
                            newCss.rel = "stylesheet"
                            newCss.type = "text/css"
                            newCss.href = makeUrl(location, css[i].attributes["href"].value);
                            css[i].parentNode && css[i].parentNode.removeChild(css[i]);
                            window.document.head.appendChild(newCss);
                        }
                        var pres = KingoJS.Promise.join(pj);
                        return pres.then(function () {
                            domDict[location].dom = doc.body.innerHTML.trim();
                            domDict[location].flag = "loaded";
                            domDict[location].promise.resolve();
                            element.innerHTML = doc.body.innerHTML.trim();
                            element.control = pageDict[location];
                            if (parented) {
                                parented.then(function () {
                                    pageDict[location].ready(element, state, isBack);
                                });
                            } else {
                                pageDict[location].ready(element, state, isBack);
                            }
                            return element;
                        });
                    });
                } catch (e) {
                    KingoJS.log && KingoJS.log(e.message);
                }
            },
            define: function (location, object) {
                pageDict[location] = object;
            }
        },
        PageControlNavigator: function (element, options) {
            this._element = element;
            this.history = [];
            this.forwardState = [];
            this.clearFlag = false;
            KingoJS.log("bb" + Options.enableBack);
            if(Options.enableBack != "true"){
                window.onpopstate = function (e) {
                    KingoJS.log("pop");
                    if(e.state === null) return;
                    var preState = e.state;
                    this.navigate(preState.location, preState.state, true);
                }.bind(this);
            }
            this.replacePage = function (location, state, isBack) {
                this.clearHistory();
                this.navigate(location, state, isBack);
            }
            this.navigate = function (location, state, isBack) {
                var curState = {
                    location: location,
                    state: state
                }
                if (!isBack) {
                    this.forwardState = [];
                    if(Options.enableBack != "true"){
                        if(this.clearFlag){
                            window.history.replaceState(curState,"","");
                            this.clearFlag = false;
                        }
                        else window.history.pushState(curState,"","");
                    }
                }
                this.history.push(curState);
                var newElement = this._createPageElement();
                var parented = new KingoJS.Promise();
                KingoJS.Page.render(location, newElement, state, parented, isBack).then(function () {
                    var oldElement = this._element.firstElementChild;
                    if (oldElement.control && oldElement.control.unload) {
                        oldElement.control.unload();
                    }
                    this._element.removeChild(oldElement);
                    this._element.appendChild(newElement);
                    //oldElement.textContent = "";
                    parented.resolve();
                }.bind(this));
            }
            this.back = function () {
                KingoJS.log("back" + Options.enableBack);
                if(Options.enableBack != "true"){
                    history.back();
                    return;
                }
                var len = this.history.length;
                if (len >= 2) {
                    var curState = this.history.pop();
                    if (curState)
                        this.forwardState.push(curState);
                    var preState = this.history.pop();
                    this.navigate(preState.location, preState.state, true);
                }
            }
            this.forward = function () {
                if(Options.enableBack != "true"){
                    history.forward();
                    return;
                }
                var fState = this.forwardState.pop();
                if (fState) {
                    this.navigate(fState.location, fState.state, true);
                }
            }
            this.clearHistory = function () {
                this.history.pop();
                this.clearFlag = true;
            }
            this.canBack = function () {
                return this.history.length >= 2;
            }
            this._createPageElement = function () {
                var element = document.createElement("div"); element.style.width = "100%";
                element.style.height = "100%";
                return element;
            }
            this._element.appendChild(this._createPageElement())
        },
        Prefetch: function (forwardQueue, pageDict, totalPage, getPage, handle,firstPage) {
            var state = "stopped";
            if(firstPage === undefined) firstPage = 1;
            function work() {
                var prePage = forwardQueue.shift();
                while (prePage && (prePage > totalPage || prePage < firstPage))
                    prePage = forwardQueue.shift();
                if (!prePage) {
                    state = "stopped";
                    return;
                }
                if (pageDict[prePage]) {
                    KingoJS.Promise.timeout().then(function () {
                        handle(prePage, pageDict[prePage].data);
                        work();
                    });
                }
                else {
                    KingoJS.log("get:" + prePage);
                    getPage(prePage).then(function (res) {
                        if (state == "stopped") {
                            return;
                        }
                        pageDict[prePage] = {
                            state: "loaded",
                            data: res
                        };
                        handle(prePage, res);
                        work();
                    });
                }
            }


            this.start = function () {
                KingoJS.log("start:" + state);
                if (state == "prefetching")
                    return;
                state = "prefetching";
                work();
            }
            this.stop = function () {
                state = "stopped";
            }
        },
        EventHelper: {
            coordinates: [],
            HoldEvent: defineClass(function (element, handler) {
                this.element = element;
                this.handler = handler;
                element.addEventListener("mousedown", this, false);
                element.addEventListener("mouseup", this, false);
                element.addEventListener("touchstart", this, false);
                element.addEventListener("touchend", this, false);
            },
                {
                    handleEvent: function (e) {
                        switch (e.type) {
                            case 'mousedown': this.onMousedown(e); break;
                            case 'mouseup': this.onMouseup(e); break;
                            case 'touchstart': this.onTouchstart(e); break;
                            case 'touchend': this.onTouchend(e); break;
                        }
                    },
                    onMousedown: function (e) {
                        this.startX = e.clientX;
                        this.startY = e.clientY;
                        this.startT = new Date().valueOf();
                    },
                    onMouseup: function (e) {
                        var eX = e.clientX;
                        var eY = e.clientY;
                        var eT = new Date().valueOf();
                        if (this.startT && this.startX && this.startY && eT - this.startT > 500 && (eX - this.startX) * (eX - this.startX) + (eY - this.startY) * (eY - this.startY) < 20) {
                            KingoJS.EventHelper.preventClick(eX, eY);
                            this.handler(e);
                        }
                    },
                    onTouchstart: function (e){
                        this.startT = new Date().valueOf();
                        this.startX = e.touches[0].clientX;
                        this.startY = e.touches[0].clientY;
                    },
                    onTouchend: function (e){
                        var eT = new Date().valueOf();
                        var eX = e.changedTouches[0].clientX;
                        var eY = e.changedTouches[0].clientY;
                        if (this.startT && this.startX && this.startY && eT - this.startT > 500 && (eX - this.startX) * (eX - this.startX) + (eY - this.startY) * (eY - this.startY) < 20) {
                            e.preventDefault();
                            KingoJS.EventHelper.preventClick(eX, eY);
                            this.handler(e);
                        }
                    }
                }
            ),
            preventClick: function (x, y) {
                KingoJS.EventHelper.coordinates.push(x, y);
                window.setTimeout(KingoJS.EventHelper.pop, 2500);
            },
            pop: function () {
                KingoJS.EventHelper.coordinates.splice(0, 2);
            },
            onClick: function (event) {
                for (var i = 0; i < KingoJS.EventHelper.coordinates.length; i += 2) {
                    var x = KingoJS.EventHelper.coordinates[i];
                    var y = KingoJS.EventHelper.coordinates[i + 1];
                    if (Math.abs(event.clientX - x) < 25 && Math.abs(event.clientY - y) < 25) {
                        event.stopPropagation();
                        event.preventDefault();
                    }
                }
            }
        },
        UI: {
            Dialog: defineClass(function (element) {
                this.screen = document.createElement("div");
                this.screen.className = "popup-screen";
                this.screen.style.display = "none";
                this.dialog = element;
                element.parentNode.appendChild(this.screen);
                this.dialog.style.display = "none";
                this.screen.addEventListener("click", this.hide.bind(this), false);
            },
                {
                    show: function () {
                        var dialog = this.dialog;
                        dialog.style.display = "block";
                        var left = window.innerWidth / 2 - dialog.clientWidth / 2;
                        var top = window.innerHeight / 2 - dialog.clientHeight / 2;
                        left = parseInt(left);
                        top = parseInt(top);
                        dialog.style.left = left + "px";
                        dialog.style.top = top + "px";
                        this.screen.style.display = "block";
                    },
                    hide: function () {
                        this.dialog.style.display = "none";
                        this.screen.style.display = "none";
                    }
                })
        },
        File:{
            readAsDataURL: function(file){
                var fileLoader = new FileReader();
                var p = new KingoJS.Promise();
                fileLoader.onload = function() {
                    p.resolve(this.result);
                };
                fileLoader.onabort = function() {
                    p.error("abort");
                };
                fileLoader.onerror = function() {
                    p.error("error");
                };  
                fileLoader.readAsDataURL(file);
                return p;
            },
            dataURItoBlob: function(dataURI) {
                var binary = atob(dataURI.split(',')[1]);
                var array = [];
                for(var i = 0; i < binary.length; i++) {
                    array.push(binary.charCodeAt(i));
                }
                var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
                var uint8arr = new Uint8Array(array);
                try{
                    var blob = new Blob([uint8arr], {type: mimeString});
                    return blob;
                }catch(e){
                    //may need to test far more
                    // TypeError old chrome and FF
                    window.BlobBuilder = window.BlobBuilder || 
                                         window.WebKitBlobBuilder || 
                                         window.MozBlobBuilder || 
                                         window.MSBlobBuilder;
                    if(e.name == 'TypeError' && window.BlobBuilder){
                        var bb = new BlobBuilder();
                        bb.append([uint8arr.buffer]);
                        var blob = bb.getBlob(mimeString);
                        return blob;
                    }
                    else if(e.name == "InvalidStateError"){
                        // InvalidStateError (tested on FF13 WinXP)
                        var blob = new Blob( [uint8arr.buffer], {type : mimeString});
                        return blob;
                    }
                    else{
                        throw("No Construct");
                    }
                }
            }
        },
        Image:{
            resizeToBlob: function(file, max_width, max_height, imageEncoding,quality){
                return Image.resizeToDataURI(file, max_width, max_height, imageEncoding,quality).then(function(dataURI){
                    KingoJS.File.dataURItoBlob(dataURI);
                });
            },
            resizeToDataURI: function(file, max_width, max_height, imageEncoding,quality){
                if (file.type.match('image.*')) {
                    return KingoJS.File.readAsDataURL(file).then(function(result){
                        var p = new KingoJS.Promise();
                        var imageObj = new Image();
                        imageObj.onload = function() {  
                            if(this.width == 0 || this.height == 0){
                                p.error("Image is empty");
                            } else {                
                                var toWidth = this.width;
                                var toHeight = this.height;
                                if(toWidth>max_width){
                                    toHeight = toHeight*max_width/toWidth;
                                    toWidth = max_width;
                                }
                                if(toHeight>max_height){
                                    toWidth = toWidth*max_height/toHeight;
                                    toHeight = max_height;
                                }
                                var canvas = document.createElement('canvas');
                                canvas.width = toWidth;
                                canvas.height = toHeight;
                                //canvas.style.visibility   = "hidden";   
                                //canvas.style.position   = "absolute";   
                                //document.body.appendChild(canvas);  
                                var context = canvas.getContext('2d');  
                                context.clearRect(0,0,toWidth,toHeight);
                                context.drawImage(imageObj, 0, 0, this.width, this.height, 0, 0, toWidth, toHeight);
                                //var blob = dataURItoBlob(canvas.toDataURL(imageEncoding,quality));
                                var blob = canvas.toDataURL(imageEncoding,quality);
                                //document.body.removeChild(canvas);  
                                p.resolve(blob);
                            }       
                        }
                        imageObj.onabort = function() {
                            p.error("Image loading abort");
                        };

                        imageObj.onerror = function() {
                            p.error("Image loading error");
                        };
                        imageObj.src = result;
                        return p;
                    });
                } else {
                    var p = new KingoJS.Promise();
                    p.error("Not image!");
                    return p;
                }
            }
        }
    }

    window.document.addEventListener("click", KingoJS.EventHelper.onClick, true);
    window.document.addEventListener("DOMContentLoaded", function () {
        var scripts = window.document.querySelectorAll("script");
        var len = scripts.length;
        for (var i = 0; i < len; ++i) {
            if (scripts[i].src) {
                sriptDict[scripts[i].src] = 1;
            }
        }
    }, false);
})(window);
