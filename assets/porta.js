/* Carpe Notes — porta d'ingresso del sito online.
   Sul sito online i contenuti (teoria, esercizi, soluzioni) sono cifrati in assets/contenuti-cifrati.js.
   La chiave per aprirli è dentro il link d'invito della prof (dopo il #, quindi non arriva mai al server):
   senza link si vede solo questa pagina. Con la chiave giusta i contenuti vengono decifrati nel browser
   e poi si caricano i normali file della piattaforma. */
(function(){
  const K = 'cn_chiave_sito';
  const app = document.getElementById('app');
  const FILE = ['core', 'inviti', 'progressi', 'attivita', 'sfide', 'studente'];
  const unb64u = s => { s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while(s.length % 4) s += '='; const b = atob(s); return Uint8Array.from(b, c => c.charCodeAt(0)); };
  const leggi = () => { try{ return localStorage.getItem(K) || ''; }catch(e){ return ''; } };
  const scrivi = k => { try{ localStorage.setItem(K, k); }catch(e){} };
  const togli = () => { try{ localStorage.removeItem(K); }catch(e){} };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
  // dal link: …#/invito/<dati>.<firma>.<chiave>
  const parti = t => { const m = String(t || '').match(/invito[\/=]([A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+)\.([A-Za-z0-9_\-]{43})/); return m ? {codice: m[1] + '.' + m[2], chiave: m[2]} : null; };

  function schermata(avviso, conModulo){
    app.innerHTML = `
      <section class="hero"><div class="sigillo"><img class="logo-big" src="assets/logo.png" alt=""><p class="firma">Carpe Notes · di <b>prof.ssa Serena De Gaspari</b></p></div><h1>Allenati, un <span class="hl">argomento</span> alla volta.</h1>
      <p class="muted">Si entra solo su invito: apri il link che ti ha mandato la tua prof. Funziona su questo dispositivo finché non esci.</p></section>
      ${avviso ? `<div class="notice" style="max-width:460px">${esc(avviso)}</div>` : ''}
      ${conModulo === false ? '' : `<form class="card" id="f" style="max-width:460px">
        <label class="f" for="link">Hai il link ma non si apre? Incollalo qui</label>
        <input type="text" id="link" required autocomplete="off" placeholder="Incolla il link della prof">
        <div class="btn-row" style="margin-top:18px"><button class="btn primary lg">Entra</button></div>
      </form>`}`;
    const f = app.querySelector('#f');
    if(f) f.onsubmit = e => {
      e.preventDefault();
      const p = parti(app.querySelector('#link').value);
      if(!p) return schermata('Non sembra un link della prof: copialo tutto, fino all\'ultima lettera.');
      history.replaceState(null, '', '#/invito/' + p.codice);
      avvia();
    };
  }

  async function apri(k){
    const C = window.CARPE_CIFRATI;
    const key = await crypto.subtle.importKey('raw', unb64u(k), {name: 'AES-GCM'}, false, ['decrypt']);
    const testo = await crypto.subtle.decrypt({name: 'AES-GCM', iv: unb64u(C.iv)}, key, unb64u(C.dati));
    return JSON.parse(new TextDecoder().decode(testo));
  }
  function carica(i){
    if(i >= FILE.length) return;
    const s = document.createElement('script');
    s.src = 'assets/' + FILE[i] + '.js';
    s.onload = () => carica(i + 1);
    s.onerror = () => schermata('Non riesco a caricare la piattaforma. Controlla la connessione e ricarica la pagina.', false);
    document.body.appendChild(s);
  }

  async function avvia(){
    if(!window.CARPE_CIFRATI) return schermata('Il sito è in preparazione: la prof sta caricando i contenuti. Riprova più tardi.', false);
    if(!(window.crypto && crypto.subtle)) return schermata('Questo browser è troppo vecchio per aprire Carpe Notes. Prova con un altro browser aggiornato.', false);
    const dalLink = parti(location.hash);
    const k = dalLink ? dalLink.chiave : leggi();
    if(!k) return schermata('');
    app.innerHTML = '<p class="muted">Caricamento…</p>';
    let cat;
    try{ cat = await apri(k); }
    catch(e){
      togli();
      return schermata(dalLink ? 'Questo link non è più valido. Chiedi alla prof il link nuovo.' : 'La prof ha rinnovato gli accessi: apri il link nuovo che ti ha mandato.');
    }
    scrivi(k);
    window.CARPE_CONTENUTI = cat;
    partita = true; window.removeEventListener('hashchange', alCambio);
    carica(0);
  }
  // se lo studente apre il link mentre questa pagina è già aperta
  let partita = false;
  const alCambio = () => { if(!partita && parti(location.hash)) avvia(); };
  window.addEventListener('hashchange', alCambio);
  avvia();
})();
