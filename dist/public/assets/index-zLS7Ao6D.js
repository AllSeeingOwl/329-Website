(function () {
  let e = document.createElement(`link`).relList;
  if (e && e.supports && e.supports(`modulepreload`)) return;
  for (let e of document.querySelectorAll(`link[rel="modulepreload"]`)) n(e);
  new MutationObserver((e) => {
    for (let t of e)
      if (t.type === `childList`)
        for (let e of t.addedNodes) e.tagName === `LINK` && e.rel === `modulepreload` && n(e);
  }).observe(document, { childList: !0, subtree: !0 });
  function t(e) {
    let t = {};
    return (
      e.integrity && (t.integrity = e.integrity),
      e.referrerPolicy && (t.referrerPolicy = e.referrerPolicy),
      e.crossOrigin === `use-credentials`
        ? (t.credentials = `include`)
        : e.crossOrigin === `anonymous`
          ? (t.credentials = `omit`)
          : (t.credentials = `same-origin`),
      t
    );
  }
  function n(e) {
    if (e.ep) return;
    e.ep = !0;
    let n = t(e);
    fetch(e.href, n);
  }
})();
var e = () => {
    window.va ||
      (window.va = function (...e) {
        (window.vaq || (window.vaq = []), window.vaq.push(e));
      });
  },
  t = `@vercel/analytics`,
  n = `2.0.1`;
function r() {
  return typeof window < `u`;
}
function i() {
  return `production`;
}
function a(e = `auto`) {
  if (e === `auto`) {
    window.vam = i();
    return;
  }
  window.vam = e;
}
function o() {
  return (r() ? window.vam : i()) || `production`;
}
function s() {
  return o() === `development`;
}
function c(e) {
  return e.scriptSrc
    ? u(e.scriptSrc)
    : s()
      ? `https://va.vercel-scripts.com/v1/script.debug.js`
      : e.basePath
        ? u(`${e.basePath}/insights/script.js`)
        : `/_vercel/insights/script.js`;
}
function l(e, r) {
  let i = e;
  if (r)
    try {
      i = { ...JSON.parse(r)?.analytics, ...e };
    } catch {}
  a(i.mode);
  let o = { sdkn: t + (i.framework ? `/${i.framework}` : ``), sdkv: n };
  return (
    i.disableAutoTrack && (o.disableAutoTrack = `1`),
    i.viewEndpoint && (o.viewEndpoint = u(i.viewEndpoint)),
    i.eventEndpoint && (o.eventEndpoint = u(i.eventEndpoint)),
    i.sessionEndpoint && (o.sessionEndpoint = u(i.sessionEndpoint)),
    s() && i.debug === !1 && (o.debug = `false`),
    i.dsn && (o.dsn = i.dsn),
    i.endpoint
      ? (o.endpoint = i.endpoint)
      : i.basePath && (o.endpoint = u(`${i.basePath}/insights`)),
    { beforeSend: i.beforeSend, src: c(i), dataset: o }
  );
}
function u(e) {
  return e.startsWith(`http://`) || e.startsWith(`https://`) || e.startsWith(`/`) ? e : `/${e}`;
}
function d(t = { debug: !0 }, n) {
  var i;
  if (!r()) return;
  let { beforeSend: a, src: o, dataset: c } = l(t, n);
  if (
    (e(),
    a && ((i = window.va) == null || i.call(window, `beforeSend`, a)),
    document.head.querySelector(`script[src*="${o}"]`))
  )
    return;
  let u = document.createElement(`script`);
  u.src = o;
  for (let [e, t] of Object.entries(c)) u.dataset[e] = t;
  ((u.defer = !0),
    (u.onerror = () => {
      let e = s()
        ? `Please check if any ad blockers are enabled and try again.`
        : `Be sure to enable Web Analytics for your project and deploy again. See https://vercel.com/docs/analytics/quickstart for more information.`;
      console.log(`[Vercel Web Analytics] Failed to load script from ${o}. ${e}`);
    }),
    document.head.appendChild(u));
}
var f = () => {
    window.si ||
      (window.si = function (...e) {
        ((window.siq = window.siq || []), window.siq.push(e));
      });
  },
  p = `@vercel/speed-insights`,
  m = `2.0.0`;
function h() {
  return typeof window < `u`;
}
function g() {
  return `production`;
}
function _() {
  return g() === `development`;
}
function v(e) {
  return e.scriptSrc
    ? b(e.scriptSrc)
    : _()
      ? `https://va.vercel-scripts.com/v1/speed-insights/script.debug.js`
      : e.dsn
        ? `https://va.vercel-scripts.com/v1/speed-insights/script.js`
        : e.basePath
          ? b(`${e.basePath}/speed-insights/script.js`)
          : `/_vercel/speed-insights/script.js`;
}
function y(e, t) {
  let n = e;
  if (t)
    try {
      n = { ...JSON.parse(t)?.speedInsights, ...e };
    } catch {}
  let r = { sdkn: p + (n.framework ? `/${n.framework}` : ``), sdkv: m };
  return (
    n.sampleRate && (r.sampleRate = n.sampleRate.toString()),
    n.route && (r.route = n.route),
    _() && n.debug === !1 && (r.debug = `false`),
    n.dsn && (r.dsn = n.dsn),
    n.endpoint
      ? (r.endpoint = b(n.endpoint))
      : n.basePath && (r.endpoint = b(`${n.basePath}/speed-insights/vitals`)),
    { src: v(n), beforeSend: n.beforeSend, dataset: r }
  );
}
function b(e) {
  return e.startsWith(`http://`) || e.startsWith(`https://`) || e.startsWith(`/`) ? e : `/${e}`;
}
function x(e = {}, t) {
  var n;
  if (!h() || e.route === null) return null;
  f();
  let { beforeSend: r, src: i, dataset: a } = y(e, t);
  if (document.head.querySelector(`script[src*="${i}"]`)) return null;
  r && ((n = window.si) == null || n.call(window, `beforeSend`, r));
  let o = document.createElement(`script`);
  ((o.src = i), (o.defer = !0));
  for (let [e, t] of Object.entries(a)) o.dataset[e] = t;
  return (
    (o.onerror = () => {
      console.log(
        `[Vercel Speed Insights] Failed to load script from ${i}. Please check if any content blockers are enabled and try again.`
      );
    }),
    document.head.appendChild(o),
    {
      setRoute: (e) => {
        o.dataset.route = e ?? void 0;
      },
    }
  );
}
(d(),
  x(),
  `serviceWorker` in navigator &&
    window.addEventListener(`load`, () => {
      navigator.serviceWorker.register(`/sw.js`).then(
        () => {},
        (e) => {
          console.error(`ServiceWorker registration failed: `, e);
        }
      );
    }));
