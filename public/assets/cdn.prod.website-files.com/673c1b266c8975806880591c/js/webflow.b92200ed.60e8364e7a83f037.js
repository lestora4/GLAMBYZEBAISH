(() => {
    var t = {
            69078: function(t, e, r) {
                "use strict";
                var n = r(43949),
                    a = r(65134);
                n.define("tabs", t.exports = function(t) {
                    var e, r, i = {},
                        o = t.tram,
                        u = t(document),
                        c = n.env,
                        s = c.safari,
                        l = c(),
                        f = "data-w-tab",
                        d = ".w-tabs",
                        p = "w--current",
                        b = "w--tab-active",
                        h = a.triggers,
                        v = !1;

                    function g() {
                        if (r = l && n.env("design"), !!(e = u.find(d)).length) e.each(y), n.env("preview") && !v && e.each(m), w(),
                            function() {
                                n.redraw.on(i.redraw)
                            }()
                    }

                    function w() {
                        n.redraw.off(i.redraw)
                    }
                    i.ready = i.design = i.preview = g, i.redraw = function() {
                        v = !0, g(), v = !1
                    }, i.destroy = function() {
                        if (!!(e = u.find(d)).length) e.each(m), w()
                    };

                    function m(e, r) {
                        var n = t.data(r, d);
                        if (!!n) n.links && n.links.each(h.reset), n.panes && n.panes.each(h.reset)
                    }

                    function y(e, n) {
                        var a = d.substr(1) + "-" + e,
                            i = t(n),
                            o = t.data(n, d);
                        if (!o && (o = t.data(n, d, {
                                el: i,
                                config: {}
                            })), o.current = null, o.tabIdentifier = a + "-" + f, o.paneIdentifier = a + "-data-w-pane", o.menu = i.children(".w-tab-menu"), o.links = o.menu.children(".w-tab-link"), o.content = i.children(".w-tab-content"), o.panes = o.content.children(".w-tab-pane"), o.el.off(d), o.links.off(d), o.menu.attr("role", "tablist"), o.links.attr("tabindex", "-1"), function(t) {
                                var e = {};
                                e.easing = t.el.attr("data-easing") || "ease";
                                var r = parseInt(t.el.attr("data-duration-in"), 10);
                                r = e.intro = r == r ? r : 0;
                                var n = parseInt(t.el.attr("data-duration-out"), 10);
                                n = e.outro = n == n ? n : 0, e.immediate = !r && !n, t.config = e
                            }(o), !r) {
                            o.links.on("click" + d, function(t) {
                                return function(e) {
                                    e.preventDefault();
                                    var r = e.currentTarget.getAttribute(f);
                                    r && k(t, {
                                        tab: r
                                    })
                                }
                            }(o)), o.links.on("keydown" + d, function(t) {
                                return function(e) {
                                    var r, n, a = (n = (r = t).current, Array.prototype.findIndex.call(r.links, t => t.getAttribute(f) === n, null)),
                                        i = e.key,
                                        o = {
                                            ArrowLeft: a - 1,
                                            ArrowUp: a - 1,
                                            ArrowRight: a + 1,
                                            ArrowDown: a + 1,
                                            End: t.links.length - 1,
                                            Home: 0
                                        };
                                    if (i in o) {
                                        e.preventDefault();
                                        var u = o[i]; - 1 === u && (u = t.links.length - 1), u === t.links.length && (u = 0);
                                        var c = t.links[u].getAttribute(f);
                                        c && k(t, {
                                            tab: c
                                        })
                                    }
                                }
                            }(o));
                            var u = o.links.filter("." + p).attr(f);
                            u && k(o, {
                                tab: u,
                                immediate: !0
                            })
                        }
                    }

                    function k(e, r) {
                        r = r || {};
                        var a, i = e.config,
                            u = i.easing,
                            c = r.tab;
                        if (c !== e.current) {
                            e.current = c, e.links.each(function(n, o) {
                                var u = t(o);
                                if (r.immediate || i.immediate) {
                                    var s = e.panes[n];
                                    !o.id && (o.id = e.tabIdentifier + "-" + n), !s.id && (s.id = e.paneIdentifier + "-" + n), o.href = "#" + s.id, o.setAttribute("role", "tab"), o.setAttribute("aria-controls", s.id), o.setAttribute("aria-selected", "false"), s.setAttribute("role", "tabpanel"), s.setAttribute("aria-labelledby", o.id)
                                }
                                o.getAttribute(f) === c ? (a = o, u.addClass(p).removeAttr("tabindex").attr({
                                    "aria-selected": "true"
                                }).each(h.intro)) : u.hasClass(p) && u.removeClass(p).attr({
                                    tabindex: "-1",
                                    "aria-selected": "false"
                                }).each(h.outro)
                            });
                            var l = [],
                                d = [];
                            e.panes.each(function(e, r) {
                                var n = t(r);
                                r.getAttribute(f) === c ? l.push(r) : n.hasClass(b) && d.push(r)
                            });
                            var g = t(l),
                                w = t(d);
                            if (r.immediate || i.immediate) {
                                g.addClass(b).each(h.intro), w.removeClass(b), !v && n.redraw.up();
                                return
                            }
                            var m = window.scrollX,
                                y = window.scrollY;
                            a.focus(), window.scrollTo(m, y);
                            w.length && i.outro ? (w.each(h.outro), o(w).add("opacity " + i.outro + "ms " + u, {
                                fallback: s
                            }).start({
                                opacity: 0
                            }).then(() => O(i, w, g))) : O(i, w, g)
                        }
                    }

                    function O(t, e, r) {
                        if (e.removeClass(b).css({
                                opacity: "",
                                transition: "",
                                transform: "",
                                width: "",
                                height: ""
                            }), r.addClass(b).each(h.intro), n.redraw.up(), !t.intro) return o(r).set({
                            opacity: 1
                        });
                        o(r).set({
                            opacity: 0
                        }).redraw().add("opacity " + t.intro + "ms " + t.easing, {
                            fallback: s
                        }).start({
                            opacity: 1
                        })
                    }
                    return i
                })
            },
            45222: function(t, e, r) {
                r(9461), r(27624), r(30286), r(8334), r(12338), r(93695), r(60322), r(40941), r(65134), r(27527), r(41655), r(64054), r(69078), r(79858), r(67103)
            }
        },
        e = {};

    function r(n) {
        var a = e[n];
        if (void 0 !== a) return a.exports;
        var i = e[n] = {
            id: n,
            loaded: !1,
            exports: {}
        };
        return t[n].call(i.exports, i, i.exports, r), i.loaded = !0, i.exports
    }
    r.m = t, (() => {
        var t, e = Object.getPrototypeOf ? function(t) {
            return Object.getPrototypeOf(t)
        } : function(t) {
            return t.__proto__
        };
        r.t = function(n, a) {
            if (1 & a && (n = this(n)), 8 & a || "object" == typeof n && n && (4 & a && n.__esModule || 16 & a && "function" == typeof n.then)) return n;
            var i = Object.create(null);
            r.r(i);
            var o = {};
            t = t || [null, e({}), e([]), e(e)];
            for (var u = 2 & a && n;
                "object" == typeof u && !~t.indexOf(u); u = e(u)) Object.getOwnPropertyNames(u).forEach(function(t) {
                o[t] = function() {
                    return n[t]
                }
            });
            return o.default = function() {
                return n
            }, r.d(i, o), i
        }
    })(), r.d = function(t, e) {
        for (var n in e) r.o(e, n) && !r.o(t, n) && Object.defineProperty(t, n, {
            enumerable: !0,
            get: e[n]
        })
    }, r.hmd = function(t) {
        return !(t = Object.create(t)).children && (t.children = []), Object.defineProperty(t, "exports", {
            enumerable: !0,
            set: function() {
                throw Error("ES Modules may not assign module.exports or exports.*, Use ESM export syntax, instead: " + t.id)
            }
        }), t
    }, r.g = function() {
        if ("object" == typeof globalThis) return globalThis;
        try {
            return this || Function("return this")()
        } catch (t) {
            if ("object" == typeof window) return window
        }
    }(), r.o = function(t, e) {
        return Object.prototype.hasOwnProperty.call(t, e)
    }, r.r = function(t) {
        "undefined" != typeof Symbol && Symbol.toStringTag && Object.defineProperty(t, Symbol.toStringTag, {
            value: "Module"
        }), Object.defineProperty(t, "__esModule", {
            value: !0
        })
    }, r.nmd = function(t) {
        return t.paths = [], !t.children && (t.children = []), t
    }, (() => {
        var t = [];
        r.O = function(e, n, a, i) {
            if (n) {
                i = i || 0;
                for (var o = t.length; o > 0 && t[o - 1][2] > i; o--) t[o] = t[o - 1];
                t[o] = [n, a, i];
                return
            }
            for (var u = 1 / 0, o = 0; o < t.length; o++) {
                for (var n = t[o][0], a = t[o][1], i = t[o][2], c = !0, s = 0; s < n.length; s++)(!1 & i || u >= i) && Object.keys(r.O).every(function(t) {
                    return r.O[t](n[s])
                }) ? n.splice(s--, 1) : (c = !1, i < u && (u = i));
                if (c) {
                    t.splice(o--, 1);
                    var l = a();
                    void 0 !== l && (e = l)
                }
            }
            return e
        }
    })(), r.rv = function() {
        return "1.1.8"
    }, (() => {
        var t = {
            483: 0
        };
        r.O.j = function(e) {
            return 0 === t[e]
        };
        var e = function(e, n) {
                var a = n[0],
                    i = n[1],
                    o = n[2],
                    u, c, s = 0;
                if (a.some(function(e) {
                        return 0 !== t[e]
                    })) {
                    for (u in i) r.o(i, u) && (r.m[u] = i[u]);
                    if (o) var l = o(r)
                }
                for (e && e(n); s < a.length; s++) c = a[s], r.o(t, c) && t[c] && t[c][0](), t[c] = 0;
                return r.O(l)
            },
            n = self.webpackChunk = self.webpackChunk || [];
        n.forEach(e.bind(null, 0)), n.push = e.bind(null, n.push.bind(n))
    })(), r.ruid = "bundler=rspack@1.1.8";
    var n = r.O(void 0, ["219", "181", "14"], function() {
        return r("45222")
    });
    n = r.O(n)
})();