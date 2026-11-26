/* Carpe Notes — punti, livelli, serie, traguardi e analitiche (usati sia dallo studente sia dalla docente) */
(function(){
  const {esc} = CN;

  /* ---------- Icone ---------- */
  const ico = {
    fiamma: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2c1 4 5.5 5.6 5.5 11.2A5.5 5.5 0 0 1 12 19a5.5 5.5 0 0 1-5.5-5.8c0-2 .9-3.5 2-4.6.3 1.5 1 2.6 2 3.1C10.8 8.2 10.4 5 12 2z"/></svg>',
    stella: on => `<svg viewBox="0 0 24 24" class="${on?'on':''}" aria-hidden="true"><path d="M12 2.5l3 6.2 6.8.9-5 4.8 1.2 6.700L12 17.9 6 21.100l1.2-6.7-5-4.8 6.8-.9z"/></svg>`,
    lucchetto: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" d="M8 11V8a4 4 0 0 1 8 0v3"/><rect x="5" y="11" width="14" height="10" rx="2.5" fill="currentColor"/></svg>',
    libro: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h13v15H7a2 2 0 0 0-2 2zM9 8h5"/></svg>',
    giro: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/></svg>',
    coppa: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v1a3 3 0 0 0 4 3M16 6h4v1a3 3 0 0 1-4 3M12 13v4M8 20h8"/></svg>',
    spada: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 4l-9.5 9.5M20 4h-4.5M20 4v4.5M6.5 13.5l4 4M5 17l2 2M3.5 20.5l2.5-2.5"/></svg>',
    grafico: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V11M11 20V5M17 20v-6M3 20h18"/></svg>',
    lente: '<svg viewBox="0 0 24 24" aria-hidden="true" style="width:1em;height:1em;vertical-align:-.15em"><circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M15 15l5.5 5.5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>'
  };
  const stelleHtml = (n, big) => `<span class="stars ${big?'big':''}" role="img" aria-label="${n} stelle su 3">${[1,2,3].map(i => ico.stella(i <= n)).join('')}</span>`;

  /* ---------- Date ---------- */
  const giorno = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth()+1).padStart(2,'0') + '-' + String(x.getDate()).padStart(2,'0'); };
  const piu = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const lunedi = d => { const x = new Date(d); x.setHours(12,0,0,0); return piu(x, -((x.getDay() + 6) % 7)); };

  /* ---------- Indice dei contenuti ---------- */
  function indice(cat){
    const es = new Map(), att = new Map(), arg = new Map(), sez = [];
    cat.materie.forEach(m => (m.sezioni||[]).forEach(s => {
      const vis = (s.argomenti||[]).filter(a => a.visibile !== false);
      sez.push({m, s, args: vis});
      vis.forEach(a => { arg.set(a.id, {m, s, a}); (a.esercizi||[]).forEach(e => es.set(e.id, {m, s, a, e})); (a.attivita||[]).forEach(e => att.set(e.id, {m, s, a, e})); });
    }));
    return {es, att, arg, sez};
  }

  /* ---------- Punti, livelli, stelle ---------- */
  /* Dodici livelli (dal 25 novembre 2026). Un argomento fatto con cura (quiz lampo e due attività) vale circa 300-400 XP:
     chi lavora con regolarità arriva a Philosophus verso il 30° argomento e a Princeps verso il 70°, cioè alla fine del biennio. */
  const LIVELLI = [
    [0,'Tiro','recluta'], [150,'Discipulus','allievo'], [500,'Scriba','scrivano'], [1100,'Lector','lettore'], [2000,'Grammaticus','grammatico'],
    [3300,'Rhetor','retore'], [5000,'Orator','oratore'], [7500,'Magister','maestro'], [11000,'Philosophus','filosofo'],
    [16000,'Sapiens','sapiente'], [22500,'Auctor','autore'], [30000,'Princeps','il primo tra i dotti']
  ];
  /* Punti esperienza. Un allenamento vale XP pieni solo per ciò che migliora il proprio record su quella attività
     (più 20 XP la prima volta che si fa 100%); rifarlo senza migliorare vale un quarto dei punti.
     Ripasso (dal 25 novembre 2026): ogni esercizio giusto vale 5 XP, 10 se corregge un errore in sospeso
     (sbagliato l'ultima volta); 1 XP se è già stato azzeccato nella giornata. Al giorno il ripasso dà al massimo
     100 XP pieni: oltre, ogni esercizio giusto vale 1 XP. Così il ripasso conta, ma non si sale di livello ripetendolo all'infinito. */
  const XP_RIP = .25, xpMemo = new WeakMap(), REGOLE = {rip: 5, corretto: 10, poi: 1, tetto: 100};
  const xpBase = r => Math.round((r.punteggio/100) * (r.totale||0) * 10);
  function annotaXp(rs){
    const perStud = new Map();
    rs.slice().sort((a,b) => (a.data||'').localeCompare(b.data||'')).forEach(r => {
      const sk = (r.nome||'') + '|' + (r.classe||'');
      const st = perStud.get(sk) || {best: new Map(), rip: new Map(), pieni: new Map(), ultimo: new Map()}; perStud.set(sk, st);
      const tot = r.totale || 0;
      const es = r.esiti || [];
      if(r.ripasso){
        const g = giorno(r.data), fatti = st.rip.get(g) || new Set(); st.rip.set(g, fatti);
        if(!es.length){ xpMemo.set(r, Math.round((r.punteggio/100) * tot * REGOLE.rip)); return; }
        let x = 0, pieni = st.pieni.get(g) || 0;
        es.forEach(e => {
          const prima = st.ultimo.get(e.id); st.ultimo.set(e.id, e.p);
          if(e.p <= 0) return;
          if(fatti.has(e.id) || pieni >= REGOLE.tetto){ x += REGOLE.poi * e.p; return; }
          const v = Math.min((prima != null && prima < .999 ? REGOLE.corretto : REGOLE.rip) * e.p, REGOLE.tetto - pieni);
          x += v; pieni += v; if(e.p >= .999) fatti.add(e.id);
        });
        st.pieni.set(g, pieni); xpMemo.set(r, Math.round(x)); return;
      }
      es.forEach(e => st.ultimo.set(e.id, e.p));
      const k = (r.argomento||'') + '|' + (r.attivita||'quiz');
      const prev = st.best.has(k) ? st.best.get(k) : null, p = r.punteggio;
      let x;
      if(prev === null) x = xpBase(r) + (p === 100 ? 20 : 0);
      else if(p > prev) x = Math.round((p - prev)/100 * tot * 10) + Math.round(prev/100 * tot * 10 * XP_RIP) + (p === 100 ? 20 : 0);
      else x = Math.round(xpBase(r) * XP_RIP);
      st.best.set(k, prev === null ? p : Math.max(prev, p));
      xpMemo.set(r, x);
    });
  }
  const xpDi = r => xpMemo.has(r) ? xpMemo.get(r) : xpBase(r) + (r.punteggio === 100 && !r.ripasso ? 20 : 0);
  function livello(xp){
    let i = 0; while(i < LIVELLI.length-1 && xp >= LIVELLI[i+1][0]) i++;
    const next = LIVELLI[i+1];
    return {n: i+1, nome: LIVELLI[i][1], glossa: LIVELLI[i][2], min: LIVELLI[i][0], next: next ? next[0] : null, nextNome: next ? next[1] : null,
      pct: next ? Math.round((xp - LIVELLI[i][0]) / (next[0] - LIVELLI[i][0]) * 100) : 100};
  }
  function stelle(p, soglia){
    if(p == null || p < soglia) return 0;
    if(p >= 100) return 3;
    return p >= Math.round((soglia + 100) / 2) ? 2 : 1;
  }

  /* ---------- Profilo: tutto ciò che si ricava dai risultati di uno studente ---------- */
  function profilo(rs, cat, sf){
    const idx = indice(cat), soglia = cat.impostazioni.soglia;
    rs = rs.slice().sort((a,b) => (a.data||'').localeCompare(b.data||''));
    annotaXp(rs);
    let xp = 0, nEs = 0, nRip = 0, tempo = 0, fulmine = false, riscatto = false, pesata = 0;
    const giorni = new Map(), args = new Map(), ultimo = new Map(), sbagliati = new Set(), tipi = {};
    rs.forEach(r => {
      xp += xpDi(r); nEs += r.totale||0; tempo += r.durata||0; pesata += r.punteggio * (r.totale||0); if(r.ripasso) nRip++;
      const g = giorno(r.data); giorni.set(g, (giorni.get(g)||0) + (r.totale||0));
      if(!r.ripasso && r.argomento){
        const a = args.get(r.argomento) || {best:-1, n:0, sotto:false};
        if(r.punteggio >= soglia && a.sotto && a.best < soglia) riscatto = true;
        if(r.punteggio < soglia) a.sotto = true;
        a.prima = a.n ? a.prima : r.punteggio; a.best = Math.max(a.best, r.punteggio); a.last = r.punteggio; a.data = r.data; a.n++;
        args.set(r.argomento, a);
        if((r.totale||0) >= 6 && r.punteggio >= 80 && r.durata > 0 && r.durata < 180) fulmine = true;
      }
      (r.esiti || (r.errori||[]).map(id => ({id, p:0}))).forEach(e => {
        ultimo.set(e.id, e.p); if(e.p < .999 && idx.es.has(e.id)) sbagliati.add(e.id);
        const x = idx.es.get(e.id) || idx.att.get(e.id); if(x){ const t = tipi[x.e.tipo] || (tipi[x.e.tipo] = {n:0, p:0}); t.n++; t.p += e.p; }
      });
    });
    // Serie di giorni consecutivi
    const oggi = giorno(new Date()); let streak = 0, d = new Date();
    if(!giorni.has(oggi)) d = piu(d, -1);
    while(giorni.has(giorno(d))){ streak++; d = piu(d, -1); }
    let record = 0, run = 0, prev = null;
    [...giorni.keys()].sort().forEach(g => { run = (prev && giorno(piu(new Date(prev + 'T12:00'), 1)) === g) ? run + 1 : 1; record = Math.max(record, run); prev = g; });

    const validi = [...args.entries()].filter(([id]) => idx.arg.has(id));
    const superati = validi.filter(([, a]) => a.best >= soglia).length;
    const perfetti = validi.filter(([, a]) => a.best >= 100).length;
    const erroriAperti = [...ultimo.entries()].filter(([id, p]) => p < .999 && idx.es.has(id)).map(([id]) => id);

    const S = CN.sfide ? CN.sfide.riepilogo(sf || []) : {consegnate: 0};
    const COL = ['yellow','pink','green','blue','orange']; let k = 0;
    const B = (id, nome, desc, glifo, cur, tot) => ({id, nome, desc, glifo, col: COL[k++ % COL.length], ok: cur >= tot, cur: Math.min(cur, tot), tot});
    const badge = [
      B('primo', 'Primo passo', 'Completa il tuo primo allenamento', '1°', rs.length, 1),
      B('esploratore', 'Esploratore', 'Prova 5 argomenti diversi', '×5', validi.length, 5),
      B('centro', 'Centro pieno', 'Fai 100% in un argomento', '100', perfetti, 1),
      B('tris', 'Tris perfetto', 'Fai 100% in 3 argomenti', '3×100', perfetti, 3),
      B('tre', 'Tre di fila', 'Allenati 3 giorni consecutivi', '3gg', record, 3),
      B('sette', 'Settimana di fuoco', 'Allenati 7 giorni consecutivi', '7gg', record, 7),
      B('cento', 'Cento esercizi', 'Svolgi 100 esercizi', 'C', nEs, 100),
      B('cinquecento', 'Cinquecento', 'Svolgi 500 esercizi', 'D', nEs, 500),
      B('dieci', 'Collezionista', 'Supera 10 argomenti', '×10', superati, 10),
      B('riscatto', 'Riscatto', 'Supera un argomento che prima non avevi superato', '↗', riscatto ? 1 : 0, 1),
      B('ripasso', 'Chi ripassa vince', 'Completa 5 sessioni di ripasso', '↻', nRip, 5),
      B('pulito', 'Conti in pari', 'Correggi tutti i tuoi errori in sospeso (almeno 5)', '✓', sbagliati.size >= 5 && !erroriAperti.length ? 1 : 0, 1),
      B('fulmine', 'Fulmine', 'Almeno 80% in meno di 3 minuti', '⚡\uFE0E', fulmine ? 1 : 0, 1)
    ];
    // Medaglie delle sfide: 1, 3, 5 e 10 sfide consegnate (niente voto nell'app: la prof corregge per email)
    MEDAGLIE.forEach(([n, nome, met]) => badge.push({id: 'sfide' + n, nome, desc: `Completa ${n} ${n === 1 ? 'sfida' : 'sfide'}`, glifo: String(n), gruppo: 'sfide', met, ok: S.consegnate >= n, cur: Math.min(S.consegnate, n), tot: n}));
    idx.sez.filter(x => x.args.length).forEach(x => {
      const ok = x.args.filter(a => { const r = args.get(a.id); return r && r.best >= soglia; }).length;
      badge.push(B('sez-' + x.s.id, x.s.titolo, 'Supera tutti gli argomenti della sezione', '★', ok, x.args.length));
    });
    return {rs, idx, soglia, xp, livello: livello(xp), streak, record, giorni, args, nEs, nRip, tempo,
      sfide: S, precisione: nEs ? Math.round(pesata / nEs) : null, superati, perfetti, provati: validi.length, totArg: idx.arg.size, erroriAperti, tipi, badge};
  }

  /* ---------- «Ripassa i miei errori»: una sessione breve dagli esercizi sbagliati o non visti da tempo ----------
     Ordine di priorità: 1) esercizi del quiz sbagliati l'ultima volta (i più vecchi prima);
     2) esercizi degli argomenti provati ma non ancora superati (anche se l'errore era in un'attività lunga);
     3) esercizi di argomenti superati che non rivedi da almeno VECCHIO giorni. Al massimo `max` esercizi,
     con almeno un terzo di posti per i gruppi 2 e 3 quando ci sono, e non più di 4 dallo stesso argomento. */
  const VECCHIO = 14;
  function daRipassare(P, max){
    max = max || 12;
    const ora = Date.now(), giorni = d => (ora - new Date(d).getTime()) / 86400000;
    const visto = new Map(); // id esercizio -> {p, data} dell'ultima volta
    P.rs.forEach(r => (r.esiti || (r.errori||[]).map(id => ({id, p:0}))).forEach(e => visto.set(e.id, {p: e.p, data: r.data})));
    const errori = [], deboli = [], vecchi = [];
    [...visto.entries()].filter(([id, v]) => v.p < .999 && P.idx.es.has(id)).sort((a, b) => (a[1].data||'').localeCompare(b[1].data||''))
      .forEach(([id]) => errori.push(P.idx.es.get(id)));
    const giaErr = new Set(errori.map(x => x.e.id));
    const argomenti = [...P.args.entries()].filter(([id]) => P.idx.arg.has(id)).sort((a, b) => (a[1].data||'').localeCompare(b[1].data||''));
    argomenti.forEach(([id, a]) => {
      const x = P.idx.arg.get(id);
      (x.a.esercizi || []).forEach(e => {
        if(giaErr.has(e.id)) return;
        const v = visto.get(e.id), y = {m: x.m, s: x.s, a: x.a, e};
        if(a.best < P.soglia){ if(!v || giorni(v.data) >= 2) deboli.push(y); }
        else if(giorni(a.data) >= VECCHIO && (!v || giorni(v.data) >= VECCHIO)) vecchi.push(y);
      });
    });
    const per = new Map(), scelti = [];
    const prendi = (gruppo, quanti, lim) => { for(const y of gruppo){ if(quanti <= 0 || scelti.length >= max) break;
      const n = per.get(y.a.id) || 0; if(n >= (lim || 4) || scelti.includes(y)) continue; per.set(y.a.id, n + 1); scelti.push(y); quanti--; } };
    const altri = deboli.length + vecchi.length ? Math.ceil(max / 3) : 0;
    prendi(errori, max - altri);
    // dagli altri due gruppi: un po' per uno, gli argomenti più vecchi prima
    const misti = []; for(let i = 0; i < Math.max(deboli.length, vecchi.length); i++){ if(deboli[i]) misti.push(deboli[i]); if(vecchi[i]) misti.push(vecchi[i]); }
    prendi(misti, max); prendi(errori, max); prendi(misti, max, Infinity); prendi(errori, max, Infinity);
    const tipo = y => giaErr.has(y.e.id) ? 'errore' : deboli.includes(y) ? 'debole' : 'vecchio';
    return {lista: CN.shuffle(scelti).map(y => y.e), nErrori: errori.length, nDeboli: deboli.length, nVecchi: vecchi.length,
      conta: {errore: scelti.filter(y => tipo(y) === 'errore').length, debole: scelti.filter(y => tipo(y) === 'debole').length, vecchio: scelti.filter(y => tipo(y) === 'vecchio').length}};
  }

  const MEDAGLIE = [[1, 'Primo caso', 'bronzo'], [3, 'Investigatore', 'argento'], [5, 'Detective', 'oro'], [10, 'Ispettore capo', 'lilla']];
  function medaglia(b, anim){
    return `<div class="med ${b.ok ? 'on' : 'off'} m-${b.met} ${anim ? 'pop' : ''}"><svg viewBox="0 0 100 120" aria-hidden="true">
      <path class="na1" d="M30 0h16l10 40h-16z"/><path class="na2" d="M70 0H54L44 40h16z"/>
      <circle class="m1" cx="50" cy="72" r="38"/><circle class="m2" cx="50" cy="72" r="32"/><circle class="m3" cx="50" cy="72" r="26"/>
      <text x="50" y="84" text-anchor="middle" font-size="${b.tot < 10 ? 34 : 30}">${b.tot}</text></svg>
      <div class="n">${esc(b.nome)}</div><div class="d">${esc(b.desc)}${b.ok ? '' : ` · ${b.cur} di ${b.tot}`}</div></div>`;
  }
  // Le quattro medaglie in fila, con la barra che mostra quanto manca alla prossima
  function medaglieSfide(P){
    const M = P.badge.filter(b => b.gruppo === 'sfide'), n = P.sfide.consegnate;
    const tappe = M.map(b => b.tot), i = tappe.filter(t => n >= t).length;
    const pct = i >= tappe.length ? 100 : i === 0 ? (n / tappe[0]) * 0 : ((i - 1) + (n - tappe[i-1]) / (tappe[i] - tappe[i-1])) / (tappe.length - 1) * 100;
    return `<div class="med-track"><div class="line"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></div><div class="meds">${M.map(b => medaglia(b)).join('')}</div></div>`;
  }
  function adesivo(b, anim){
    if(b.gruppo === 'sfide') return medaglia(b, anim);
    return `<div class="trag ${b.ok ? 'on' : 'off'} c-${b.col} ${anim ? 'pop' : ''}"><div class="g">${esc(b.glifo)}</div><div class="n">${esc(b.nome)}</div><div class="d">${esc(b.desc)}</div>
      ${!b.ok && b.tot > 1 ? `<div class="bar" title="${b.cur} di ${b.tot}"><i style="width:${Math.round(b.cur / b.tot * 100)}%"></i></div><div class="d">${b.cur} di ${b.tot}</div>` : ''}</div>`;
  }

  /* ---------- Analitiche ---------- */
  const durata = s => s >= 3600 ? `${Math.floor(s/3600)} h ${Math.round(s%3600/60)} min` : `${Math.max(1, Math.round(s/60))} min`;

  function graficoAndamento(rs, soglia){
    const pts = rs.slice(-20);
    const W = 640, H = 230, l = 38, r = 14, t = 14, b = 30, w = W - l - r, h = H - t - b;
    const x = i => l + (pts.length === 1 ? w / 2 : i * w / (pts.length - 1));
    const y = p => t + (1 - p / 100) * h;
    const linea = pts.map((p, i) => `${x(i).toFixed(1)},${y(p.punteggio).toFixed(1)}`).join(' ');
    const dataBreve = d => new Date(d).toLocaleDateString('it-IT', {day:'numeric', month:'short'});
    return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Punteggio degli ultimi ${pts.length} allenamenti">
      ${[0,50,100].map(v => `<line x1="${l}" x2="${W-r}" y1="${y(v)}" y2="${y(v)}" style="stroke:var(--line)" stroke-width="1"/><text x="${l-8}" y="${y(v)+4}" text-anchor="end" font-size="12" style="fill:var(--muted)">${v}%</text>`).join('')}
      <line x1="${l}" x2="${W-r}" y1="${y(soglia)}" y2="${y(soglia)}" style="stroke:var(--muted)" stroke-width="1.5" stroke-dasharray="5 5"/>
      <text x="${W-r}" y="${y(soglia)-6}" text-anchor="end" font-size="12" font-weight="700" style="fill:var(--muted);paint-order:stroke;stroke:var(--surface);stroke-width:5px;stroke-linejoin:round">soglia ${soglia}%</text>
      ${pts.length > 1 ? `<polyline points="${linea}" fill="none" style="stroke:var(--brand)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>` : ''}
      ${pts.map((p, i) => `<circle class="pt" cx="${x(i).toFixed(1)}" cy="${y(p.punteggio).toFixed(1)}" r="5" style="fill:var(--brand);stroke:var(--surface)" stroke-width="2" data-tip="${esc(p.argTitolo)} · ${p.punteggio}% · ${dataBreve(p.data)}"/><circle cx="${x(i).toFixed(1)}" cy="${y(p.punteggio).toFixed(1)}" r="14" fill="transparent" class="hit" data-i="${i}"/>`).join('')}
      <text x="${l}" y="${H-8}" font-size="12" style="fill:var(--muted)">${dataBreve(pts[0].data)}</text>
      ${pts.length > 1 ? `<text x="${W-r}" y="${H-8}" text-anchor="end" font-size="12" style="fill:var(--muted)">${dataBreve(pts[pts.length-1].data)}</text>` : ''}
    </svg><div class="tip" hidden></div></div>`;
  }

  function calendario(giorni){
    const oggi = new Date(); oggi.setHours(12,0,0,0); const start = piu(lunedi(oggi), -28);
    let html = '<div class="cal">' + ['L','M','M','G','V','S','D'].map(x => `<div class="hd">${x}</div>`).join('');
    for(let i = 0; i < 35; i++){
      const d = piu(start, i), g = giorno(d), n = giorni.get(g) || 0, fut = d > oggi;
      const lv = n >= 25 ? 3 : n >= 10 ? 2 : n >= 1 ? 1 : 0;
      html += `<div class="c l${lv} ${fut ? 'fut' : ''} ${g === giorno(oggi) ? 'today' : ''}" title="${d.toLocaleDateString('it-IT', {weekday:'long', day:'numeric', month:'long'})}: ${n} esercizi">${d.getDate()}</div>`;
    }
    return html + `</div><div class="legend"><span><i style="background:var(--surface-2)"></i>nessuno</span><span><i style="background:color-mix(in srgb,var(--brand) 22%,var(--surface))"></i>1–9 esercizi</span><span><i style="background:color-mix(in srgb,var(--brand) 55%,var(--surface))"></i>10–24</span><span><i style="background:var(--brand)"></i>25 o più</span></div>`;
  }

  /* Argomenti superati alla fine di ogni settimana: lo studente contro la mediana della sua classe (solo area docente) */
  function superatiPerSettimana(rs, soglia, settimane){
    const ord = rs.filter(r => !r.ripasso && r.argomento).slice().sort((a,b) => (a.data||'').localeCompare(b.data||''));
    return settimane.map(fine => { const best = {}; ord.forEach(r => { if(new Date(r.data) < fine) best[r.argomento] = Math.max(best[r.argomento]||0, r.punteggio); }); return Object.values(best).filter(b => b >= soglia).length; });
  }
  function graficoClasse(P, classe, nome){
    const oggi = new Date(), w0 = lunedi(P.rs[0].data), inizi = [];
    for(let m = new Date(w0); m <= oggi; m = piu(m, 7)) inizi.push(new Date(m));
    const fini = inizi.map(m => piu(m, 7));
    const valido = r => P.idx.arg.has(r.argomento);
    const io = superatiPerSettimana(P.rs.filter(valido), P.soglia, fini);
    const altri = classe.map(rs => superatiPerSettimana(rs.filter(valido), P.soglia, fini));
    const med = i => { const a = altri.map(x => x[i]).sort((x,y) => x - y), k = Math.floor(a.length/2); return a.length % 2 ? a[k] : (a[k-1] + a[k]) / 2; };
    const cl = fini.map((f, i) => med(i));
    const top = Math.max(5, Math.ceil(Math.max(...io, ...cl) / 5) * 5);
    const W = 640, H = 230, l = 38, r = 80, t = 14, b = 30, w = W - l - r, h = H - t - b;
    const x = i => l + (inizi.length === 1 ? w / 2 : i * w / (inizi.length - 1)), y = v => t + (1 - v / top) * h;
    const dataBreve = d => d.toLocaleDateString('it-IT', {day:'numeric', month:'short'});
    const linea = (arr, st) => `<polyline points="${arr.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}" fill="none" style="${st}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
    const passo = Math.max(1, Math.ceil(inizi.length / 8));
    let yIo = y(io[io.length-1]) + 4, yCl = y(cl[cl.length-1]) + 4;
    if(Math.abs(yIo - yCl) < 15){ if(io[io.length-1] >= cl[cl.length-1]){ yIo = Math.min(yIo, yCl) - 8; yCl = yIo + 15; } else { yCl = Math.min(yIo, yCl) - 8; yIo = yCl + 15; } }
    return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Argomenti superati settimana per settimana: ${esc(nome)} e mediana della classe">
      ${[0, top/2, top].map(v => `<line x1="${l}" x2="${W-r}" y1="${y(v)}" y2="${y(v)}" style="stroke:var(--line)" stroke-width="1"/><text x="${l-8}" y="${y(v)+4}" text-anchor="end" font-size="12" style="fill:var(--muted)">${v}</text>`).join('')}
      ${inizi.length > 1 ? linea(cl, 'stroke:var(--muted);stroke-dasharray:6 5;opacity:.7') + linea(io, 'stroke:var(--brand)') : ''}
      ${cl.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="4" style="fill:var(--muted);stroke:var(--surface);opacity:.8" stroke-width="2"><title>Classe (mediana), settimana del ${dataBreve(inizi[i])}: ${v}</title></circle>`).join('')}
      ${io.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="5" style="fill:var(--brand);stroke:var(--surface)" stroke-width="2"><title>${esc(nome)}, settimana del ${dataBreve(inizi[i])}: ${v} argomenti superati</title></circle>`).join('')}
      <text x="${x(io.length-1)+10}" y="${yIo}" font-size="13" font-weight="800" style="fill:var(--ink)">${esc(nome)}</text>
      <text x="${x(cl.length-1)+10}" y="${yCl}" font-size="13" font-weight="700" style="fill:var(--muted)">classe</text>
      ${inizi.map((d, i) => i % passo === 0 || i === inizi.length - 1 ? `<text x="${x(i)}" y="${H-8}" text-anchor="middle" font-size="12" style="fill:var(--muted)">${dataBreve(d)}</text>` : '').join('')}
    </svg></div>
    <div class="legend"><span><i style="background:var(--brand)"></i>${esc(nome)}</span><span><i style="background:var(--muted);opacity:.7"></i>classe (studente a metà classifica)</span></div>`;
  }

  function renderAnalitiche(el, rs, cat, sf, classe){
    const P = profilo(rs, cat, sf);
    if(!P.rs.length){ el.innerHTML = `<div class="panel"><h3>Ancora nessun dato</h3><p class="muted" style="margin:6px 0 0">Qui compariranno andamento, giorni di attività e punti di forza dopo il primo allenamento.</p></div>`; return P; }
    const righe = [...P.args.entries()].filter(([id]) => P.idx.arg.has(id)).map(([id, a]) => Object.assign({id, titolo: P.idx.arg.get(id).a.titolo, sez: P.idx.arg.get(id).s.titolo}, a));
    const forti = righe.slice().sort((a,b) => b.best - a.best).slice(0, 3);
    const deboli = righe.filter(r => r.best < 100).sort((a,b) => a.best - b.best).slice(0, 3);
    const pill = p => `<span class="badge ${p >= P.soglia ? 'ok' : 'ko'}">${p}%</span>`;
    el.innerHTML = `
      <div class="kpis">
        <div class="kpi"><div class="v">${P.nEs}</div><div class="l">esercizi svolti</div></div>
        <div class="kpi"><div class="v">${P.precisione}%</div><div class="l">precisione media</div></div>
        <div class="kpi"><div class="v">${P.superati}<span class="muted" style="font-size:.6em"> / ${P.totArg}</span></div><div class="l">argomenti superati</div></div>
        <div class="kpi"><div class="v">${P.streak}<span class="muted" style="font-size:.6em"> gg</span></div><div class="l">serie attuale (record ${P.record})</div></div>
        <div class="kpi"><div class="v" style="font-size:1.3rem;padding-top:.25rem">${durata(P.tempo)}</div><div class="l">tempo di allenamento</div></div>
      </div>
      <div class="an-grid">
        <div class="panel" style="grid-column:1/-1"><h3>Andamento</h3><div class="sub">Punteggio degli ultimi ${Math.min(20, P.rs.length)} allenamenti, dal più vecchio al più recente</div>${graficoAndamento(P.rs, P.soglia)}</div>
        ${classe && classe.length > 1 ? `<div class="panel" style="grid-column:1/-1"><h3>Argomenti superati nel tempo</h3><div class="sub">Quanti argomenti ha superato alla fine di ogni settimana, confrontato con la mediana della classe ${esc(P.rs[0].classe||'')} (${classe.length} studenti). Una linea che sale vuol dire che sta andando avanti nel programma.</div>${graficoClasse(P, classe, CN.maiuscole(P.rs[0].nome||'').split(' ')[0])}</div>` : ''}
        <div class="panel"><h3>Giorni di attività</h3><div class="sub">Ultime cinque settimane</div>${calendario(P.giorni)}</div>
        <div class="panel"><h3>Padronanza per sezione</h3><div class="sub">Argomenti superati e da migliorare</div>
          ${P.idx.sez.filter(x => x.args.length).map(x => { const st = x.args.map(a => P.args.get(a.id)); const ok = st.filter(a => a && a.best >= P.soglia).length, inc = st.filter(a => a && a.best < P.soglia).length, tot = x.args.length;
            return `<div class="hbar"><span class="t">${esc(x.s.titolo)}</span><span class="track" title="${ok} superati, ${inc} da migliorare, ${tot-ok-inc} da iniziare"><i class="g" style="width:${ok/tot*100}%"></i><i class="y" style="width:${inc/tot*100}%"></i></span><span class="val">${ok}/${tot}</span></div>`; }).join('')}
          <div class="legend"><span><i style="background:var(--ok)"></i>superati</span><span><i style="background:var(--warn)"></i>da migliorare</span><span><i style="background:var(--surface-2)"></i>da iniziare</span></div></div>
        <div class="panel"><h3>Tipi di esercizio</h3><div class="sub">Risposte corrette per tipo</div>
          ${Object.keys(P.tipi).length ? Object.entries(P.tipi).sort((a,b) => b[1].p/b[1].n - a[1].p/a[1].n).map(([t, v]) => { const pc = Math.round(v.p / v.n * 100); return `<div class="hbar"><span class="t">${esc(CN.TIPI[t] || t)}</span><span class="track" title="${v.n} risposte"><i style="width:${pc}%"></i></span><span class="val">${pc}%</span></div>`; }).join('') : '<p class="muted small">Disponibile dai prossimi allenamenti.</p>'}</div>
        <div class="panel"><h3>Punti di forza</h3><div class="sub">Gli argomenti con il punteggio migliore</div>
          <ul class="mini-list">${forti.map(r => `<li><span>${esc(r.titolo)}</span>${pill(r.best)}</li>`).join('') || '<li class="muted">Ancora nessun argomento.</li>'}</ul>
          <h3 style="margin-top:16px">Da rinforzare</h3><div class="sub">Gli argomenti con il punteggio più basso</div>
          <ul class="mini-list">${deboli.map(r => `<li><span>${esc(r.titolo)}</span>${pill(r.best)}</li>`).join('') || '<li class="muted">Niente da segnalare.</li>'}</ul></div>
      </div>
      <div class="sec-title"><h2>Argomento per argomento</h2></div>
      <div class="tbl-wrap"><table class="tbl"><tr><th>Argomento</th><th>Sezione</th><th>Tentativi</th><th>Primo</th><th>Migliore</th><th>Ultimo</th><th>Ultima volta</th></tr>
        ${righe.sort((a,b) => (b.data||'').localeCompare(a.data||'')).map(r => `<tr><td>${esc(r.titolo)}</td><td class="muted">${esc(r.sez)}</td><td class="num">${r.n}</td><td class="num">${r.prima}%</td><td>${pill(r.best)}</td><td class="num">${r.last}% ${r.n > 1 ? (r.last > r.prima ? '↑' : r.last < r.prima ? '↓' : '=') : ''}</td><td>${new Date(r.data).toLocaleDateString('it-IT')}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">Solo sessioni di ripasso finora.</td></tr>'}
      </table></div>`;
    // Etichetta al passaggio sui punti del grafico
    const ch = el.querySelector('.chart'), tip = ch && ch.querySelector('.tip');
    if(ch) ch.querySelectorAll('.hit').forEach(hit => {
      const pt = hit.previousElementSibling;
      const show = () => { const b = ch.getBoundingClientRect(), p = pt.getBoundingClientRect(); tip.textContent = pt.dataset.tip; tip.hidden = false; tip.style.left = Math.max(70, Math.min(b.width - 70, p.left - b.left + p.width / 2)) + 'px'; tip.style.top = (p.top - b.top) + 'px'; };
      hit.addEventListener('pointerenter', show); hit.addEventListener('click', show); hit.addEventListener('pointerleave', () => { tip.hidden = true; });
    });
    return P;
  }

  /* ---------- Navigazione tra le viste (funziona anche dove l'indirizzo della pagina non può cambiare) ---------- */
  function router(cb){
    const leggi = () => (location.hash || '').replace(/^#/, '') || '/';
    let cur = leggi();
    const vai = p => { cur = p; try{ if(location.hash !== '#' + p) history.pushState(null, '', '#' + p); }catch(e){} cb(cur); window.scrollTo(0, 0); };
    // CN.guardia: se restituisce un messaggio, prima di cambiare pagina si chiede conferma (es. allenamento a metà)
    async function permesso(){
      const msg = CN.guardia && CN.guardia(); if(!msg) return true;
      const ok = await CN.conferma(msg, 'Esci'); if(ok) CN.guardia = null; return ok;
    }
    const go = async p => { if(await permesso()) vai(p); };
    document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('a[href^="#/"]'); if(a){ e.preventDefault(); go(a.getAttribute('href').slice(1)); } });
    window.addEventListener('popstate', async () => {
      const dest = leggi();
      if(CN.guardia && CN.guardia()){
        try{ history.pushState(null, '', '#' + cur); }catch(e){}
        if(await permesso()) vai(dest);
        return;
      }
      cur = dest; cb(cur);
    });
    window.addEventListener('beforeunload', e => { if(CN.guardia && CN.guardia()){ e.preventDefault(); e.returnValue = ''; } });
    return { go, get cur(){ return cur; }, refresh: () => cb(cur) };
  }

  Object.assign(CN, {ico, stelleHtml, giorno, piu, lunedi, indice, LIVELLI, XP_REGOLE: REGOLE, daRipassare, xpDi, annotaXp, livello, stelle, profilo, adesivo, medaglia, medaglieSfide, renderAnalitiche, durata, router});
})();
