/* @ds-bundle: {"format":4,"namespace":"TwoLeaf","components":[{"name":"Button"},{"name":"Badge"},{"name":"IdTag"},{"name":"Card"},{"name":"StatCard"},{"name":"QualityMeter"},{"name":"TextField"},{"name":"Alert"},{"name":"DataTable"},{"name":"ThemeToggle"},{"name":"Sidebar"},{"name":"PoweredBy"},{"name":"Footer"},{"name":"Icon"}]} */
(function () {
  var React = window.React;
  var h = React.createElement;
  function cx() { return Array.prototype.slice.call(arguments).filter(Boolean).join(" "); }
  function omit(o, keys) { var r = {}; for (var k in o) if (keys.indexOf(k) < 0) r[k] = o[k]; return r; }

  /* Icon: stroke icons drawn on a 24px grid. */
  var PATHS = {
    home: ["M3 10.5 12 3l9 7.5", "M5 9.5V21h14V9.5"],
    leaf: ["M12 21v-8", "M12 13c-5 0-8-3-8-8 5 0 8 3 8 8z", "M12 13c5 0 8-3 8-8-5 0-8 3-8 8z"],
    scale: ["M4 20h16", "M6 20l2-12h8l2 12", "M10 8V5a2 2 0 0 1 4 0v3"],
    users: ["M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M2 21a7 7 0 0 1 14 0", "M16 3.5a4 4 0 0 1 0 7", "M22 21a7 7 0 0 0-4-6.3"],
    chart: ["M4 20V10", "M10 20V4", "M16 20v-7", "M22 20H2"],
    file: ["M14 3H6v18h12V7z", "M14 3v4h4", "M9 13h6", "M9 17h6"],
    alert: ["M12 3 2 20h20z", "M12 10v4", "M12 17h.01"],
    check: ["M4 12l5 5L20 6"],
    info: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M12 11v6", "M12 7h.01"],
    settings: ["M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"],
    sun: ["M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z", "M12 1v2", "M12 21v2", "M4.2 4.2l1.4 1.4", "M18.4 18.4l1.4 1.4", "M1 12h2", "M21 12h2", "M4.2 19.8l1.4-1.4", "M18.4 5.6l1.4-1.4"],
    moon: ["M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"],
    copy: ["M9 9h11v11H9z", "M5 15H4V4h11v1"],
    map: ["M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z", "M12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"],
    logout: ["M9 21H4V3h5", "M16 17l5-5-5-5", "M21 12H9"]
  };
  function Icon(p) {
    var d = PATHS[p.name] || PATHS.leaf;
    return h("svg", { className: cx("tl-icon", p.className), viewBox: "0 0 24 24", "aria-hidden": p.label ? undefined : "true", role: p.label ? "img" : undefined, "aria-label": p.label, style: p.size ? { width: p.size, height: p.size } : undefined },
      d.map(function (x, i) { return h("path", { key: i, d: x }); }));
  }

  function Button(p) {
    var variant = p.variant || "primary";
    var rest = omit(p, ["variant", "size", "icon", "fullWidth", "className", "children", "href"]);
    var cls = cx("tl-btn", "tl-btn-" + variant, p.size === "sm" && "tl-btn-sm", p.fullWidth && "tl-btn-full", p.className);
    var kids = [p.icon ? h(Icon, { key: "i", name: p.icon }) : null, h("span", { key: "t" }, p.children)];
    if (p.href) return h("a", Object.assign({ className: cls, href: p.href }, rest), kids);
    return h("button", Object.assign({ type: "button", className: cls }, rest), kids);
  }

  function Badge(p) {
    return h("span", { className: cx("tl-badge", "tl-badge-" + (p.tone || "neutral"), p.className) }, p.children);
  }

  function IdTag(p) {
    var st = React.useState(false), copied = st[0], setCopied = st[1];
    function copy() {
      try { navigator.clipboard.writeText(p.value); } catch (e) {}
      setCopied(true); setTimeout(function () { setCopied(false); }, 1200);
    }
    return h("span", { className: cx("tl-id", p.className) },
      h("span", null, p.value),
      p.copyable === false ? null : h("button", { type: "button", onClick: copy, "aria-label": copied ? "Copied" : "Copy " + p.value, title: copied ? "Copied" : "Copy" }, h(Icon, { name: copied ? "check" : "copy" })));
  }

  function Card(p) {
    return h("section", { className: cx("tl-card", p.className), style: p.style },
      p.title || p.action ? h("div", { className: "tl-card-head" },
        h("div", null, p.title ? h("h3", { className: "tl-card-title" }, p.title) : null, p.subtitle ? h("p", { className: "tl-card-sub" }, p.subtitle) : null),
        p.action || null) : null,
      p.children);
  }

  function StatCard(p) {
    var dir = p.delta == null ? null : (p.delta >= 0 ? "up" : "down");
    return h(Card, { className: cx("tl-stat", p.className) },
      h("span", { className: "tl-stat-label" }, p.label),
      h("span", { className: "tl-stat-value" }, p.value, p.unit ? h("span", { className: "tl-stat-unit" }, p.unit) : null),
      dir ? h("span", { className: "tl-stat-delta" }, h("b", { className: dir === "up" ? "tl-up" : "tl-down" }, (p.delta >= 0 ? "▲ +" : "▼ ") + p.delta + "%"), " ", p.deltaLabel || "vs last month") : null);
  }

  function QualityMeter(p) {
    var value = Math.max(0, Math.min(100, p.value || 0));
    var target = p.target == null ? 60 : p.target;
    var below = value < target;
    return h("div", { className: cx("tl-meter", p.className) },
      h("div", { className: "tl-meter-top" }, h("span", null, p.label || "Fine leaf"), h("strong", null, value + "%")),
      h("div", { className: "tl-meter-track", role: "meter", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": value, "aria-label": (p.label || "Fine leaf") + " " + value + "%, target " + target + "%" },
        h("div", { className: cx("tl-meter-fill", below && "tl-below"), style: { width: value + "%" } }),
        h("div", { className: "tl-meter-target", style: { left: "calc(" + target + "% - 1px)" } })),
      h("span", { className: "tl-meter-foot" }, below ? (target - value) + " points below the " + target + "% target" : "Meets the " + target + "% target"));
  }

  var fid = 0;
  function TextField(p) {
    var idRef = React.useRef(null);
    if (!idRef.current) idRef.current = p.id || "tl-f-" + (++fid);
    var id = idRef.current, hintId = id + "-hint";
    var rest = omit(p, ["label", "hint", "error", "className", "id"]);
    return h("div", { className: cx("tl-field", p.error && "tl-field-error", p.className) },
      h("label", { htmlFor: id }, p.label),
      h("input", Object.assign({ id: id, "aria-invalid": p.error ? "true" : undefined, "aria-describedby": p.error || p.hint ? hintId : undefined }, rest)),
      p.error || p.hint ? h("span", { id: hintId, className: "tl-field-hint" }, p.error || p.hint) : null);
  }

  var ALERT_ICON = { success: "check", warning: "alert", danger: "alert", info: "info" };
  function Alert(p) {
    var tone = p.tone || "info";
    return h("div", { className: cx("tl-alert", "tl-alert-" + tone, p.className), role: tone === "danger" ? "alert" : "status" },
      h(Icon, { name: ALERT_ICON[tone] }),
      h("div", null, p.title ? h("strong", null, p.title) : null, p.children));
  }

  function DataTable(p) {
    var cols = p.columns || [];
    return h("div", { className: "tl-table-wrap" },
      h("table", { className: "tl-table" },
        p.caption ? h("caption", { style: { textAlign: "left", padding: "12px 16px", fontWeight: 600 } }, p.caption) : null,
        h("thead", null, h("tr", null, cols.map(function (c) { return h("th", { key: c.key, scope: "col", className: c.align === "right" ? "tl-right" : undefined }, c.label); }))),
        h("tbody", null, (p.rows || []).map(function (r, i) {
          return h("tr", { key: r.id || i }, cols.map(function (c) {
            return h("td", { key: c.key, className: c.align === "right" ? "tl-right" : undefined }, c.render ? c.render(r) : r[c.key]);
          }));
        }))));
  }

  function ThemeToggle(p) {
    var root = document.documentElement;
    var st = React.useState(p.value || root.getAttribute("data-theme") || "light"), theme = st[0], setTheme = st[1];
    function pick(t) {
      setTheme(t);
      root.setAttribute("data-theme", t);
      try { localStorage.setItem("twoleaf-theme", t); } catch (e) {}
      if (p.onChange) p.onChange(t);
    }
    return h("div", { className: cx("tl-toggle", p.className), role: "group", "aria-label": "Colour theme" },
      ["light", "dark"].map(function (t) {
        return h("button", { key: t, type: "button", "aria-pressed": theme === t ? "true" : "false", onClick: function () { pick(t); } },
          h(Icon, { name: t === "light" ? "sun" : "moon" }), t === "light" ? "Light" : "Dark");
      }));
  }

  var mid = 0;
  var RAIN = [[28,70],[46,98],[22,128],[40,156],[60,124],[150,118],[168,92],[176,146],[156,164],[186,120],[74,150],[132,150],[96,170],[118,176],[58,182],[142,184]];
  var RAINC = ["#7FA8FF", "#5FE3FF", "#A99CFF"];
  function MariakaniMark(p) {
    var idRef = React.useRef(null);
    if (!idRef.current) idRef.current = "mk" + (++mid);
    var u = idRef.current, s = p.size || 20;
    return h("svg", { width: s, height: s, viewBox: "0 0 200 200", "aria-hidden": "true" },
      h("defs", null,
        h("linearGradient", { id: u + "s", x1: 0, y1: 0, x2: 0, y2: 1 }, h("stop", { offset: 0, stopColor: "#1A2766" }), h("stop", { offset: 1, stopColor: "#0A1035" })),
        h("linearGradient", { id: u + "b", x1: 0, y1: 0, x2: 0, y2: 1 }, h("stop", { offset: 0, stopColor: "#EAF4FF" }), h("stop", { offset: 0.55, stopColor: "#5FE3FF" }), h("stop", { offset: 1, stopColor: "#A99CFF" })),
        h("clipPath", { id: u + "c" }, h("rect", { width: 200, height: 200, rx: 56 }))),
      h("g", { clipPath: "url(#" + u + "c)" },
        h("rect", { width: 200, height: 200, fill: "url(#" + u + "s)" }),
        h("g", { strokeWidth: 3, strokeLinecap: "round", opacity: 0.55 }, RAIN.map(function (r, i) { return h("line", { key: i, x1: r[0], y1: r[1], x2: r[0] - 8, y2: r[1] + 18, stroke: RAINC[i % 3] }); })),
        h("path", { fill: "url(#" + u + "b)", transform: "translate(28,30) scale(0.72)", d: "M118 34 L70 104 L98 104 L82 166 L138 92 L108 92 Z" }),
        h("g", { fill: "#2D3C8E" }, h("circle", { cx: 72, cy: 52, r: 22 }), h("circle", { cx: 100, cy: 38, r: 28 }), h("circle", { cx: 130, cy: 52, r: 22 }), h("rect", { x: 50, y: 50, width: 102, height: 24, rx: 12 }))));
  }

  function PoweredBy(p) {
    return h("a", { className: cx("tl-powered", p.className), href: p.href || "#", target: p.href ? "_blank" : undefined, rel: p.href ? "noopener" : undefined },
      h("span", null, "Powered by"), h(MariakaniMark, { size: 20 }), h("b", null, "Mariakani Labs"));
  }

  function Footer(p) {
    return h("footer", { className: cx("tl-footer", p.className) },
      h("nav", { "aria-label": "Footer" }, (p.links || []).map(function (l) { return h("a", { key: l.label, href: l.href || "#" }, l.label); })),
      h(PoweredBy, { href: p.poweredByHref }));
  }

  function initials(name) {
    return (name || "").split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0].toUpperCase(); }).join("");
  }
  function Sidebar(p) {
    return h("aside", { className: cx("tl-sidebar", p.className), "aria-label": "Main navigation" },
      h("div", { className: "tl-sb-brand" },
        p.logoUrl ? h("img", { className: "tl-sb-logo", src: p.logoUrl, alt: p.orgName + " logo" }) : h("span", { className: "tl-sb-initials", "aria-hidden": "true" }, initials(p.orgName)),
        h("div", null, h("div", { className: "tl-sb-name" }, p.orgName), p.orgSubtitle ? h("div", { className: "tl-sb-sub" }, p.orgSubtitle) : null)),
      (p.groups || []).map(function (g) {
        return h("div", { key: g.label || "g" },
          g.label ? h("div", { className: "tl-sb-group" }, g.label) : null,
          h("nav", { className: "tl-sb-nav" }, g.items.map(function (it) {
            return h("a", { key: it.label, className: "tl-sb-item", href: it.href || "#", "aria-current": it.active ? "page" : undefined },
              h(Icon, { name: it.icon || "leaf" }), h("span", null, it.label),
              it.count ? h("span", { className: "tl-sb-count", "aria-label": it.count + " open" }, it.count) : null);
          })));
      }),
      h("div", { className: "tl-sb-bottom" }, p.footer || null, h(PoweredBy, { href: p.poweredByHref })));
  }

  var api = { Icon: Icon, Button: Button, Badge: Badge, IdTag: IdTag, Card: Card, StatCard: StatCard, QualityMeter: QualityMeter, TextField: TextField, Alert: Alert, DataTable: DataTable, ThemeToggle: ThemeToggle, Sidebar: Sidebar, PoweredBy: PoweredBy, Footer: Footer, MariakaniMark: MariakaniMark };
  window.TwoLeaf = Object.assign(window.TwoLeaf || {}, api);
})();
