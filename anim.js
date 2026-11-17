// Animações dos gráficos do SISTID.
//  - linha / crescimento : os pontos sobem da base (zero) até o valor correto
//  - rosca (donut)       : gira e desacelera até parar na posição correta
//  - radar (dimensão)    : começa pequeno no centro e expande até o tamanho correto
// As barras horizontais e de progresso usam CSS (ver style.css).
// Uso: window.animarGrafico(svg) — chamado ao abrir a página e a cada vez que um gráfico é redesenhado.
(function () {
  var BASE = 160; // y do eixo zero nos gráficos de linha

  function suave(t) { return 1 - Math.pow(1 - t, 3); }          // easeOutCubic
  function freio(t) { return 1 - Math.pow(1 - t, 4); }          // easeOutQuart: desacelera até parar

  function rodar(svg, dur, passo, soPreparar) {
    if (svg._anim) cancelAnimationFrame(svg._anim);
    var ini = null;
    function quadro(agora) {
      if (ini === null) ini = agora;
      var t = Math.min((agora - ini) / dur, 1);
      passo(t);
      svg._anim = t < 1 ? requestAnimationFrame(quadro) : null;
    }
    passo(0);
    if (soPreparar) return;
    svg._anim = requestAnimationFrame(quadro);
  }

  function linha(svg, pre) {
    var pls = [].map.call(svg.querySelectorAll("polyline"), function (p) {
      // guarda os valores reais na 1ª leitura (uma 2ª chamada não pode partir dos pontos já zerados)
      if (!p._pts) p._pts = p.getAttribute("points").trim().split(/\s+/).map(function (s) { var c = s.split(","); return [+c[0], +c[1]]; });
      return { el: p, pts: p._pts };
    });
    var cs = [].map.call(svg.querySelectorAll("circle"), function (c) { if (c._y === undefined) c._y = +c.getAttribute("cy"); return { el: c, y: c._y }; });
    var ms = [].map.call(svg.querySelectorAll("path[stroke-dasharray]"), function (p) {
      var m = /^M\s*[\d.]+\s+([\d.]+)/.exec(p.getAttribute("d") || ""); return m ? { el: p, y: +m[1] } : null;
    }).filter(Boolean);
    function passo(t) {
      var e = suave(t);
      pls.forEach(function (o) { o.el.setAttribute("points", o.pts.map(function (p) { return p[0] + "," + (BASE + (p[1] - BASE) * e).toFixed(1); }).join(" ")); });
      cs.forEach(function (o) { o.el.setAttribute("cy", (BASE + (o.y - BASE) * e).toFixed(1)); });
      ms.forEach(function (o) { o.el.setAttribute("transform", "translate(0 " + ((BASE - o.y) * (1 - e)).toFixed(1) + ")"); });
    }
    rodar(svg, 1100, passo, pre);
  }

  function rosca(svg, pre) {
    var g = svg.querySelector("[data-rosca]"); if (!g) return;
    var cx = g.getAttribute("data-cx") || 60, cy = g.getAttribute("data-cy") || 60;
    var fim = -90, voltas = 2; // gira 2 voltas e para em -90° (posição original: começa no topo)
    rodar(svg, 1800, function (t) {
      g.setAttribute("transform", "rotate(" + (fim - 360 * voltas * (1 - freio(t))).toFixed(2) + " " + cx + " " + cy + ")");
      g.style.opacity = Math.min(t * 5, 1);
    }, pre);
  }

  function radar(svg, pre) {
    var el = svg.querySelector("[data-radar]"); if (!el) return;
    var cx = +el.getAttribute("data-cx"), cy = +el.getAttribute("data-cy");
    rodar(svg, 1200, function (t) {
      var s = Math.max(suave(t), 0.001);
      el.setAttribute("transform", "translate(" + cx + " " + cy + ") scale(" + s.toFixed(4) + ") translate(" + (-cx) + " " + (-cy) + ")");
    }, pre);
  }

  // pre = true: só deixa o gráfico no estado inicial (zerado), sem iniciar a animação
  window.animarGrafico = function (svg, pre) {
    if (!svg) return;
    if (svg.querySelector("[data-rosca]")) rosca(svg, pre);
    else if (svg.querySelector("[data-radar]")) radar(svg, pre);
    else linha(svg, pre);
  };

  // Páginas com gráficos fixos no HTML: anima ao entrar na página (e quando o card aparece na tela)
  function iniciar() {
    var alvos = document.querySelectorAll("svg[data-anim]");
    if (!alvos.length) return;
    var io = "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); window.animarGrafico(e.target); } });
    }, { threshold: 0.35 }) : null;
    [].forEach.call(alvos, function (s) {
      if (io) { window.animarGrafico(s, true); io.observe(s); } // estado inicial já zerado: não "pisca" completo
      else window.animarGrafico(s);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
})();
