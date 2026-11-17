// Sininho de notificações na barra superior: histórico de alertas de metas atrasadas há 30 dias ou mais.
//  - Cada alerta vira uma notificação gravada no navegador no momento em que aparece; depois disso ela
//    NÃO muda mais (mesmo que a meta seja atualizada, concluída ou excluída). É um histórico.
//  - Notificação nova aparece normal; depois que a pessoa abre o sino, na vez seguinte ela fica esmaecida (lida).
//  - A data do alerta é a da última atualização da meta (quando o status "Atrasado" foi registrado).
// Lê o resumo que a tela Indicadores e metas grava no navegador para descobrir novos alertas.
(function () {
  var CH = "sistid-resumo-metas", CH_N = "sistid-notificacoes", DIAS = 30, MAX = 100;
  var MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  // Dados de exemplo, usados enquanto a tela Indicadores e metas ainda não gravou o resumo
  var PADRAO = [
    { id: "faturamento", titulo: "Faturamento anual", cls: "alta", res: "R$ 168 mil", meta: "R$ 480 mil", alc: 35, cat: "Econômico", atual: "30/06/2026" },
    { id: "cursos", titulo: "Quantidade de cursos oferecidos", cls: "alta", res: "7 cursos", meta: "12 cursos", alc: 58, cat: "Social, Saúde e Educação", atual: "29/06/2026" },
    { id: "rondas", titulo: "Rondas de vigilância territorial", cls: "alta", res: "16 rondas", meta: "24 rondas", alc: 67, cat: "Gestão Ambiental e Territorial", atual: "30/06/2026" }
  ];

  var topo = document.querySelector(".topo");
  var alvo = topo && topo.lastElementChild;
  if (!alvo) return;

  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; }
  function parseData(s) { var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(s)); return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null; }
  function dataCurta(d) { return (d.getDate() < 10 ? "0" : "") + d.getDate() + " " + MESES[d.getMonth()] + " " + d.getFullYear(); }

  // ---- histórico (guardado no navegador) ----
  var hist = [];
  function lerHist() { try { var v = JSON.parse(localStorage.getItem(CH_N)); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function gravarHist() { try { localStorage.setItem(CH_N, JSON.stringify(hist)); } catch (e) {} }
  function ordenar(l) { l.sort(function (x, y) { return (parseData(y.recebido) || 0) - (parseData(x.recebido) || 0) || String(x.titulo).localeCompare(String(y.titulo), "pt-BR"); }); }

  // Alertas atuais (metas atrasadas há 30 dias ou mais) que ainda não viraram notificação
  function sincronizar() {
    var lista = PADRAO, agora = new Date(), tem = {}, novo = false;
    try { var r = JSON.parse(localStorage.getItem(CH)); if (r && Array.isArray(r.alertas)) lista = r.alertas; } catch (e) {}
    hist = lerHist();
    hist.forEach(function (n) { tem[n.key] = 1; });
    lista.forEach(function (a) {
      var d = a && a.cls === "alta" && typeof a.id === "string" ? parseData(a.atual) : null, key;
      if (!d || Math.floor((agora - d) / 86400000) < DIAS) return;
      key = a.id + "|" + a.atual;
      if (tem[key]) return;
      // cópia fixa dos dados no momento do alerta: não muda mais depois
      hist.push({ key: key, id: a.id, titulo: a.titulo, res: a.res, meta: a.meta, alc: a.alc, cat: a.cat || "", recebido: a.atual, lida: false });
      tem[key] = 1; novo = true;
    });
    if (novo) { ordenar(hist); hist = hist.slice(0, MAX); gravarHist(); }
  }

  // ---- estrutura ----
  var wrap = el("div", "sino"), btn = el("button", "sino-btn"), badge = el("span", "sino-n"), pop = el("div", "sino-pop");
  wrap.setAttribute("data-sem-print", "");
  btn.type = "button"; btn.setAttribute("aria-haspopup", "dialog"); btn.setAttribute("aria-expanded", "false");
  btn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/></svg>';
  btn.appendChild(badge);
  pop.id = "sino-pop"; pop.hidden = true; pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", "Notificações");
  btn.setAttribute("aria-controls", pop.id);
  wrap.appendChild(btn); wrap.appendChild(pop);
  alvo.style.display = "flex"; alvo.style.alignItems = "center";
  alvo.insertBefore(wrap, alvo.firstChild);

  function naoLidas() { return hist.filter(function (n) { return !n.lida; }).length; }
  function marcador() {
    var n = naoLidas();
    badge.textContent = n > 9 ? "9+" : n; badge.hidden = !n;
    btn.setAttribute("aria-label", n ? n + (n === 1 ? " notificação nova" : " notificações novas") : "Notificações");
  }

  // Desenha a lista com o estado de leitura atual (as novas aparecem normais, as já lidas esmaecidas)
  function desenhar() {
    var n = hist.length, novas = naoLidas();
    pop.textContent = "";
    var cab = el("div", "sino-cab");
    cab.appendChild(el("b", "", "Notificações"));
    cab.appendChild(el("small", "", n ? n + (n === 1 ? " notificação" : " notificações") + (novas ? " · " + novas + (novas === 1 ? " nova" : " novas") : "") + " · metas atrasadas há " + DIAS + " dias ou mais" : "Metas atrasadas há " + DIAS + " dias ou mais"));
    pop.appendChild(cab);
    if (!n) { pop.appendChild(el("p", "sino-vazio", "Nenhuma notificação por enquanto.")); return; }
    var ul = el("ul", "sino-lista");
    hist.forEach(function (o) {
      var li = el("li", o.lida ? "lida" : "nova"), a = el("a"), t = el("b", "", o.titulo);
      a.href = "indicadores.html#" + encodeURIComponent(o.id);
      if (!o.lida) t.appendChild(el("span", "sino-tag", "Nova"));
      a.appendChild(t);
      a.appendChild(el("span", "sino-det", o.res + " de " + o.meta + " (" + o.alc + "%)" + (o.cat ? " · " + o.cat : "")));
      var rod = el("span", "sino-data"), d = parseData(o.recebido);
      rod.appendChild(document.createTextNode("Alerta recebido em "));
      rod.appendChild(el("b", "", d ? dataCurta(d) : String(o.recebido)));
      a.appendChild(rod);
      li.appendChild(a); ul.appendChild(li);
    });
    pop.appendChild(ul);
  }

  function abrir(sim) {
    if (sim) {
      sincronizar(); desenhar();
      // Ao abrir, as novas são mostradas normais; a partir da próxima vez ficam esmaecidas
      if (naoLidas()) { hist.forEach(function (n) { n.lida = true; }); gravarHist(); }
      marcador();
    }
    pop.hidden = !sim; btn.setAttribute("aria-expanded", sim ? "true" : "false");
  }
  btn.addEventListener("click", function (e) { e.stopPropagation(); abrir(pop.hidden); });
  pop.addEventListener("click", function (e) { e.stopPropagation(); });
  document.addEventListener("click", function () { if (!pop.hidden) abrir(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !pop.hidden) { abrir(false); btn.focus(); } });
  window.addEventListener("storage", function (e) { if (e.key === CH || e.key === CH_N) { if (pop.hidden) { sincronizar(); marcador(); } } });
  window.addEventListener("pageshow", function () { if (pop.hidden) { sincronizar(); marcador(); } });
  sincronizar(); marcador();
})();
