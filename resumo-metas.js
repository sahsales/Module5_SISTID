// Liga o painel inicial aos dados reais de "Indicadores e metas":
//  - card "Metas em andamento" (total e metas ainda não atingidas);
//  - "Alertas e pontos de atenção" (uma linha para cada meta atrasada ou em atenção).
// A página de indicadores grava o resumo em localStorage a cada mudança (adicionar, excluir,
// salvar progresso); aqui ele é lido e exibido. "Em andamento" = meta que ainda não chegou a 100%
// (inclui as não iniciadas). Sem resumo salvo, ficam os valores que já estão na página.
(function () {
  var CH = "sistid-resumo-metas", MAX_ALERTAS = 5;
  var MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

  function ler() {
    try {
      var r = JSON.parse(localStorage.getItem(CH));
      if (r && Number.isInteger(r.total) && Number.isInteger(r.andamento) && r.total >= 0 && r.andamento >= 0 && r.andamento <= r.total) return r;
    } catch (e) {}
    return null;
  }
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined) e.textContent = txt;
    return e;
  }
  function plural(n, um, varios) { return n + " " + (n === 1 ? um : varios); }
  // "30/06/2026" -> "30 jun 2026"
  function dataCurta(s) {
    var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(s));
    return m && MESES[+m[2] - 1] ? m[1] + " " + MESES[+m[2] - 1] + " " + m[3] : String(s || "");
  }

  function mostrarCard(r) {
    var a = document.getElementById("k-metas-and"), t = document.getElementById("k-metas-tot");
    if (!a || !t) return;
    a.textContent = r.andamento;
    t.textContent = "de " + r.total + (r.total === 1 ? " meta monitorada" : " metas monitoradas");
  }

  function linhaAlerta(a) {
    var esq = el("div"), dir = el("div"), link = el("a", "", "Ver alerta →");
    esq.appendChild(el("b", "", a.titulo + (a.cls === "alta" ? " abaixo da meta" : " requer acompanhamento")));
    esq.appendChild(el("small", "", a.res + " · meta de " + a.meta + " (" + a.alc + "%) · " + a.cat + " · Responsável: " + a.resp));
    dir.appendChild(document.createTextNode(dataCurta(a.atual)));
    dir.appendChild(el("span", "badge " + a.cls, a.cls === "alta" ? "● Alta" : "● Média"));
    link.href = "indicadores.html#" + encodeURIComponent(a.id);
    dir.appendChild(link);
    var linha = el("div", "alerta");
    linha.appendChild(esq); linha.appendChild(dir);
    return linha;
  }

  function mostrarAlertas(r) {
    var box = document.getElementById("alertas-metas"), leg = document.getElementById("alertas-leg");
    if (!box || !leg || !Array.isArray(r.alertas)) return;
    var lista = r.alertas.filter(function (a) {
      return a && typeof a.id === "string" && typeof a.titulo === "string" && (a.cls === "alta" || a.cls === "media");
    });
    var FIXOS = 1; // "Consolidação dos registros de campo" não é uma meta e continua sempre na página
    var total = lista.length + FIXOS;
    leg.textContent = plural(total, "alerta aberto", "alertas abertos") + " · priorize os acompanhamentos do território";
    box.textContent = "";
    lista.slice(0, MAX_ALERTAS).forEach(function (a) { box.appendChild(linhaAlerta(a)); });
    var resto = lista.length - MAX_ALERTAS;
    if (resto > 0) {
      var linha = el("div", "alerta"), c = el("div"), s = el("small", "", "+ " + plural(resto, "alerta de meta", "alertas de metas") + " · ");
      var l = el("a", "", "ver em Indicadores e metas →"); l.href = "indicadores.html";
      s.appendChild(l); c.appendChild(s); linha.appendChild(c); box.appendChild(linha);
    }
  }

  function mostrar() {
    var r = ler();
    if (!r) return;
    mostrarCard(r); mostrarAlertas(r);
  }
  mostrar();
  window.addEventListener("storage", function (e) { if (e.key === CH) mostrar(); }); // outra aba mudou as metas
  window.addEventListener("pageshow", mostrar); // voltar pelo histórico do navegador
})();
