// Mostra, no rodapé de cada página, a data e a hora da última sincronização.
// A hora é a da entrada no sistema (ao abrir uma nova aba/sessão) e é renovada
// quando você faz uma modificação (por exemplo, gerar um relatório), chamando
// window.sincronizar().
(function () {
  var CH = "sistid-sincronizacao", SES = "sistid-sessao";
  function p(n) { return n < 10 ? "0" + n : "" + n; }
  function fmt(d) {
    return p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + d.getFullYear() + " · " + p(d.getHours()) + ":" + p(d.getMinutes());
  }
  function ler() { try { return localStorage.getItem(CH); } catch (e) { return null; } }
  function gravar(v) { try { localStorage.setItem(CH, v); } catch (e) {} }

  var nova = true;
  try { nova = !sessionStorage.getItem(SES); sessionStorage.setItem(SES, "1"); } catch (e) {}
  var atual = ler();
  if (nova || !atual) { atual = new Date().toISOString(); gravar(atual); }

  function mostrar() {
    document.querySelectorAll("[data-sync]").forEach(function (e) {
      e.textContent = "Atualizado em " + fmt(new Date(atual));
    });
  }
  window.sincronizar = function () { atual = new Date().toISOString(); gravar(atual); mostrar(); };
  mostrar();
})();
