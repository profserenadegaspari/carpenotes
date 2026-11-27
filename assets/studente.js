/* Carpe Notes — area studente */
(function(){
  const app = document.getElementById('app'), who = document.getElementById('who'), tabs = document.getElementById('tabs');
  const {esc} = CN;
  let cat = CN.catalog();

  const visibili = sez => (sez.argomenti||[]).filter(a => a.visibile !== false);
  const prof = s => CN.profilo(CN.risultatiStudente(s), cat, CN.sfide.diStudente(s));
  const best = (P, id) => { const a = P.args.get(id); return a ? a.best : null; };
  const superato = (P, id) => { const b = best(P, id); return b !== null && b >= P.soglia; };
  function bloccato(P, sez, idx){
    if(!cat.impostazioni.sbloccoProgressivo || idx === 0 || CN.anteprima()) return false;
    return !superato(P, visibili(sez)[idx-1].id);
  }

  /* ---------- Macroargomenti: le sezioni di una materia raggruppate, ognuna con la sua icona ----------
     Il gruppo nasce dal titolo: «Scrittura: il riassunto» e «Scrittura: i tipi di testo» finiscono in «Scrittura».
     Le icone sono disegni originali (SVG semplici), scelti in base al nome della sezione. */
  const _p = d => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ICO_MACRO = [
    [/ortograf|suoni|punteggiat/, _p('<path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3"/><path d="M4 4.5l3 2"/>'), 'Ortografia'],
    [/grammatical/, _p('<path d="M3 11.5V4h7.5L21 14.5 13.5 22z"/><circle cx="7.3" cy="8.3" r="1.6"/>'), 'Grammatica'],
    [/nome e agg/, _p('<path d="M3 11.5V4h7.5L21 14.5 13.5 22z"/><circle cx="7.3" cy="8.3" r="1.6"/>')],
    [/logica|casi/, _p('<circle cx="12" cy="4.8" r="2.3"/><circle cx="4.8" cy="19" r="2.3"/><circle cx="19.2" cy="19" r="2.3"/><circle cx="12" cy="19" r="2.3"/><path d="M12 7.1V16.7M10.4 6.6 6 16.9M13.6 6.6 18 16.9"/>')],
    [/periodo/, _p('<path d="M10 14.5a4 4 0 0 1 0-5.7l3-3a4 4 0 0 1 5.7 5.7l-1.4 1.4"/><path d="M14 9.5a4 4 0 0 1 0 5.7l-3 3a4 4 0 0 1-5.7-5.7l1.4-1.4"/>')],
    [/lessico/, _p('<path d="M3 5.5c3-1.3 6-1.3 9 .8 3-2.1 6-2.1 9-.8v13.5c-3-1.3-6-1.3-9 .8-3-2.1-6-2.1-9-.8z"/><path d="M12 6.3V20"/>'), 'Lessico'],
    [/scrittura/, _p('<path d="M12 2.5 18 10l-6 11.5L6 10z"/><path d="M12 13v8.5"/><circle cx="12" cy="11" r="1.6"/>'), 'Scrittura'],
    [/epica/, _p('<path d="M6 21v-8.5a6 6 0 0 1 12 0V21"/><path d="M18 21h-4v-6.5H6"/><path d="M8.5 7.4C9 4.5 11 3 14.5 3c2.7 0 4.8 1.2 6 3"/>'), 'Epica'],
    [/primi passi/, _p('<path d="M12 21v-9"/><path d="M12 12C12 8 9.5 5.5 4.5 5.5c0 4 2.5 6.5 7.5 6.5z"/><path d="M12 10c0-3.4 2.2-5.5 6.5-5.5 0 3.4-2.2 5.5-6.5 5.5z"/>'), 'Primi passi'],
    [/verbo/, _p('<path d="M13.5 2 4.5 13.5h7L10.5 22l9-11.5h-7z"/>'), 'Il verbo'],
    [/pronom/, _p('<circle cx="12" cy="8" r="4"/><path d="M4 21c.6-4 3.8-6.5 8-6.5s7.4 2.5 8 6.5"/>'), 'I pronomi'],
    [/egitt/, _p('<path d="M2.5 20.5 11 6l8.5 14.5z"/><path d="M11 6l3.5 14.5"/><circle cx="19" cy="5" r="2"/><path d="M1.5 20.5h21"/>'), 'Egitto'],
    [/egeo|minoic|micene/, _p('<path d="M2 19c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 6 0"/><path d="M4.5 14.5h15L17 17H7z"/><path d="M12 14.5V3l6 8.5h-6"/>'), 'Egeo'],
    [/greci|grecia|polis/, _p('<path d="M3 8.5 12 4l9 4.5z"/><path d="M5.5 11v7M10 11v7M14 11v7M18.5 11v7"/><path d="M3 21h18M4 11h16"/>'), 'I Greci'],
    [/romani|roma/, _p('<path d="M4 21V11a8 8 0 0 1 16 0v10"/><path d="M8.5 21v-8a3.5 3.5 0 0 1 7 0v8"/><path d="M2.5 21h19"/>'), 'Roma']
  ];
  const ICO_LIBRO = _p('<path d="M5 3.5h11.5a2 2 0 0 1 2 2V20.5H7a2 2 0 0 1-2-2z"/><path d="M5 18.5a2 2 0 0 1 2-2h11.5"/>');
  const icoMacro = t => { t = t.toLowerCase(); return ICO_MACRO.find(([re]) => re.test(t)) || [null, ICO_LIBRO, null]; };
  function macroDi(m){
    const out = [];
    (m.sezioni||[]).forEach(sez => {
      if(!visibili(sez).length) return;
      const tit = sez.gruppo || (sez.titolo.includes(':') ? sez.titolo.split(':')[0].trim() : sez.titolo);
      let g = out.find(x => x.titolo === tit);
      if(!g){ const [, ico, breve] = icoMacro(tit + ' ' + sez.titolo); g = {id: sez.id, titolo: tit, breve: breve || tit, sezioni: [], ico}; out.push(g); }
      g.sezioni.push(sez);
    });
    return out;
  }
  const contaMacro = (P, g) => { const v = g.sezioni.flatMap(visibili); return {ok: v.filter(a => superato(P, a.id)).length, tot: v.length}; };

  const TABS = [['/', 'Materie', 'libro'], ['/ripasso', 'Ripasso', 'giro'], ['/sfide', 'Sfide', 'spada'], ['/traguardi', 'Traguardi', 'coppa'], ['/progressi', 'Progressi', 'grafico']];
  function header(s, P, path){
    document.body.classList.toggle('has-tabs', !!s);
    if(!s){ who.innerHTML = ''; tabs.innerHTML = ''; return; }
    who.innerHTML = `<a class="chip fire ${P.streak ? '' : 'zero'}" href="#/progressi" title="Giorni consecutivi di allenamento">${CN.ico.fiamma} ${P.streak}</a>
      <a class="chip xp" href="#/traguardi" title="Punti esperienza">${P.xp} XP</a>
      <a class="chip" href="#/profilo">${esc(s.nome.split(' ')[0])} · ${esc(s.classe)}</a>`;
    if(s.anteprima){
      who.innerHTML = `<span class="chip anteprima" title="Tutto sbloccato, i risultati non vengono salvati">Anteprima prof · tutto sbloccato</span><button class="btn sm" id="esciAnt">Esci</button>`;
      who.querySelector('#esciAnt').onclick = () => { CN.logoutStudente(); R.go('/'); };
    }
    const att = p => p === '/' ? (path === '/' || path.startsWith('/m/') || path.startsWith('/a/')) : p === '/sfide' ? path.startsWith('/sfid') : path.startsWith(p);
    tabs.innerHTML = TABS.map(([p, t, i]) => `<a href="#${p}" class="${att(p) ? 'on' : ''}">${CN.ico[i]}<span>${t}</span></a>`).join('');
  }

  /* ---------- Accesso: solo con il link d'invito della prof ---------- */
  let verificato = null;   // codice già controllato in questa visita
  let avviso = '';         // perché lo studente è stato fatto uscire
  const MOTIVI = {
    revocato: 'Il tuo link non è più attivo. Chiedi alla prof un link nuovo.',
    falso: 'Questo link non è valido. Controlla di averlo copiato tutto, oppure chiedi alla prof un link nuovo.',
    nonattivi: 'La prof non ha ancora attivato gli inviti. Riprova più tardi.',
    browser: 'Questo browser è troppo vecchio per controllare il link. Prova con un altro browser aggiornato.',
    diverso: 'Per continuare ti serve il tuo link personale della prof.',
    manca: 'Per entrare ti serve il link che ti ha mandato la prof.'
  };
  function viewLogin(){
    app.innerHTML = `
      <section class="hero"><div class="sigillo"><img class="logo-big" src="assets/logo.png" alt=""><p class="firma">Carpe Notes · di <b>prof.ssa Serena De Gaspari</b></p></div><h1>Allenati, un <span class="hl">argomento</span> alla volta.</h1>
      <p class="muted">Si entra solo su invito: apri il link che ti ha mandato la tua prof. Funziona su questo dispositivo finché non esci.</p></section>
      ${avviso ? `<div class="notice" style="max-width:460px">${esc(avviso)}</div>` : ''}
      <form class="card" id="f" style="max-width:460px">
        <label class="f" for="link">Hai il link ma non si apre? Incollalo qui</label>
        <input type="text" id="link" required autocomplete="off" placeholder="Incolla il link della prof">
        <div class="btn-row" style="margin-top:18px"><button class="btn primary lg">Entra</button></div>
      </form>
      <details class="card flat prof-ant" style="max-width:460px;margin-top:16px">
        <summary><b>Sei la prof?</b> Guarda la piattaforma con tutto sbloccato</summary>
        <form id="fa" style="margin-top:10px">
          <label class="f" for="pinAnt">PIN dell'area docente</label>
          <input type="password" id="pinAnt" autocomplete="off" required>
          <p class="hint">Vedrai tutti gli argomenti, le attività e le sfide come se fossero sbloccati. I tuoi tentativi non vengono salvati e non finiscono nei risultati della classe.</p>
          <div class="btn-row" style="margin-top:10px"><button class="btn">Apri l'anteprima</button></div>
        </form>
      </details>`;
    app.querySelector('#fa').onsubmit = e => {
      e.preventDefault();
      if(app.querySelector('#pinAnt').value !== CN.pinDocente()){ CN.toast('PIN non corretto'); return; }
      CN.entraAnteprima(); R.go('/');
    };
    app.querySelector('#f').onsubmit = e => {
      e.preventDefault();
      const c = CN.inviti.codiceDa(app.querySelector('#link').value);
      if(!c){ CN.toast('Non sembra un link della prof: copialo tutto'); return; }
      R.go('/invito/' + c);
    };
  }
  // Apertura del link d'invito
  async function viewInvito(codice){
    app.innerHTML = '<p class="muted">Controllo il tuo invito…</p>';
    const r = await CN.inviti.verifica(codice);
    if(!r.ok){ avviso = MOTIVI[r.motivo] || MOTIVI.falso; header(null); return viewLogin(); }
    const d = r.dati, att = CN.studente();
    const entra = async nome => {
      const nuovo = {nome, classe: d.c, codice};
      if(att && !att.anteprima && CN.studKey(att) !== CN.studKey(nuovo)
        && !(await CN.conferma(`Su questo dispositivo è già entrato ${att.nome} (${att.classe}). Vuoi entrare come ${CN.maiuscole(nome)}? I risultati di ${att.nome} restano salvati qui.`, 'Entra'))) return R.go('/');
      CN.setStudente(nuovo); verificato = codice; avviso = ''; R.go('/');
    };
    if(d.t !== 'classe') return entra(d.n);
    // Link unico della classe: lo studente scrive il suo nome
    header(null);
    app.innerHTML = `<section class="hero"><div class="sigillo"><img class="logo-big" src="assets/logo.png" alt=""><p class="firma">Carpe Notes · di <b>prof.ssa Serena De Gaspari</b></p></div><h1>Benvenuto nella <span class="hl">${esc(d.c)}</span></h1>
      <p class="muted">Scrivi nome e cognome: servono per salvare punti, traguardi e progressi su questo dispositivo.</p></section>
      <form class="card" id="f" style="max-width:460px">
        <label class="f" for="nome">Nome e cognome</label>
        <input type="text" id="nome" required autocomplete="name" placeholder="es. Giulia Rossi">
        <div class="btn-row" style="margin-top:18px"><button class="btn primary lg">Inizia</button></div>
      </form>`;
    app.querySelector('#f').onsubmit = e => { e.preventDefault(); const n = app.querySelector('#nome').value.trim(); if(n) entra(n); };
  }
  // Lo studente già entrato su questo dispositivo ha ancora un invito valido?
  async function controllaInvito(s){
    app.innerHTML = '<p class="muted">Caricamento…</p>';
    const r = await CN.inviti.verifica(s.codice);
    if(r.ok && CN.inviti.corrisponde(r.dati, s)){ verificato = s.codice; return R.refresh(); }
    if(r.motivo === 'browser'){ avviso = MOTIVI.browser; header(null); return viewLogin(); }
    CN.logoutStudente(); avviso = MOTIVI[s.codice && !r.ok ? r.motivo : 'diverso'] || MOTIVI.falso; R.go('/');
  }

  function cartaLivello(P){
    const L = P.livello;
    return `<div class="card"><div class="small muted" style="font-weight:800;letter-spacing:.06em">LIVELLO ${L.n}</div>
      <div class="lvl-n">${L.nome} <span class="muted small" style="font-family:var(--font);font-weight:700">${L.glossa}</span></div>
      <div class="xpbar" role="img" aria-label="${L.pct}% verso il prossimo livello"><i style="width:${Math.max(4, L.pct)}%"></i></div>
      <div class="small muted">${P.xp} XP${L.next ? ` · ancora ${L.next - P.xp} per diventare <b>${L.nextNome}</b>` : ' · livello massimo raggiunto'}</div></div>`;
  }
  function cartaSettimana(P){
    const lun = CN.lunedi(new Date()), oggi = CN.giorno(new Date());
    const giorni = ['L','M','M','G','V','S','D'].map((n, i) => { const g = CN.giorno(CN.piu(lun, i)); const on = P.giorni.has(g);
      return `<div class="d ${on ? 'on' : ''} ${g === oggi ? 'today' : ''}"><div class="dot">${on ? CN.ico.fiamma : ''}</div>${n}</div>`; }).join('');
    const txt = P.streak > 1 ? `Serie di ${P.streak} giorni di fila. Record: ${P.record}.` : P.streak === 1 ? 'Serie iniziata: torna domani per allungarla.' : 'Allenati oggi per far partire la serie.';
    return `<div class="card"><h3>La tua settimana</h3><div class="week">${giorni}</div><div class="small muted" style="margin-top:8px">${txt}</div></div>`;
  }

  /* ---------- Home ---------- */
  // Nome e cognome come li ha scritti la prof; se è tutto in maiuscolo diventa «Voltolina Clara».
  const nomeSaluto = n => { const t = String(n || '').trim().replace(/\s+/g, ' ');
    return t === t.toLocaleUpperCase('it-IT') ? CN.maiuscole(t.toLocaleLowerCase('it-IT')) : t; };
  function viewHome(s, P){
    const oggiFatto = P.giorni.has(CN.giorno(new Date()));
    const frase = !P.rs.length ? 'Scegli una materia e comincia il primo allenamento.' : oggiFatto ? 'Oggi ti sei già allenato. Vuoi fare un altro giro?' : 'Oggi non ti sei ancora allenato: bastano cinque minuti.';
    app.innerHTML = `<section class="hero"><h1>Ciao <span class="hl">${esc(nomeSaluto(s.nome))}</span>!</h1><p class="muted">${frase}</p></section>
      <div id="next" style="margin-bottom:16px"></div>
      <div class="grid cols-2">${cartaLivello(P)}${cartaSettimana(P)}</div>
      <div id="boss" style="margin-top:16px"></div>
      <div class="sec-title"><h2>Materie</h2></div>
      <div class="grid cols-3" id="mat"></div>
      <div id="trag"></div>`;
    const g = app.querySelector('#mat');
    cat.materie.forEach(m => {
      const args = (m.sezioni||[]).flatMap(visibili);
      const fatti = args.filter(a => superato(P, a.id)).length;
      const on = args.length > 0;
      const el = CN.h(`<div class="card materia ${on ? '' : 'off'}" style="--c:var(--${m.colore||'brand'})" ${on ? 'tabindex="0" role="link"' : ''}>
        <div class="ico">${esc(m.sigla || m.nome.slice(0,2))}</div>
        <h2 style="margin-top:12px">${esc(m.nome)}</h2>
        <p class="muted small">${esc(m.descrizione||'')}</p>
        ${on ? `<div class="small" style="font-weight:800">${fatti} di ${args.length} argomenti superati</div><div class="bar" style="max-width:none"><i style="width:${Math.round(fatti/args.length*100)}%"></i></div>`
             : `<span class="badge">In arrivo</span>`}
      </div>`);
      if(on){ el.onclick = () => R.go('/m/' + m.id); el.onkeydown = e => { if(e.key === 'Enter') el.click(); }; }
      g.appendChild(el);
    });
    // Prossimo argomento da fare
    trovato: for(const m of cat.materie){ for(const sez of (m.sezioni||[])){
      const vis = visibili(sez);
      const i = vis.findIndex(a => !superato(P, a.id));
      if(i >= 0 && !bloccato(P, sez, i)){
        const a = vis[i];
        app.querySelector('#next').innerHTML = `<div class="card brand" style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
          <div style="flex:1;min-width:200px"><div class="small muted" style="font-weight:800">${P.rs.length ? 'Continua da qui' : 'Comincia da qui'} · ${esc(sez.titolo)}</div><h2 style="margin:4px 0 0">${esc(a.titolo)}</h2></div>
          <a class="btn sun lg" href="#/a/${m.id}/${sez.id}/${a.id}">Vai →</a></div>`;
        break trovato;
      }
    }}
    // Sfida del prof da affrontare
    const libere = CN.sfide.elenco(cat).filter(x => !x.sf.lente && !CN.sfide.storia(s, x.id).some(c => c.stato !== 'bozza')).map(x => Object.assign(x, {L: CN.sfide.sblocco(cat, P, x.sf)}));
    const daFare = libere.find(x => x.L.ok);
    const vicina = libere.filter(x => !x.L.ok).sort((a, b) => b.L.fatti / b.L.tot - a.L.fatti / a.L.tot)[0];
    if(daFare) app.querySelector('#boss').innerHTML = `<a class="card boss-teaser" href="#/sfida/${daFare.id}"><span class="stamp">${esc(daFare.sf.livello || 'Sfida')}</span>
      <div style="flex:1;min-width:0"><div class="small" style="font-weight:800;opacity:.8">Sfida del prof sbloccata · ${esc(daFare.where)}</div><h2 style="margin:2px 0 0">${esc(daFare.sf.titolo)}</h2></div><span class="btn sun">Accetta →</span></a>`;
    else if(vicina) app.querySelector('#boss').innerHTML = `<a class="card boss-teaser locked" href="#/sfide"><span class="stamp">${CN.ico.lucchetto}</span>
      <div style="flex:1;min-width:0"><div class="small" style="font-weight:800;opacity:.8">Prossima sfida del prof · ${esc(vicina.where)}</div><h2 style="margin:2px 0 0">${esc(vicina.sf.titolo)}</h2>
      <div class="small muted">Supera ancora ${vicina.L.tot - vicina.L.fatti} ${vicina.L.tot - vicina.L.fatti === 1 ? 'argomento' : 'argomenti'} per sbloccarla</div></div><span class="btn">Vedi →</span></a>`;
    // Traguardo più vicino
    const vicino = P.badge.filter(b => !b.ok).sort((a,b) => b.cur/b.tot - a.cur/a.tot)[0];
    const ottenuti = P.badge.filter(b => b.ok).length;
    if(vicino) app.querySelector('#trag').innerHTML = `<div class="sec-title"><h2>Prossimo traguardo</h2><a href="#/traguardi" class="small" style="font-weight:800">${ottenuti} di ${P.badge.length} ottenuti →</a></div>
      <div class="trags" style="grid-template-columns:minmax(0,220px)">${CN.adesivo(vicino)}</div>`;
  }

  /* ---------- Sezioni e argomenti di una materia ---------- */
  function sezioneEl(P, m, sez){
    const vis = visibili(sez);
    const ok = vis.filter(a => superato(P, a.id)).length;
    const wrap = CN.h(`<section id="sez-${sez.id}" style="--c:var(--${m.colore||'brand'})"><div class="sec-title"><h2>${esc(sez.titolo)}</h2><span class="badge ${ok === vis.length ? 'ok' : ''}">${ok} / ${vis.length}</span></div><p class="muted">${esc(sez.descrizione||'')}</p><div class="list"></div></section>`);
    const list = wrap.querySelector('.list');
    vis.forEach((a, i) => {
      const b = best(P, a.id), lock = bloccato(P, sez, i);
      const cls = b === null ? '' : b >= P.soglia ? 'done' : 'progress';
      const el = CN.h(`<div class="arg ${cls} ${lock ? 'locked' : ''}" tabindex="0">
        <div class="n">${lock ? CN.ico.lucchetto : i+1}</div>
        <div class="body"><div class="title">${esc(a.titolo)}</div><div class="meta">${esc(a.descrizione||'')} · ${nAtt(a)}${b !== null ? ` · migliore ${b}%` : ''}</div></div>
        ${CN.stelleHtml(CN.stelle(b, P.soglia))}</div>`);
      el.onclick = () => { if(lock){ CN.toast(`Supera prima l'argomento precedente (almeno ${P.soglia}%).`); return; } R.go(`/a/${m.id}/${sez.id}/${a.id}`); };
      el.onkeydown = e => { if(e.key === 'Enter') el.click(); };
      list.appendChild(el);
    });
    return wrap;
  }
  function viewMateria(s, P, mId, gId){
    const m = cat.materie.find(x => x.id === mId); if(!m) return R.go('/');
    const G = macroDi(m), g = gId ? G.find(x => x.id === gId) : null, col = `--c:var(--${m.colore||'brand'})`;
    if(gId && !g) return R.go('/m/' + m.id);
    if(!g){
      // Prima le icone: una scheda per ogni macroargomento della materia
      app.innerHTML = `<div class="crumbs"><a href="#/">Materie</a> › <span>${esc(m.nome)}</span></div>
        <h1><span class="hl">${esc(m.nome)}</span></h1><p class="muted" style="margin-top:-6px">Scegli da quale parte del programma vuoi partire.</p>
        <nav class="macro-cards" aria-label="Parti del programma">${G.map(x => { const c = contaMacro(P, x), pc = c.tot ? Math.round(c.ok / c.tot * 100) : 0;
          const desc = x.sezioni.length > 1 ? x.sezioni.map(z => z.titolo.split(':').slice(1).join(':').trim() || z.titolo).join(' · ').replace(/^./, c => c.toUpperCase()) : (x.sezioni[0].descrizione || '');
          return `<a class="card macro-card" href="#/m/${m.id}/${x.id}" style="${col}">
            <span class="macro-ico">${x.ico}</span><span class="mc-body"><span class="macro-t">${esc(x.titolo)}</span><span class="mc-d">${esc(desc)}</span>
            <span class="mc-foot"><span class="macro-bar"><i style="width:${pc}%"></i></span><span class="macro-n">${c.ok} di ${c.tot}</span></span></span></a>`; }).join('')}</nav>`;
      return;
    }
    // Poi gli argomenti del macroargomento scelto
    app.innerHTML = `<div class="crumbs"><a href="#/">Materie</a> › <a href="#/m/${m.id}">${esc(m.nome)}</a> › <span>${esc(g.titolo)}</span></div>
      <h1 class="macro-h1" style="${col}"><span class="macro-ico">${g.ico}</span><span class="hl">${esc(g.titolo)}</span></h1><div id="sez"></div>`;
    const box = app.querySelector('#sez');
    g.sezioni.forEach(sez => box.appendChild(sezioneEl(P, m, sez)));
  }

  const nAtt = a => { const n = (a.attivita||[]).length, q = (a.esercizi||[]).length; return n ? `${n} attività${q ? ' + quiz lampo' : ''}` : `${q} esercizi`; };

  /* ---------- Argomento: teoria + esercizi ---------- */
  function viewArgomento(s, P, mId, sId, aId, tab){
    const {m, s:sez, a} = CN.findArg(cat, mId, sId, aId);
    if(!a || a.visibile === false) return R.go('/');
    const vis = visibili(sez), idx = vis.findIndex(x => x.id === aId);
    if(bloccato(P, sez, idx)){ CN.toast('Argomento non ancora sbloccato.'); return R.go('/m/' + mId); }
    fuoriQuiz();
    const gr = macroDi(m).find(x => x.sezioni.includes(sez));
    app.innerHTML = `<div class="crumbs"><a href="#/">Materie</a> › <a href="#/m/${m.id}">${esc(m.nome)}</a> › <a href="#/m/${m.id}/${gr ? gr.id : ''}">${esc(gr ? gr.titolo : sez.titolo)}</a>${gr && gr.sezioni.length > 1 ? ` › <span>${esc(sez.titolo.split(':').slice(1).join(':').trim() || sez.titolo)}</span>` : ''}</div>
      <div class="btn-row arg-head" style="justify-content:space-between;margin-bottom:12px"><h1 style="margin:0">${esc(a.titolo)}</h1>${CN.stelleHtml(CN.stelle(best(P, a.id), P.soglia))}</div>
      <div class="tabs">${a.teoria ? '<button data-t="teoria">Teoria</button>' : ''}<button data-t="esercizi">Esercizi (${(a.attivita||[]).length + ((a.esercizi||[]).length ? 1 : 0)})</button><button data-t="storico">I miei tentativi</button></div>
      <div id="pane"></div>`;
    const pane = app.querySelector('#pane');
    const tb = app.querySelectorAll('.tabs button');
    function show(t){
      tb.forEach(b => b.classList.toggle('on', b.dataset.t === t));
      if(t === 'teoria'){
        pane.innerHTML = `<article class="card flat teoria">${a.teoria || '<p class="muted">Nessuna teoria per questo argomento.</p>'}</article>
          <div class="btn-row" style="margin-top:18px"><button class="btn primary lg" id="go">Passa agli esercizi →</button></div>`;
        pane.querySelector('#go').onclick = () => { show('esercizi'); window.scrollTo(0, 0); };
      } else if(t === 'esercizi'){
        menuAttivita(pane, s, m, sez, a);
      } else {
        const rs = CN.risultatiStudente(s).filter(r => r.argomento === a.id).reverse();
        pane.innerHTML = rs.length ? `<div class="tbl-wrap"><table class="tbl"><tr><th>Data</th><th>Esercizio</th><th>Punteggio</th><th>Corrette</th></tr>
          ${rs.map(r => `<tr><td>${new Date(r.data).toLocaleString('it-IT', {dateStyle:'short', timeStyle:'short'})}</td><td style="white-space:normal">${esc(r.attTitolo || (r.ripasso ? 'Ripasso errori' : 'Quiz lampo'))}</td><td><span class="badge ${r.punteggio >= P.soglia ? 'ok' : 'ko'}">${r.punteggio}%</span></td><td class="num">${r.corrette} / ${r.totale}</td></tr>`).join('')}</table></div>`
          : `<p class="muted">Non hai ancora svolto questi esercizi.</p>`;
      }
    }
    tb.forEach(b => b.onclick = async () => {
      if(CN.guardia && CN.guardia()){ if(!await CN.conferma(CN.guardia(), 'Esci')) return; }
      fuoriQuiz(); show(b.dataset.t);
    });
    show(tab || (a.teoria ? 'teoria' : 'esercizi')); // senza teoria (es. Storia) si apre direttamente sugli esercizi
  }

  /* ---------- Menu delle attività di un argomento ---------- */
  function menuAttivita(pane, s, m, sez, a){
    const rs = CN.risultatiStudente(s).filter(r => r.argomento === a.id);
    const P = prof(s);
    const meglio = id => { const v = rs.filter(r => (r.attivita || (r.ripasso ? '' : 'quiz')) === id && !r.ripasso).map(r => r.punteggio); return v.length ? Math.max(...v) : null; };
    const att = a.attivita || [], quiz = a.esercizi || [];
    const lente = CN.sfide.lente(cat, a.id);
    if(!att.length && !quiz.length && !lente){ pane.innerHTML = '<p class="muted">Non ci sono ancora esercizi qui.</p>'; return; }
    const torna = () => viewArgomento(s, prof(s), m.id, sez.id, a.id, 'esercizi');
    const teoria = a.teoria ? () => viewArgomento(s, prof(s), m.id, sez.id, a.id, 'teoria') : null;
    if(!att.length && !lente){ startQuiz(pane, s, {lista: quiz, m, sez, a, modo: 'argomento', esci: teoria || (() => R.go('/m/' + m.id)), teoria}); return; }
    pane.innerHTML = `<p class="muted" style="margin-top:0">Scegli da dove partire. Ogni attività è un esercizio completo: per superare l'argomento basta arrivare al ${P.soglia}% in una di queste.</p><div class="att-grid"></div>`;
    const grid = pane.querySelector('.att-grid');
    const carta = (id, tipo, titolo, info, livello, fn) => {
      const b = meglio(id);
      const el = CN.h(`<div class="card att-card ${b === null ? '' : b >= P.soglia ? 'done' : 'progress'}">
        <div class="att-top"><span class="att-tipo t-${tipo}">${esc(tipo === 'quiz-lampo' ? 'Domande singole' : CN.TIPI[tipo] || tipo)}</span>${livello ? `<span class="att-liv">${esc(livello)}</span>` : ''}</div>
        <h3>${esc(titolo)}</h3><div class="muted small">${info}</div>
        <div class="att-foot">${b === null ? '<span class="muted small">Da fare</span>' : `<span class="badge ${b >= P.soglia ? 'ok' : 'ko'}">migliore ${b}%</span>`}<button class="btn ${b === null ? 'primary' : ''}">${b === null ? 'Inizia' : 'Riprova'} →</button></div></div>`);
      el.querySelector('button').onclick = fn; grid.appendChild(el);
    };
    att.forEach(x => carta(x.id, x.tipo, x.titolo || CN.TIPI[x.tipo], (x.tipo === 'versione' ? `${(x.frasi||[]).length} frasi guidate, passo per passo` : `${CN.attivita.conta(x)} ${CN.attivita.UNITA[x.tipo] || 'elementi'}`), x.livello,
      () => { startQuiz(pane, s, {lista: [x], att: x, m, sez, a, modo: 'argomento', esci: torna, teoria}); window.scrollTo(0, 0); }));
    if(quiz.length) carta('quiz', 'quiz-lampo', 'Quiz lampo', `${quiz.length} domande veloci, una alla volta`, '', () => { startQuiz(pane, s, {lista: quiz, m, sez, a, modo: 'argomento', esci: torna, teoria}); window.scrollTo(0, 0); });
    if(lente){
      // Sotto la lente: prova aperta in fondo all'argomento, corretta dalla prof (stesso percorso delle sfide)
      const st = CN.sfide.storia(s, lente.id), last = st[st.length - 1];
      const cta = !last ? 'Inizia' : last.stato === 'bozza' ? 'Continua' : 'Rivedi';
      const el = CN.h(`<a class="card att-card lente-card ${st.some(c => c.stato !== 'bozza') ? 'done' : ''}" href="#/sfida/${lente.id}">
        <div class="att-top"><span class="att-tipo t-lente">${CN.ico.lente} Sotto la lente</span><span class="att-liv">corregge la prof</span></div>
        <h3>${esc(lente.sf.titolo)}</h3><div class="muted small">${(lente.sf.prove||[]).length} ${(lente.sf.prove||[]).length === 1 ? 'prova aperta' : 'prove aperte'} · conta per le medaglie delle sfide · non conta per superare l'argomento</div>
        <div class="att-foot">${CN.sfide.statoHtml(last)}<span class="btn ${last ? '' : 'primary'}">${cta} →</span></div></a>`);
      grid.appendChild(el);
    }
  }

  /* ---------- Motore dell'allenamento (argomento o ripasso) ---------- */
  const TITOLI = {'ripasso-errori': 'Ripasso: i miei errori', 'ripasso-misto': 'Ripasso: mix veloce'};
  function startQuiz(pane, s, cfg){
    const lista = cfg.lista;
    if(!lista.length){ pane.innerHTML = '<p class="muted">Non ci sono ancora esercizi qui.</p>'; return; }
    let i = 0, punti = 0, nTot = 0, nOk = 0, toccato = false; const esiti = []; const t0 = Date.now();
    document.body.classList.add('in-quiz');
    CN.guardia = () => (toccato || i > 0) ? 'Hai un allenamento a metà: se esci, le risposte date finora non vengono salvate.' : null;
    function step(){
      const es = lista[i];
      pane.innerHTML = (cfg.att ? `<div class="quiz-head att-head"><h2 style="margin:0">${esc(cfg.att.titolo || CN.TIPI[cfg.att.tipo])}</h2><span class="small muted" style="font-weight:800">${CN.attivita.conta(cfg.att)} ${esc(CN.attivita.UNITA[cfg.att.tipo] || '')}</span></div>`
        : `<div class="quiz-head"><span class="small muted" style="font-weight:800">${i+1} / ${lista.length}</span><div class="bar"><i style="width:${i/lista.length*100}%"></i></div></div>`) + `
        <div class="card" id="exbox"></div>
        <div class="quiz-foot"><button class="btn ghost" id="esci">Esci</button><button class="btn primary lg" id="act" disabled>Verifica</button></div>`;
      const act = pane.querySelector('#act');
      let checked = false;
      const el = CN.renderEsercizio(es, {onChange: () => { act.disabled = false; toccato = true; }, onEnter: () => act.click(), focus: true});
      pane.querySelector('#exbox').appendChild(el);
      pane.querySelector('#esci').onclick = async () => { if(!CN.guardia() || await CN.conferma('Vuoi uscire? Questo allenamento non verrà salvato.', 'Esci')){ fuoriQuiz(); cfg.esci(); } };
      act.onclick = () => {
        if(!checked){
          const r = el.verifica();
          if(!r){ CN.toast('Completa la risposta prima di verificare.'); return; }
          checked = true; punti += r.punti; esiti.push({id: es.id, p: Math.round(r.punti * 100) / 100});
          nTot += r.n || 1; nOk += r.n ? r.ok : (r.punti >= .999 ? 1 : 0);
          act.textContent = i < lista.length-1 ? 'Avanti →' : 'Vedi il risultato';
          const bar = pane.querySelector('.quiz-head .bar > i'); if(bar) bar.style.width = ((i+1)/lista.length*100) + '%';
          el.scrollIntoView({block: 'nearest'}); act.scrollIntoView({block: 'nearest'});
        } else { i++; if(i < lista.length){ step(); window.scrollTo(0, 0); } else fine(); }
      };
    }
    function fine(){
      fuoriQuiz();
      const perc = Math.round(punti / lista.length * 100);
      const corrette = esiti.filter(e => e.p >= 0.999).length;
      const errori = esiti.filter(e => e.p < 0.999).map(e => e.id);
      const ripasso = cfg.modo !== 'argomento';
      const prima = prof(s);
      const rec = { id: CN.uid('r'), nome: s.nome, classe: s.classe, materia: cfg.m ? cfg.m.id : null, sezione: cfg.sez ? cfg.sez.id : null, argomento: cfg.a ? cfg.a.id : null,
        argTitolo: cfg.a ? cfg.a.titolo : TITOLI[cfg.modo], punteggio: perc, corrette: nOk, totale: nTot, errori, esiti, ripasso, modo: cfg.modo,
        data: new Date().toISOString(), durata: Math.round((Date.now() - t0) / 1000) };
      if(cfg.att){ rec.attivita = cfg.att.id; rec.attTitolo = cfg.att.titolo || CN.TIPI[cfg.att.tipo]; }
      else if(cfg.a && cfg.modo === 'argomento'){ rec.attivita = 'quiz'; rec.attTitolo = 'Quiz lampo'; }
      CN.addRisultato(rec);
      const P = prof(s); header(s, P, R.cur);
      const guadagno = Math.max(0, P.xp - prima.xp);
      // record personale su questa stessa attività (solo allenamenti dell'argomento)
      const precedenti = ripasso ? [] : prima.rs.filter(r => !r.ripasso && r.argomento === rec.argomento && (r.attivita || 'quiz') === (rec.attivita || 'quiz')).map(r => r.punteggio);
      const record = precedenti.length ? Math.max(...precedenti) : null;
      const notaXp = record === null ? '' : perc > record ? `<p style="font-weight:800;margin:0">Nuovo record personale! Prima avevi ${record}%.</p>`
        : `<p class="muted small" style="margin:0">Il tuo record qui è ${record}%: battilo per avere i punti pieni (rifare senza migliorare vale un quarto dei punti).</p>`;
      const nuovi = P.badge.filter(b => b.ok && !prima.badge.find(x => x.id === b.id && x.ok));
      const salito = P.livello.n > prima.livello.n;
      const ok = perc >= P.soglia;
      const sbloccate = CN.sfide.elenco(cat).filter(x => !x.sf.lente && CN.sfide.sblocco(cat, P, x.sf).ok && !CN.sfide.sblocco(cat, prima, x.sf).ok);
      const msg = perc === 100 ? 'Perfetto!' : perc >= 90 ? 'Quasi perfetto!' : ok ? (ripasso ? 'Bel ripasso!' : 'Argomento superato!')
        : perc >= P.soglia - 15 ? `Ci sei quasi: ti mancano pochi punti per il ${P.soglia}%.`
        : perc >= 30 ? (ripasso ? 'Questi sono ancora difficili: ripassali con calma.' : (cfg.teoria ? 'Non ancora: rileggi la teoria e riprova.' : 'Non ancora: guarda bene le correzioni e riprova.'))
        : (ripasso ? 'Ripasso in salita: rileggi le spiegazioni e riprova.' : (cfg.teoria ? 'Partenza in salita: riparti dalla teoria, poi riprova.' : 'Partenza in salita: riguarda il libro e le correzioni, poi riprova.'));
      const debole = !ok && perc < P.soglia - 15;
      pane.innerHTML = `<div class="card" style="text-align:center">
        ${cfg.modo === 'argomento' ? CN.stelleHtml(CN.stelle(perc, P.soglia), true) : ''}
        <div class="score-big" style="margin-top:8px">${perc}%</div>
        <h2 style="margin-top:6px">${msg}</h2>
        <p class="muted" style="margin:0">${cfg.att ? `${nOk} su ${nTot} giuste · ${esc(rec.attTitolo)}` : corrette === 1 ? '1 esercizio tutto giusto su ' + lista.length + '.' : corrette + ' esercizi tutti giusti su ' + lista.length + '.'}</p>
        ${guadagno ? `<div class="xp-gain pop">+${guadagno} XP</div>` : '<div style="height:10px"></div>'}
        ${notaXp}
        ${salito ? `<p style="font-weight:800;margin:4px 0 0">Nuovo livello: ${P.livello.n} · <span class="hl">${P.livello.nome}</span></p>` : ''}
        ${nuovi.length ? `<h3 style="margin-top:18px">${nuovi.length > 1 ? 'Nuovi traguardi' : 'Nuovo traguardo'}</h3><div class="trags mini" style="justify-content:center;grid-template-columns:repeat(auto-fit,minmax(120px,160px))">${nuovi.map(b => CN.adesivo(b, true)).join('')}</div>` : ''}
        ${sbloccate.map(x => `<a class="card boss-teaser pop" href="#/sfida/${x.id}" style="text-align:left"><span class="stamp">${esc(x.sf.livello || 'Sfida')}</span><div style="flex:1;min-width:0"><div class="small" style="font-weight:800;opacity:.8">Nuova sfida del prof sbloccata!</div><h2 style="margin:2px 0 0">${esc(x.sf.titolo)}</h2></div><span class="btn sun">Accetta →</span></a>`).join('')}
        <div class="btn-row" style="justify-content:center;margin-top:20px" id="b"></div></div>`;
      const b = pane.querySelector('#b');
      const add = (html, fn) => { const x = CN.h(html); if(fn) x.onclick = fn; b.appendChild(x); return x; };
      if(cfg.a){
        const vis = visibili(cfg.sez); const nx = vis[vis.findIndex(x => x.id === cfg.a.id) + 1];
        if(nx && superato(P, cfg.a.id)) add(`<a class="btn primary" href="#/a/${cfg.m.id}/${cfg.sez.id}/${nx.id}">Prossimo: ${esc(nx.titolo)} →</a>`);
        if(errori.length && !cfg.att) add(`<button class="btn accent">Ripassa gli errori (${errori.length})</button>`, () => startQuiz(pane, s, Object.assign({}, cfg, {lista: lista.filter(e => errori.includes(e.id)), modo: 'errori'})));
        add(`<button class="btn">${cfg.att ? 'Riprova' : 'Ricomincia'}</button>`, () => { startQuiz(pane, s, Object.assign({}, cfg, {lista: cfg.att ? [cfg.att] : cfg.a.esercizi, modo: 'argomento'})); window.scrollTo(0, 0); });
        add(`<button class="btn ${nx && superato(P, cfg.a.id) || debole ? '' : 'primary'}">Altre attività</button>`, cfg.esci);
        if(cfg.teoria) add(`<button class="btn ${debole ? 'primary' : 'ghost'}">Rivedi la teoria</button>`, cfg.teoria);
      } else {
        add(`<a class="btn primary" href="#/ripasso">Torna al ripasso</a>`, e => { e.preventDefault(); e.stopPropagation(); R.refresh(); });
        add(`<a class="btn ghost" href="#/progressi">Vedi i progressi</a>`);
      }
      window.scrollTo(0, 0);
      if(ok || sbloccate.length) coriandoli();
    }
    step();
  }

  function fuoriQuiz(){ CN.guardia = null; document.body.classList.remove('in-quiz'); document.querySelectorAll('#confetti').forEach(c => c.remove()); }
  function coriandoli(){
    if(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const c = document.createElement('canvas'); c.id = 'confetti'; document.body.appendChild(c);
    const x = c.getContext('2d'); const W = c.width = innerWidth, H = c.height = innerHeight;
    const col = ['#ffd83a','#ff5a93','#1fc98a','#33aaff','#ff8f3f','#5a3cf0'];
    const ps = Array.from({length: 90}, () => ({x: W/2 + (Math.random()-.5)*W*.5, y: H*.35, vx: (Math.random()-.5)*11, vy: -Math.random()*12-3, r: 4+Math.random()*5, c: col[Math.floor(Math.random()*col.length)], a: Math.random()*6}));
    let t = 0;
    (function tick(){
      x.clearRect(0, 0, W, H);
      ps.forEach(p => { p.vy += .32; p.x += p.vx; p.y += p.vy; p.a += .2; x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.c; x.fillRect(-p.r, -p.r/2, p.r*2, p.r); x.restore(); });
      if(++t < 110) requestAnimationFrame(tick); else c.remove();
    })();
  }

  /* ---------- Ripasso ---------- */
  function viewRipasso(s, P){
    const giorniFa = d => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
    const righe = [...P.args.entries()].filter(([id]) => P.idx.arg.has(id)).map(([id, a]) => Object.assign({id, x: P.idx.arg.get(id)}, a));
    const rinfresca = righe.filter(r => CN.stelle(r.best, P.soglia) >= 2 && giorniFa(r.data) >= 7).sort((a,b) => (a.data||'').localeCompare(b.data||'')).slice(0, 5);
    const deboli = righe.filter(r => CN.stelle(r.best, P.soglia) < 2).sort((a,b) => a.best - b.best).slice(0, 5);
    const D = CN.daRipassare(P, 12);
    const pool = righe.flatMap(r => r.x.a.esercizi || []);
    const debole = deboli[0];
    const link = r => `#/a/${r.x.m.id}/${r.x.s.id}/${r.id}`;
    const riga = (r, meta) => `<a class="arg ${r.best >= P.soglia ? 'done' : 'progress'}" href="${link(r)}" style="text-decoration:none;color:inherit"><div class="n">${r.best}</div><div class="body"><div class="title">${esc(r.x.a.titolo)}</div><div class="meta">${esc(r.x.s.titolo)} · ${meta}</div></div>${CN.stelleHtml(CN.stelle(r.best, P.soglia))}</a>`;
    app.innerHTML = `<section class="hero"><h1><span class="hl">Ripasso</span></h1><p class="muted">Poco e spesso funziona meglio di tanto e una volta sola. Scegli come ripassare oggi.</p></section>
      <div id="pane"><div class="grid cols-3">
        <div class="card mode"><div class="tagc" style="background:var(--pink)">${D.lista.length}</div><h3>I miei errori</h3>
          <p class="muted small">${D.lista.length ? `Una sessione breve con gli esercizi che hai sbagliato e quelli che non rivedi da più di due settimane. Quando li azzecchi, escono dalla lista.` : !P.rs.length ? 'Qui ritroverai gli esercizi sbagliati e quelli da rivedere: prima fai qualche allenamento.' : 'Niente da ripassare: nessun errore in sospeso e hai rivisto tutto di recente. Torna fra qualche giorno, o prova il mix veloce.'}</p>
          ${D.lista.length ? `<p class="small" style="margin:-4px 0 10px;font-weight:700">${[D.conta.errore ? `${D.conta.errore} ${D.conta.errore === 1 ? 'errore' : 'errori'}` : '', D.conta.debole ? `${D.conta.debole} da argomenti non ancora superati` : '', D.conta.vecchio ? `${D.conta.vecchio} da rinfrescare` : ''].filter(Boolean).join(' · ')}</p>` : ''}
          <button class="btn accent" id="err" ${D.lista.length ? '' : 'disabled'}>${D.lista.length ? 'Ripassa i miei errori' : 'Nessun errore in sospeso'}</button></div>
        <div class="card mode"><div class="tagc" style="background:var(--yellow)">10</div><h3>Mix veloce</h3>
          <p class="muted small">Dieci esercizi a sorpresa, pescati dagli argomenti che hai già fatto.</p>
          <button class="btn sun" id="mix" ${pool.length ? '' : 'disabled'}>${pool.length ? 'Inizia il mix' : 'Completa prima un argomento'}</button></div>
        <div class="card mode"><div class="tagc" style="background:var(--blue)">${debole ? debole.best : '?'}</div><h3>Punto debole</h3>
          <p class="muted small">${debole ? `Il tuo punteggio più basso è in «${esc(debole.x.a.titolo)}»: ${debole.best}%.` : 'Qui comparirà l\'argomento su cui hai il punteggio più basso.'}</p>
          ${debole ? `<a class="btn" href="${link(debole)}">Allenati su questo</a>` : '<button class="btn" disabled>Ancora nessun dato</button>'}</div>
      </div>
      <div class="sec-title"><h2>Da rinfrescare</h2><span class="small muted">fatti bene, ma più di una settimana fa</span></div>
      ${rinfresca.map(r => riga(r, `${giorniFa(r.data)} giorni fa`)).join('') || '<p class="muted">Niente da rinfrescare per ora: gli argomenti fatti bene tornano qui dopo una settimana.</p>'}
      <div class="sec-title"><h2>Da rinforzare</h2><span class="small muted">meno di due stelle</span></div>
      ${deboli.map(r => riga(r, `${r.n} ${r.n === 1 ? 'tentativo' : 'tentativi'}`)).join('') || '<p class="muted">Nessun argomento da rinforzare. Ottimo lavoro.</p>'}
      </div>`;
    const pane = app.querySelector('#pane');
    const via = (lista, modo) => { pane.innerHTML = ''; startQuiz(pane, s, {lista, modo, esci: () => R.refresh()}); window.scrollTo(0, 0); };
    app.querySelector('#err').onclick = () => via(D.lista, 'ripasso-errori');
    app.querySelector('#mix').onclick = () => via(CN.shuffle(pool).slice(0, 10), 'ripasso-misto');
  }

  /* ---------- Sfide del prof ---------- */
  const SF = CN.sfide;
  const dataBreve = d => new Date(d).toLocaleString('it-IT', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'});
  function cartaSfida(s, x, P){
    const st = SF.storia(s, x.id), last = st[st.length - 1];
    const L = SF.sblocco(cat, P, x.sf);
    if(!L.ok && !st.length){
      const nomi = L.mancano.slice(0, 4).map(y => esc(y.a.titolo)).join(' · ') + (L.mancano.length > 4 ? ` e altri ${L.mancano.length - 4}` : '');
      const el = CN.h(`<div class="card boss-card locked" tabindex="0">
        <div class="boss-top"><span class="stamp">${CN.ico.lucchetto} bloccata</span><span class="badge">${L.fatti} di ${L.tot}</span></div>
        <h2>${esc(x.sf.titolo)}</h2><div class="small muted">${esc(x.where)}</div>
        <div class="bar" style="max-width:none;margin-top:8px"><i style="width:${Math.round(L.fatti / Math.max(1, L.tot) * 100)}%"></i></div>
        <div class="small" style="margin-top:6px"><b>Per sbloccarla supera:</b> ${nomi}</div></div>`);
      el.onclick = () => CN.toast(`Supera ancora ${L.mancano.length} ${L.mancano.length === 1 ? 'argomento' : 'argomenti'} (almeno ${P.soglia}%) per sbloccare questa sfida.`);
      el.onkeydown = e => { if(e.key === 'Enter') el.click(); };
      return el;
    }
    const cta = !last ? 'Accetta la sfida' : last.stato === 'bozza' ? 'Continua la sfida' : 'Rivedi la consegna';
    const el = CN.h(`<a class="card boss-card" href="#/sfida/${x.id}">
      <div class="boss-top"><span class="stamp">${esc(x.sf.livello || 'Sfida')}</span>${SF.statoHtml(last)}</div>
      <h2>${esc(x.sf.titolo)}</h2>
      <div class="small muted">${esc(x.where)}</div>
      <div class="boss-meta"><span>${x.sf.versione ? ((x.sf.prove||[])[0]||{frasi:[]}).frasi.length + ' frasi a tappe' : (x.sf.prove||[]).length + ' prove'}</span></div>
      <div class="boss-foot"><span class="small muted">${last && last.stato !== 'bozza' ? 'La correzione arriva per email' : 'Corretta dalla prof'}</span><span class="btn primary sm">${cta} →</span></div></a>`);
    return el;
  }
  function viewSfide(s, P){
    // Le prove «Sotto la lente» non sono più elencate qui: si aprono in fondo agli esercizi del loro argomento
    const tutteSf = SF.elenco(cat), L = tutteSf.filter(x => !x.sf.lente && !x.sf.versione), VV = tutteSf.filter(x => x.sf.versione);
    const R1 = SF.riepilogo(SF.diStudente(s));
    app.innerHTML = `<section class="hero"><h1>Le sfide del <span class="hl">prof</span></h1>
      <p class="muted">Esercizi tosti, senza soluzione automatica: li corregge la tua insegnante e ti manda la correzione per email. Ogni sfida consegnata ti avvicina a una nuova medaglia.</p></section>
      <div class="steps3">
        <div><b>1</b><span><strong>Affronta</strong> le prove: le risposte si salvano da sole, puoi riprendere quando vuoi.</span></div>
        <div><b>2</b><span><strong>Consegna</strong> e manda il file alla prof (puoi anche lasciarle un messaggio).</span></div>
        <div><b>3</b><span><strong>Ricevi la correzione</strong> della prof per email e conquista le medaglie: 1, 3, 5 e 10 sfide.</span></div>
      </div>
      <div class="sec-title"><h2>Le sfide</h2><span class="small muted" style="flex:1;margin-left:10px">${L.filter(x => SF.sblocco(cat, P, x.sf).ok).length} sbloccate su ${L.length}</span>${R1.consegnate ? `<span class="badge ok">${R1.consegnate} ${R1.consegnate === 1 ? 'consegnata' : 'consegnate'}</span>` : ''}</div>
      <div class="grid cols-2" id="L"></div>
      ${VV.length ? `<div class="sec-title" style="margin-top:26px"><h2>Versioni</h2><span class="small muted" style="flex:1;margin-left:10px">si traduce una frase alla volta, con l'aiuto che cala · ${VV.filter(x => SF.sblocco(cat, P, x.sf).ok).length} sbloccate su ${VV.length}</span></div><div class="grid cols-2" id="VV"></div>` : ''}
      ${tutteSf.some(x => x.sf.lente) ? `<p class="small muted" style="margin-top:22px">${CN.ico.lente} Le prove «Sotto la lente» le trovi in fondo agli esercizi dei singoli argomenti.</p>` : ''}
      <div class="sec-title" style="margin-top:26px"><h2>Le tue medaglie</h2><a class="small" href="#/traguardi">tutti i traguardi →</a></div>${CN.medaglieSfide(P)}`;
    const box = app.querySelector('#L');
    if(!L.length) box.innerHTML = '<p class="muted">Ancora nessuna sfida: arriveranno presto.</p>';
    L.forEach(x => box.appendChild(cartaSfida(s, x, P)));
    VV.forEach(x => app.querySelector('#VV').appendChild(cartaSfida(s, x, P)));
  }
  function viewSfida(s, P, id){
    const x = SF.elenco(cat).find(y => y.id === id);
    if(!x) return R.go('/sfide');
    const sf = x.sf;
    const st = SF.storia(s, id);
    if(!st.length && !SF.sblocco(cat, P, sf).ok){ CN.toast('Questa sfida non è ancora sbloccata.'); return R.go('/sfide'); }
    let c = st[st.length - 1];
    const nuova = !c;
    if(!c) c = SF.nuovaBozza(s, x);
    const edit = c.stato === 'bozza';
    const argL = sf.lente && CN.indice(cat).arg.get(sf.argomento);
    app.innerHTML = `<div class="crumbs">${argL ? `<a href="#/a/${argL.m.id}/${argL.s.id}/${argL.a.id}">${esc(argL.a.titolo)}</a> › <span>Sotto la lente</span>` : `<a href="#/sfide">Sfide</a> › <span>${esc(x.where)}</span>`}</div>
      <section class="card boss-head"><span class="stamp big">${esc(sf.livello || 'Sfida')}</span>
        <h1>${esc(sf.titolo)}</h1>
        <div class="boss-meta"><span>${esc(x.where)}</span><span>${(sf.prove||[]).length} prove</span>${c.tentativo > 1 ? `<span>tentativo ${c.tentativo}</span>` : ''}</div>
        <div class="teoria intro">${sf.intro || ''}</div></section>
      <div id="stato"></div><div id="prove"></div><div id="fondo"></div>`;
    const stato = app.querySelector('#stato'), prove = app.querySelector('#prove'), fondo = app.querySelector('#fondo');
    if(c.stato !== 'bozza'){
      stato.innerHTML = `<div class="notice"><b>Consegnata il ${dataBreve(c.inviata)}.</b> La prof la correggerà e ti manderà la correzione per email. Se non le hai ancora mandato il file, <a href="#" id="redl">mandalo di nuovo</a>.</div>`;
      stato.querySelector('#redl').onclick = e => { e.preventDefault(); inviaAllaProf(s, sf.titolo); };
    }
    let timer = null;
    const salva = () => { clearTimeout(timer); timer = setTimeout(() => { c.salvata = new Date().toISOString(); SF.salvaConsegna(c); const t = app.querySelector('#saved'); if(t) t.textContent = 'Bozza salvata alle ' + new Date().toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit'}); }, 300); };
    (sf.prove||[]).forEach((p, i) => {
      c.risposte[i] = c.risposte[i] || {};
      const card = CN.h(`<section class="card prova"><div class="prova-h"><span class="pn">Prova ${i + 1}</span><span class="badge">${esc(SF.TIPI_PROVA[p.tipo] || p.tipo)}</span></div>
        <h2>${esc(p.titolo || '')}</h2><div class="ex-q">${p.consegna || ''}</div></section>`);
      card.appendChild(SF.renderProva(p, c.risposte[i], edit ? 'edit' : 'view', salva));
      prove.appendChild(card);
    });
    if(edit){
      fondo.innerHTML = `<section class="card flat" style="margin-top:16px"><label class="f" for="nota">Un messaggio per la prof (facoltativo)</label>
        <textarea id="nota" rows="3" placeholder="Un dubbio, una domanda, che cosa hai trovato difficile…"></textarea>
        <div class="btn-row" style="justify-content:space-between;margin-top:14px"><span class="small muted" id="saved">${nuova ? 'Le risposte si salvano da sole mentre scrivi.' : c.salvata ? 'Bozza salvata il ' + dataBreve(c.salvata) : ''}</span><button class="btn primary lg" id="send">Consegna alla prof</button></div></section>`;
      const nota = fondo.querySelector('#nota'); nota.value = c.nota || ''; nota.oninput = () => { c.nota = nota.value; salva(); };
      fondo.querySelector('#send').onclick = async () => {
        const manca = SF.mancanti(sf, c.risposte);
        const msg = manca.length ? `${manca.length === 1 ? 'La prova ' + manca[0] + ' sembra incompleta' : 'Le prove ' + manca.join(', ') + ' sembrano incomplete'}. Vuoi consegnare lo stesso?`
          : 'Dopo la consegna non potrai più cambiare le risposte (dopo la correzione della prof potrai rimandarla). Consegni?';
        if(!await CN.conferma(msg, 'Consegna')) return;
        clearTimeout(timer);
        c.stato = 'inviata'; c.inviata = new Date().toISOString(); SF.salvaConsegna(c);
        R.refresh();
        inviaAllaProf(s, sf.titolo);
      };
    } else {
      fondo.innerHTML = `<div class="card flat" style="margin-top:16px;display:flex;gap:14px;align-items:center;flex-wrap:wrap"><div style="flex:1;min-width:220px"><h3>Hai ricevuto la correzione?</h3><p class="muted small" style="margin:0">Se la prof te lo chiede, puoi correggere le tue risposte e rimandare la sfida.</p></div><button class="btn accent" id="again">Correggi e rinvia</button></div>`;
      fondo.querySelector('#again').onclick = () => { const b = SF.nuovaBozza(s, x, c); SF.salvaConsegna(b); R.refresh(); window.scrollTo(0, 0); };
    }
  }

  /* ---------- Traguardi ---------- */
  function viewTraguardi(s, P){
    const altri = P.badge.filter(b => b.gruppo !== 'sfide');
    const si = altri.filter(b => b.ok), no = altri.filter(b => !b.ok).sort((a,b) => b.cur/b.tot - a.cur/a.tot);
    app.innerHTML = `<section class="hero"><h1><span class="hl">Traguardi</span></h1><p class="muted">Ogni allenamento vale punti esperienza. Con i punti sali di livello, con la costanza conquisti gli adesivi.</p></section>
      <div class="grid cols-2">${cartaLivello(P)}
        <div class="card"><h3>Come si guadagnano i punti</h3><ul class="small" style="margin:6px 0 0;padding-left:18px"><li>10 XP per ogni esercizio giusto</li><li>20 XP in più la prima volta che fai 100% in un'attività</li><li>Rifare un'attività vale punti pieni solo se batti il tuo record; altrimenti un quarto</li><li>Nel ripasso: 5 XP per esercizio giusto, 10 se correggi un tuo errore; 1 se l'hai già azzeccato oggi</li><li>Il ripasso dà al massimo 100 XP al giorno: poi ogni esercizio giusto vale 1 XP</li></ul>
        <div class="small muted" style="margin-top:8px">Livelli: ${CN.LIVELLI.map((l, i) => i + 1 === P.livello.n ? `<b>${l[1]}</b>` : l[1]).join(' → ')}</div></div></div>
      <div class="sec-title"><h2>Medaglie delle sfide</h2><span class="small muted">${P.sfide.consegnate} ${P.sfide.consegnate === 1 ? 'sfida consegnata' : 'sfide consegnate'}</span></div>${CN.medaglieSfide(P)}
      <div class="sec-title"><h2>Ottenuti</h2><span class="badge ok">${si.length} di ${altri.length}</span></div>
      ${si.length ? `<div class="trags">${si.map(b => CN.adesivo(b)).join('')}</div>` : '<p class="muted">Ancora nessuno: il primo arriva completando un allenamento.</p>'}
      ${no.length ? `<div class="sec-title"><h2>Da conquistare</h2></div><div class="trags">${no.map(b => CN.adesivo(b)).join('')}</div>` : ''}`;
  }

  /* ---------- Progressi ---------- */
  // Il file con TUTTI i progressi salvati su questo dispositivo (allenamenti, ripasso, sfide consegnate).
  // È un .txt (con dentro i dati) perché i telefoni lo condividono senza problemi con Mail e Gmail.
  function fileProgressi(s){
    const ora = new Date();
    const data = {tipo: 'carpe-notes-risultati', versione: 3, studente: {nome: s.nome, classe: s.classe}, esportato: ora.toISOString(), risultati: CN.risultatiStudente(s), sfide: CN.sfide.inviate(s)};
    const nome = `CarpeNotes_${s.classe}_${s.nome}_${ora.toISOString().slice(0, 10)}`.replace(/[^\w-]+/g, '_') + '.txt';
    return {nome, testo: JSON.stringify(data, null, 1)};
  }
  const esporta = s => inviaAllaProf(s);
  // Finestra «Manda alla prof»: sul telefono apre la condivisione (Mail, Gmail…) con il file già allegato;
  // sul computer scarica il file e apre una nuova email già indirizzata alla prof.
  function inviaAllaProf(s, sfida){
    const f = fileProgressi(s);
    const oggetto = `Carpe Notes · ${s.nome} (${s.classe})` + (sfida ? ` · sfida «${sfida}»` : ' · progressi');
    const corpo = `Ciao prof,\n${sfida ? `ho consegnato la sfida «${sfida}». ` : ''}Ti mando il file con tutti i miei progressi su Carpe Notes.\n\n${s.nome}, ${s.classe}`;
    let file = null;
    try{ file = new File([f.testo], f.nome, {type: 'text/plain'}); }catch(e){}
    const telefono = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    const condividi = !!(telefono && file && navigator.canShare && navigator.canShare({files: [file]}));
    const scarica = () => { try{ const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([f.testo], {type: 'text/plain'})); a.download = f.nome; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }catch(e){ CN.download(f.nome, f.testo, 'text/plain'); } };
    const mailto = () => { location.href = `mailto:?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(corpo + '\n\n(Allego il file ' + f.nome + ')')}`; };
    const bg = CN.modale(`<h3>${sfida ? 'Sfida consegnata! Ora mandala alla prof' : 'Manda i tuoi progressi alla prof'}</h3>
      <p class="muted small">Nel file ci sono tutti i progressi salvati su questo dispositivo${sfida ? ', compresa la sfida che hai appena consegnato' : ''}. La prof lo apre nella sua area e ${sfida ? 'ti manda la correzione' : 'vede andamento e traguardi'}.</p>
      <p class="small" id="passo" style="margin:8px 0">${condividi ? 'Tocca «Invia per email» e scegli Mail o Gmail: il file è già allegato. Scrivi l\'indirizzo della prof e invia.' : 'Premi «Invia per email»: il file si scarica e si apre una nuova email. Scrivi l\'indirizzo della prof, allega il file (lo trovi in Download) e premi Invia.'}</p>
      <p class="hint" style="margin:4px 0 0">Nome del file: ${esc(f.nome)}</p>
      <div class="btn-row" style="justify-content:flex-end;margin-top:14px"><button class="btn ghost" data-chiudi>${sfida ? 'Lo mando dopo' : 'Chiudi'}</button><button class="btn" data-scarica>Scarica il file</button><button class="btn primary" data-invia>Invia per email</button></div>`);
    const chiudi = () => bg.remove();
    bg.querySelector('[data-chiudi]').onclick = chiudi;
    bg.onclick = e => { if(e.target === bg) chiudi(); };
    bg.querySelector('[data-scarica]').onclick = () => { scarica(); CN.toast('File scaricato: allegalo a un\'email per la prof'); };
    bg.querySelector('[data-invia]').onclick = async () => {
      if(condividi){
        try{ await navigator.share({files: [file], title: oggetto, text: corpo}); chiudi(); CN.toast('Fatto! Controlla che l\'email sia partita.'); return; }
        catch(e){ if(e && e.name === 'AbortError') return; }
      }
      scarica(); mailto();
      bg.querySelector('#passo').innerHTML = `<b>Ultimo passo:</b> nell'email che si è aperta scrivi l'indirizzo della prof, allega il file <b>${esc(f.nome)}</b> (è nella cartella Download) e premi Invia. Se l'email non si è aperta, scrivi tu alla prof e allega il file.`;
    };
  }
  function viewProgressi(s, P){
    app.innerHTML = `<section class="hero"><h1>I miei <span class="hl">progressi</span></h1><p class="muted">Livello ${P.livello.n} · ${P.livello.nome} · ${P.xp} XP · ${P.badge.filter(b => b.ok).length} traguardi</p></section>
      <div id="an"></div>
      <div class="card flat" style="margin-top:22px;display:flex;gap:14px;align-items:center;flex-wrap:wrap"><div style="flex:1;min-width:220px"><h3>Mostra i progressi alla tua insegnante</h3><p class="muted small" style="margin:0">La docente vede queste stesse statistiche quando le consegni il file dei risultati.</p></div><button class="btn primary" id="exp">Manda i progressi alla prof</button></div>`;
    CN.renderAnalitiche(app.querySelector('#an'), CN.risultatiStudente(s), cat, CN.sfide.diStudente(s));
    app.querySelector('#exp').onclick = () => esporta(s);
  }

  /* ---------- Profilo ---------- */
  function viewProfilo(s, P){
    const rs = P.rs.slice().reverse();
    app.innerHTML = `<div class="crumbs"><a href="#/">Materie</a> › <span>Il mio profilo</span></div>
      <h1>${esc(s.nome)} <span class="muted" style="font-size:.55em">${esc(s.classe)}</span></h1>
      <div class="card" style="margin:16px 0">
        <h3>Consegna i risultati alla docente</h3>
        <p class="muted small">I tuoi progressi sono salvati solo su questo dispositivo. Mandali per email alla tua insegnante: lei apre il file nella sua area e vede andamento e traguardi.</p>
        <div class="btn-row"><button class="btn primary" id="exp">Manda i progressi alla prof</button><button class="btn ghost danger" id="out">Cambia studente</button></div>
      </div>
      <div class="sec-title"><h2>Tutti gli allenamenti</h2></div>
      ${rs.length ? `<div class="tbl-wrap"><table class="tbl"><tr><th>Data</th><th>Allenamento</th><th>Punteggio</th><th>Corrette</th><th>XP</th></tr>
        ${rs.map(r => `<tr><td>${new Date(r.data).toLocaleDateString('it-IT')}</td><td>${esc(r.argTitolo)}${r.modo === 'errori' ? ' <span class="badge">errori</span>' : ''}</td><td><span class="badge ${r.punteggio >= P.soglia ? 'ok' : 'ko'}">${r.punteggio}%</span></td><td class="num">${r.corrette}/${r.totale}</td><td class="num">+${CN.xpDi(r)}</td></tr>`).join('')}
        </table></div>` : '<p class="muted">Nessun allenamento ancora.</p>'}`;
    app.querySelector('#exp').onclick = () => esporta(s);
    app.querySelector('#out').onclick = async () => { if(await CN.conferma('Vuoi uscire? I risultati restano salvati su questo dispositivo. Per rientrare ti servirà di nuovo il tuo link della prof.', 'Esci')){ CN.logoutStudente(); R.go('/'); } };
  }

  /* ---------- Router ---------- */
  function route(path){
    cat = CN.catalog();
    fuoriQuiz();
    const s = CN.studente();
    const p0 = path.replace(/^\//, '').split('/');
    if(p0[0] === 'invito' && p0[1]) return viewInvito(p0[1]);
    if(!s){ header(null); return viewLogin(); }
    if(!s.anteprima && (!s.codice || s.codice !== verificato)){ header(null); return controllaInvito(s); }
    const P = prof(s);
    header(s, P, path);
    const p = path.replace(/^\//, '').split('/');
    if(p[0] === 'm') return viewMateria(s, P, p[1], p[2]);
    if(p[0] === 'a') return viewArgomento(s, P, p[1], p[2], p[3]);
    if(p[0] === 'ripasso') return viewRipasso(s, P);
    if(p[0] === 'sfide') return viewSfide(s, P);
    if(p[0] === 'sfida') return viewSfida(s, P, p[1]);
    if(p[0] === 'traguardi') return viewTraguardi(s, P);
    if(p[0] === 'progressi') return viewProgressi(s, P);
    if(p[0] === 'profilo') return viewProfilo(s, P);
    viewHome(s, P);
  }
  const R = CN.router(route);
  R.refresh();
})();
