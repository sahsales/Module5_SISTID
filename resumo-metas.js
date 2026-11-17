// Liga o painel inicial aos dados reais de "Indicadores e metas":
//  - card "Metas em andamento" (total e metas ainda não atingidas);
//  - "Alertas e pontos de atenção" (uma linha para cada meta atrasada ou em atenção).
// A página de indicadores grava o resumo em localStorage a cada mudança (adicionar, excluir,
// salvar progresso); aqui ele é lido e exibido. "Em andamento" = meta que ainda não chegou a 100%
// (inclui as não iniciadas). Sem resumo salvo, ficam os valores que já estão na página.
(function () {
  var CH = "sistid-resumo-metas", MAX_ALERTAS = 5, MAX_EXTRA = 4, DIAS_PARADO = 30;
  // Dados de exemplo para os dois blocos de baixo quando "Indicadores e metas" ainda não foi aberto
  // (assim que a página de indicadores grava o resumo, os dados reais passam a valer).
  var PADRAO = {"alertas": [{"id": "faturamento", "titulo": "Faturamento anual", "cls": "alta", "res": "R$ 168 mil", "meta": "R$ 480 mil", "alc": 35, "resp": "Rafael Nogueira · Associações e Cooperativas Produtivas", "cat": "Econômico", "atual": "30/06/2026"}, {"id": "cursos", "titulo": "Quantidade de cursos oferecidos", "cls": "alta", "res": "7 cursos", "meta": "12 cursos", "alc": 58, "resp": "Marcos Teixeira · Equipe de Educação e Formação", "cat": "Social, Saúde e Educação", "atual": "29/06/2026"}, {"id": "rondas", "titulo": "Rondas de vigilância territorial", "cls": "alta", "res": "16 rondas", "meta": "24 rondas", "alc": 67, "resp": "Roberto Alves · Equipe de Proteção Territorial", "cat": "Gestão Ambiental e Territorial", "atual": "30/06/2026"}, {"id": "investimento", "titulo": "Investimento anual", "cls": "media", "res": "R$ 1,08 milhão", "meta": "R$ 2,4 milhões", "alc": 45, "resp": "André Cardoso · Articulação de Políticas Públicas", "cat": "Políticas Públicas", "atual": "26/06/2026"}, {"id": "areas", "titulo": "Áreas em recuperação", "cls": "media", "res": "35 ha", "meta": "50 ha", "alc": 70, "resp": "Juliana Prado · Equipe Ambiental", "cat": "Gestão Ambiental e Territorial", "atual": "29/06/2026"}, {"id": "cobertura", "titulo": "Cobertura territorial monitorada", "cls": "media", "res": "72%", "meta": "90%", "alc": 80, "resp": "Mariana Tavares · Coordenação de Monitoramento Territorial", "cat": "Gestão Ambiental e Territorial", "atual": "30/06/2026"}, {"id": "familias", "titulo": "Famílias produtoras", "cls": "media", "res": "96 famílias", "meta": "120 famílias", "alc": 80, "resp": "Patrícia Lima · Equipe de Desenvolvimento Econômico", "cat": "Econômico", "atual": "28/06/2026"}, {"id": "saneamento", "titulo": "Saneamento básico", "cls": "media", "res": "78%", "meta": "85%", "alc": 92, "resp": "Luciana Ferraz · Equipe de Saúde e Saneamento", "cat": "Social, Saúde e Educação", "atual": "27/06/2026"}], "proximas": [{"id": "saneamento", "titulo": "Saneamento básico", "res": "78%", "meta": "85%", "alc": 92, "falta": "7%", "cat": "Social, Saúde e Educação"}, {"id": "cobertura", "titulo": "Cobertura territorial monitorada", "res": "72%", "meta": "90%", "alc": 80, "falta": "18%", "cat": "Gestão Ambiental e Territorial"}, {"id": "familias", "titulo": "Famílias produtoras", "res": "96 famílias", "meta": "120 famílias", "alc": 80, "falta": "24 famílias", "cat": "Econômico"}, {"id": "areas", "titulo": "Áreas em recuperação", "res": "35 ha", "meta": "50 ha", "alc": 70, "falta": "15 ha", "cat": "Gestão Ambiental e Territorial"}]};
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
    // Faixa do card: status do alcance médio das metas (mesma regra dos status: 100% em dia, 70% em atenção, abaixo disso atrasado)
    var card = document.getElementById("k-metas-card");
    if (card && typeof r.media === "number") {
      var f = r.total === 0 ? "neutro" : r.media >= 100 ? "ok" : r.media >= 70 ? "atencao" : r.media > 0 ? "atrasado" : "neutro";
      card.className = card.className.replace(/\s*faixa-\S+/g, "") + " faixa-" + f;
      card.title = "Alcance médio das metas: " + r.media + "%";
    }
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

  // "30/06/2026" -> Date (meia-noite local); null se inválida
  function parseData(s) {
    var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(s));
    return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null;
  }
  function linhaExtra(titulo, sub, dir, id) {
    var esq = el("div"), d = el("div"), link = el("a", "", "Ver →");
    esq.appendChild(el("b", "", titulo));
    esq.appendChild(el("small", "", sub));
    dir.forEach(function (n) { d.appendChild(n); });
    link.href = "indicadores.html#" + encodeURIComponent(id);
    d.appendChild(link);
    var linha = el("div", "alerta");
    linha.appendChild(esq); linha.appendChild(d);
    return linha;
  }
  function maisLinha(resto, singular, plural_) {
    var linha = el("div", "alerta"), c = el("div"), s = el("small", "", "+ " + plural(resto, singular, plural_) + " · ");
    var l = el("a", "", "ver em Indicadores e metas →"); l.href = "indicadores.html";
    s.appendChild(l); c.appendChild(s); linha.appendChild(c);
    return linha;
  }
  function vazio(txt) { var l = el("div", "alerta"), c = el("div"); c.appendChild(el("small", "", txt)); l.appendChild(c); return l; }

  // Alertas (alta/média) cuja última atualização passou de 30 dias; os mais antigos primeiro
  function mostrarParados(alertas) {
    var box = document.getElementById("parados-lista"), leg = document.getElementById("parados-leg");
    if (!box || !leg) return;
    var hoje = new Date(), lista = [];
    (alertas || []).forEach(function (a) {
      var d = a && parseData(a.atual), dias = d ? Math.floor((hoje - d) / 86400000) : 0;
      if (a && typeof a.id === "string" && (a.cls === "alta" || a.cls === "media") && dias > DIAS_PARADO) lista.push({ a: a, dias: dias });
    });
    lista.sort(function (x, y) { return y.dias - x.dias; });
    leg.textContent = lista.length
      ? plural(lista.length, "alerta aberto", "alertas abertos") + " há mais de " + DIAS_PARADO + " dias sem atualização"
      : "Alertas abertos há mais de " + DIAS_PARADO + " dias sem atualização";
    box.textContent = "";
    if (!lista.length) { box.appendChild(vazio("Nenhum alerta parado. Tudo foi atualizado nos últimos " + DIAS_PARADO + " dias.")); return; }
    lista.slice(0, MAX_EXTRA).forEach(function (o) {
      box.appendChild(linhaExtra(o.a.titulo, "Última atualização em " + dataCurta(o.a.atual) + " · " + o.a.resp,
        [el("span", "badge " + o.a.cls, "● " + o.dias + " dias")], o.a.id));
    });
    if (lista.length > MAX_EXTRA) box.appendChild(maisLinha(lista.length - MAX_EXTRA, "alerta parado", "alertas parados"));
  }

  // Metas entre 70% e 99%: as que estão mais perto de chegar a 100% primeiro
  function mostrarProximas(lista) {
    var box = document.getElementById("proximas-lista"), leg = document.getElementById("proximas-leg");
    if (!box || !leg) return;
    lista = (lista || []).filter(function (m) { return m && typeof m.id === "string" && m.alc >= 70 && m.alc < 100; });
    leg.textContent = lista.length
      ? plural(lista.length, "meta falta pouco", "metas faltam pouco") + " para chegar a 100%"
      : "Metas acima de 70% que ainda não chegaram a 100%";
    box.textContent = "";
    if (!lista.length) { box.appendChild(vazio("Nenhuma meta perto de bater no momento.")); return; }
    lista.slice(0, MAX_EXTRA).forEach(function (m) {
      var falta = String(m.falta).replace(/%$/, " p.p."), barra = el("div", "prog");
      var i = el("i"); i.style.setProperty("--p", m.alc + "%");
      barra.appendChild(i); barra.appendChild(document.createTextNode(m.alc + "%"));
      barra.style.display = "inline-flex"; barra.style.marginRight = "14px";
      box.appendChild(linhaExtra(m.titulo, "Falta" + (/^1(\s|$)/.test(falta) ? " " : "m ") + falta + " · " + m.res + " de " + m.meta, [barra], m.id));
    });
    if (lista.length > MAX_EXTRA) box.appendChild(maisLinha(lista.length - MAX_EXTRA, "meta próxima", "metas próximas"));
  }

  function mostrar() {
    var r = ler();
    if (r) { mostrarCard(r); mostrarAlertas(r); }
    // sem resumo salvo (ou salvo antes destes blocos existirem), usa os dados de exemplo
    mostrarParados(r && Array.isArray(r.alertas) ? r.alertas : PADRAO.alertas);
    mostrarProximas(r && Array.isArray(r.proximas) ? r.proximas : PADRAO.proximas);
  }
  mostrar();
  window.addEventListener("storage", function (e) { if (e.key === CH) mostrar(); }); // outra aba mudou as metas
  window.addEventListener("pageshow", mostrar); // voltar pelo histórico do navegador
})();
