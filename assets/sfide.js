/* Carpe Notes — Sfide: esercizi aperti senza soluzione automatica. La docente legge le consegne e manda la correzione per email.
   Le sfide stanno nell'elenco "sfide" dei contenuti: {id, titolo, livello, ambito, sblocco: [id degli argomenti da superare], intro, prove}.
   Tipi di prova:
     analisi  {titolo, consegna, frase, parole?, etichette?, punti, guida}   divide la frase in sintagmi (parole:true = già divisa parola per parola) e scrive la funzione di ognuno
     riscrivi {titolo, consegna, voci: [{testo, compito}], punti, guida}     riscrive ogni frase seguendo il compito
     errori   {titolo, consegna, testo (*parola* = errore), punti, guida}  tocca le parole sbagliate e scrive la correzione (senza spiegazione)
     motiva   {titolo, consegna, domanda, opzioni[], punti, guida}         sceglie la risposta giusta (senza spiegazione)
     scrivi   {titolo, consegna, vincoli[], minParole, punti, guida}       testo libero con vincoli da rispettare
     mossa    {titolo, consegna, frasi: [{f, obiettivo}], punti, guida}     in ogni frase cambia UNA parola (la tocca e scrive quella nuova) per raggiungere l'obiettivo
     frase    {titolo, consegna, vincoli[], maxParole, punti, guida}       «Tutto in una frase»: una sola frase breve che contiene tutti i vincoli
     tessere  {titolo, consegna, voci: [{testo, compito?, tessere[], soluzione}], punti, guida}  compone la frase toccando le tessere (alcune sono trappole)
     versione {titolo, consegna, categorie, frasi: [{la ('[parola|cat]'), aiuto (completo|indizi|lessico|libera), aiuto_testo?, domanda?: [q, [giusta, …]], lex?, modello, punti?}], punti, guida}
              versione a tappe: per ogni frase colora, rispondi, traduci (sfida con versione:true: sezione «Versioni»)
   Il percorso: bozza (salvata da sola) → inviata (va nel file dei risultati). Niente punti né stelle: si contano le sfide consegnate
   (medaglie a 1, 3, 5 e 10). Dalla parte della docente una consegna può essere segnata come «corretta» (c.letta). */
(function(){
  const {esc} = CN;
  CN.K.sfide = 'cn_sfide';          // consegne fatte su questo dispositivo (studente)
  CN.K.sfideDoc = 'cn_sfide_doc';   // consegne ricevute e corrette (docente)
  const ETICHETTE = ['soggetto','predicato verbale','predicato nominale','attributo','apposizione','complemento oggetto',
    'complemento predicativo del soggetto',"complemento predicativo dell'oggetto",'complemento di specificazione','complemento di termine',
    "complemento d'agente",'complemento di causa efficiente','complemento di stato in luogo','complemento di moto a luogo','complemento di moto da luogo',
    'complemento di moto per luogo','complemento di tempo determinato','complemento di tempo continuato','complemento di causa','complemento di fine',
    'complemento di mezzo','complemento di modo','complemento di compagnia','complemento di unione','complemento di materia','complemento di argomento',
    'complemento di qualità','complemento di limitazione','complemento di vantaggio','complemento di svantaggio','complemento concessivo',
    'complemento di esclusione','complemento di sostituzione','complemento di origine o provenienza','complemento di allontanamento o separazione',
    'complemento partitivo','complemento di paragone','complemento di denominazione','complemento di età','complemento di colpa','complemento distributivo','vocativo'];

  /* ---------- Indice delle sfide nel catalogo ---------- */
  function elenco(cat){
    return (cat.sfide || []).filter(sf => sf && sf.id && sf.visibile !== false).map(sf => ({id: sf.id, sf, where: sf.ambito || ''}));
  }
  // «Sotto la lente»: la prova corretta dalla prof in fondo a un argomento (sfida con lente:true e argomento:id)
  const lente = (cat, argId) => elenco(cat).find(x => x.sf.lente && x.sf.argomento === argId) || null;
  // Argomenti da superare per sbloccare una sfida (P = profilo dello studente)
  function sblocco(cat, P, sf){
    const idx = CN.indice(cat);
    const req = (sf.sblocco || []).filter(id => idx.arg.has(id)).map(id => idx.arg.get(id));
    const fatto = x => { const a = P.args.get(x.a.id); return !!a && a.best >= P.soglia; };
    const mancano = req.filter(x => !fatto(x));
    if(CN.anteprima && CN.anteprima()) return {ok: true, tot: req.length, fatti: req.length - mancano.length, req, mancano: []};
    return {ok: !mancano.length, tot: req.length, fatti: req.length - mancano.length, req, mancano};
  }
  const totPunti = sf => (sf.prove||[]).reduce((t, p) => t + (+p.punti||0), 0);
  function stelleDa(punti, tot){
    const p = tot ? punti / tot : 0;
    return p >= .9 ? 3 : p >= .7 ? 2 : p >= .4 ? 1 : 0;
  }

  /* ---------- Archivio dello studente ---------- */
  const tutte = () => CN.load(CN.K.sfide, []);
  const salvaTutte = a => CN.save(CN.K.sfide, a);
  const diStudente = s => { const k = CN.studKey(s); return tutte().filter(c => CN.studKey(c) === k); };
  function storia(s, aId){ return diStudente(s).filter(c => c.sfida === aId).sort((a,b) => a.tentativo - b.tentativo); }
  function salvaConsegna(c){ const a = tutte(); const i = a.findIndex(x => x.id === c.id); if(i >= 0) a[i] = c; else a.push(c); salvaTutte(a); }
  function nuovaBozza(s, x, da){
    const st = storia(s, x.id);
    return {id: CN.uid('sf'), sfida: x.id, titolo: x.sf.titolo, argTitolo: x.where, nome: s.nome, classe: s.classe,
      tentativo: st.length + 1, risposte: da ? CN.clone(da.risposte) : {}, nota: '', stato: 'bozza', creata: new Date().toISOString()};
  }
  const inviate = s => diStudente(s).filter(c => c.stato !== 'bozza');

  /* ---------- Archivio della docente ---------- */
  const doc = () => CN.load(CN.K.sfideDoc, []);
  const salvaDoc = a => CN.save(CN.K.sfideDoc, a);
  function importaConsegne(arr){
    const a = doc(); let n = 0;
    (arr||[]).forEach(c => {
      if(!c || !c.id || c.stato === 'bozza') return;
      if(a.some(x => x.id === c.id)) return;
      a.push(Object.assign({}, c, {stato: c.correzione ? 'corretta' : 'inviata'})); n++;
    });
    salvaDoc(a); return n;
  }
  // La docente segna una consegna come corretta (la correzione la manda per email)
  const letta = c => !!(c.letta || c.correzione);
  function segnaLetta(id, v){ const a = doc(); const c = a.find(x => x.id === id); if(!c) return; c.letta = v ? new Date().toISOString() : null; if(!v) delete c.correzione; salvaDoc(a); }
  const docDi = k => doc().filter(c => CN.studKey(c) === k);

  /* ---------- Medaglie: si conta quante sfide diverse sono state consegnate (almeno una volta) ---------- */
  function riepilogo(consegne){
    const fatte = new Set((consegne||[]).filter(c => c.stato && c.stato !== 'bozza').map(c => c.sfida));
    return {consegnate: fatte.size};
  }

  /* ---------- Disegno delle prove ---------- */
  const parole = t => String(t||'').split(/\s+/).filter(Boolean);
  const tokErrori = t => parole(t).map(w => { const m = /^([«“(]*)\*(.+)\*([.,;:!?»”)]*)$/.exec(w); return m ? {t: m[1] + m[2] + m[3], err: true} : {t: w, err: false}; });
  const nParole = t => parole(t).length;

  // ans: oggetto della risposta (viene modificato); onChange: chiamata a ogni modifica; mode: 'edit' | 'view' | 'doc'
  function renderProva(p, ans, mode, onChange){
    const box = document.createElement('div'); box.className = 'prova-in';
    const ro = mode !== 'edit';
    const ch = () => onChange && onChange();

    if(p.tipo === 'analisi' && p.chiave){
      // Solo le parole sottolineate (chiave), analizzate toccando le pillole (pillole: {gruppo: [opzioni]})
      const w = parole(p.frase), pul = x => String(x).toLowerCase().replace(/[«»"“”.,;:!?()]/g, '');
      const segs = []; let from = 0;
      p.chiave.forEach(k => { const kk = parole(k).map(pul);
        for(let i = from; i <= w.length - kk.length; i++){ if(kk.every((x, j) => pul(w[i + j]) === x)){ segs.push({start: i, end: i + kk.length - 1, testo: k}); from = i + kk.length; break; } } });
      ans.etichette = ans.etichette || {}; ans.pill = ans.pill || {};
      const gruppi = Object.entries(p.pillole || {Funzione: p.etichette || ETICHETTE});
      const testo = sg => { const v = ans.pill[sg.start] || {}; return gruppi.map(([g]) => v[g]).filter(Boolean).join(', '); };
      const fr = document.createElement('div'); fr.className = 'segm frase-chiave';
      const lista = document.createElement('div'); lista.className = 'pill-lista';
      let att = segs.length ? segs[0].start : null;
      function disegna(){
        fr.innerHTML = '';
        for(let i = 0; i < w.length;){
          const sg = segs.find(x => x.start === i);
          if(sg){
            const b = document.createElement(ro ? 'span' : 'button'); if(!ro) b.type = 'button';
            b.className = 'kw' + (ans.etichette[sg.start] ? ' fatto' : '') + (!ro && att === sg.start ? ' on' : '');
            b.textContent = w.slice(sg.start, sg.end + 1).join(' ');
            if(!ro) b.onclick = () => { att = sg.start; disegna(); };
            fr.appendChild(b); fr.appendChild(document.createTextNode(' ')); i = sg.end + 1;
          } else { fr.insertAdjacentHTML('beforeend', `<span class="sw">${esc(w[i])}</span> `); i++; }
        }
        lista.innerHTML = '';
        if(ro){ lista.innerHTML = `<div class="segm-list">${segs.map(sg => `<div class="sg"><span class="sg-t">${esc(sg.testo)}</span><span class="sg-l ${ans.etichette[sg.start] ? '' : 'vuota'}">${esc(ans.etichette[sg.start] || 'senza analisi')}</span></div>`).join('')}</div>`; return; }
        const sg = segs.find(x => x.start === att); if(!sg) return;
        const v = ans.pill[sg.start] = ans.pill[sg.start] || {};
        const pan = CN.h(`<div class="pill-pan"><div class="pill-t">«${esc(sg.testo)}»</div></div>`);
        gruppi.forEach(([g, opz]) => {
          if(gruppi.length > 1) pan.insertAdjacentHTML('beforeend', `<div class="pill-g">${esc(g)}</div>`);
          const row = CN.h(`<div class="pills"></div>`);
          opz.forEach(o => { const b = CN.h(`<button type="button" class="pill ${v[g] === o ? 'on' : ''}">${esc(o)}</button>`);
            b.onclick = () => { if(v[g] === o) delete v[g]; else v[g] = o; const t = testo(sg); if(t) ans.etichette[sg.start] = t; else delete ans.etichette[sg.start]; ch(); disegna(); };
            row.appendChild(b); });
          pan.appendChild(row);
        });
        const idx = segs.indexOf(sg);
        if(idx < segs.length - 1){ const nx = CN.h(`<button type="button" class="btn sm pill-next">Parola successiva →</button>`); nx.onclick = () => { att = segs[idx + 1].start; disegna(); }; pan.appendChild(nx); }
        lista.appendChild(pan);
        lista.insertAdjacentHTML('beforeend', `<div class="pill-riep">${segs.map(x => `<div class="${ans.etichette[x.start] ? 'ok' : ''}"><b>${esc(x.testo)}</b> <span>${esc(ans.etichette[x.start] || '…')}</span></div>`).join('')}</div>`);
      }
      if(!ro) box.insertAdjacentHTML('beforeend', `<div class="hint">Analizza solo le parole sottolineate: tocca una parola, poi le pillole giuste. Tocca di nuovo una pillola per toglierla.</div>`);
      box.appendChild(fr); box.appendChild(lista); disegna();
    }

    else if(p.tipo === 'analisi'){
      const w = parole(p.frase);
      if(!ans.tagli) ans.tagli = p.parole ? w.slice(0, -1).map((x, i) => i) : [];
      ans.etichette = ans.etichette || {};
      const fr = document.createElement('div'); fr.className = 'segm';
      const lista = document.createElement('div'); lista.className = 'segm-list';
      const listId = 'dl-' + Math.random().toString(36).slice(2, 8);
      const segmenti = () => { const out = []; let start = 0; w.forEach((x, i) => { if(ans.tagli.includes(i) || i === w.length - 1){ out.push({start, testo: w.slice(start, i + 1).join(' ')}); start = i + 1; } }); return out; };
      function disegna(){
        fr.innerHTML = '';
        w.forEach((x, i) => {
          fr.insertAdjacentHTML('beforeend', `<span class="sw">${esc(x)}</span>`);
          if(i < w.length - 1){
            const cut = ans.tagli.includes(i);
            if(ro){ if(cut) fr.insertAdjacentHTML('beforeend', '<span class="cut on" aria-hidden="true"></span>'); else fr.insertAdjacentHTML('beforeend', ' '); }
            else {
              const b = document.createElement('button'); b.type = 'button'; b.className = 'cut' + (cut ? ' on' : '');
              b.setAttribute('aria-label', (cut ? 'Togli il taglio dopo «' : 'Taglia dopo «') + x + '»');
              b.onclick = () => { const k = ans.tagli.indexOf(i); if(k >= 0) ans.tagli.splice(k, 1); else ans.tagli.push(i); ans.tagli.sort((a,b) => a - b); disegna(); ch(); };
              fr.appendChild(b);
            }
          }
        });
        const segs = segmenti();
        // tiene solo le etichette dei segmenti che esistono ancora
        Object.keys(ans.etichette).forEach(k => { if(!segs.some(sg => String(sg.start) === k)) delete ans.etichette[k]; });
        lista.innerHTML = segs.map(sg => ro
          ? `<div class="sg"><span class="sg-t">${esc(sg.testo)}</span><span class="sg-l ${ans.etichette[sg.start] ? '' : 'vuota'}">${esc(ans.etichette[sg.start] || 'senza etichetta')}</span></div>`
          : `<div class="sg"><span class="sg-t">${esc(sg.testo)}</span><input type="text" list="${listId}" data-k="${sg.start}" value="${esc(ans.etichette[sg.start] || '')}" placeholder="${p.parole ? 'parte del discorso e analisi' : 'funzione logica (o «nessuna»)'}" aria-label="Funzione di «${esc(sg.testo)}»"></div>`).join('');
        lista.querySelectorAll('input').forEach(inp => inp.oninput = () => { ans.etichette[inp.dataset.k] = inp.value; ch(); });
      }
      if(!ro) box.insertAdjacentHTML('beforeend', p.parole ? `<div class="hint">Le parole sono già separate. Se due o più parole vanno analizzate insieme (un tempo composto, una locuzione), tocca il taglio tra loro per unirle. Poi scrivi sotto l'analisi di ogni pezzo.</div>`
        : `<div class="hint">1. Tocca lo spazio tra due parole per tagliare la frase in sintagmi (tocca di nuovo per togliere il taglio). 2. Scrivi sotto la funzione di ogni pezzo.</div>`);
      box.appendChild(fr); box.appendChild(lista);
      if(!ro) box.insertAdjacentHTML('beforeend', `<datalist id="${listId}">${(p.etichette || ETICHETTE.concat(['nessuna (avverbio, congiunzione…)'])).map(x => `<option value="${esc(x)}">`).join('')}</datalist>`);
      disegna();
    }

    else if(p.tipo === 'versione'){
      // Versione a tappe: per ogni frase a. colora le parole chiave, b. rispondi, c. traduci. L'aiuto cala frase per frase.
      const parse = CN.attivita.parseMarcato, COL = ['yellow', 'green', 'pink', 'blue', 'orange'];
      const cats = Object.entries(p.categorie || {v: 'verbo', s: 'soggetto', o: 'complemento oggetto'});
      const colore = {}; cats.forEach(([k], i) => colore[k] = COL[i % COL.length]);
      const nomeCat = k => (cats.find(c => c[0] === k) || [])[1] || '';
      const LIV = {completo: ['aiuto completo', 'l3'], indizi: ['solo indizi', 'l2'], lessico: ['solo lessico', 'l1'], libera: ['da solo', 'l0']};
      const frasi = p.frasi || [];
      ans.f = ans.f || [];
      const intero = frasi.map(f => parse(f.la).map(t => t.t + (t.sp ? ' ' : '')).join('')).join(' ');
      box.insertAdjacentHTML('beforeend', `<details class="ver-intero" ${ro ? '' : 'open'}><summary>Il brano intero</summary><div class="brano lettura">${esc(intero)}</div></details>`);
      const riep = CN.h(`<div class="vt-riep"></div>`); if(mode === 'doc') box.appendChild(riep);
      let tk = 0, tkOk = 0, fp = 0, nq = 0, qOk = 0;
      const ol = CN.h(`<div class="ver-list"></div>`);
      frasi.forEach((f, fi) => {
        const a = ans.f[fi] = ans.f[fi] || {}; a.mark = a.mark || {};
        const toks = parse(f.la);
        const usate = cats.filter(([k]) => toks.some(t => t.k === k));
        const lv = LIV[f.aiuto] || null;
        const li = CN.h(`<div class="ver-frase"><div class="ver-n">Frase ${fi + 1} di ${frasi.length}${lv ? ` <span class="vt-lv ${lv[1]}">${lv[0]}</span>` : ''}</div></div>`);
        let n = 0; const passo = () => 'abcd'[n++];
        // a. colora
        if(usate.length){
          let pen = usate[0][0];
          li.insertAdjacentHTML('beforeend', `<div class="ver-passo"><b>${passo()}.</b> ${usate.length > 1 ? 'Scegli l’evidenziatore e colora nella frase: ' + usate.map(([, nm]) => '<b>' + esc(nm) + '</b>').join(', ') + '.' : 'Colora nella frase: <b>' + esc(usate[0][1]) + '</b>.'}</div>`);
          if(!ro && usate.length > 1){
            const pal = CN.h(`<div class="pens" role="group" aria-label="Evidenziatori"></div>`);
            usate.forEach(([k, nm]) => { const b = CN.h(`<button type="button" class="pen c-${colore[k]}"><i></i>${esc(nm)}</button>`);
              b.onclick = () => { pen = k; pal.querySelectorAll('.pen').forEach(x => x.classList.toggle('on', x === b)); };
              if(k === pen) b.classList.add('on'); pal.appendChild(b); });
            li.appendChild(pal);
          }
          const br = CN.h(`<div class="brano"></div>`);
          toks.forEach((t, i) => {
            const b = document.createElement(ro ? 'span' : 'button'); if(!ro) b.type = 'button';
            const cls = () => 'w' + (a.mark[i] ? ' hl-' + colore[a.mark[i]] : '');
            b.className = cls(); b.textContent = t.t;
            if(mode === 'doc'){
              if(t.k){ tk++; if(a.mark[i] === t.k){ tkOk++; b.classList.add('ok'); } else { b.classList.add(a.mark[i] ? 'bad' : 'miss'); b.insertAdjacentHTML('beforeend', `<sup>${esc(nomeCat(t.k))}</sup>`); } }
              else if(a.mark[i]){ fp++; b.classList.add('bad'); }
            }
            if(!ro) b.onclick = () => { if(a.mark[i] === pen) delete a.mark[i]; else a.mark[i] = pen; b.className = cls(); ch(); };
            br.appendChild(b); if(t.sp) br.appendChild(document.createTextNode(' '));
          });
          li.appendChild(br);
        } else li.insertAdjacentHTML('beforeend', `<div class="brano vt-la">${esc(parse(f.la).map(t => t.t + (t.sp ? ' ' : '')).join(''))}</div>`);
        if(f.aiuto_testo) li.insertAdjacentHTML('beforeend', `<div class="vt-aid">${f.aiuto_testo}</div>`);
        // b. domanda (la prima opzione è quella giusta; l'ordine mostrato è fisso ma rimescolato)
        if(f.domanda){
          const [q, opz] = f.domanda; const rot = (intero.length + fi * 7) % opz.length;
          const ordine = opz.map((_, i) => (i + rot) % opz.length);
          const d = CN.h(`<div class="ver-q"><div class="ver-passo"><b>${passo()}.</b> ${q}</div><div class="opts"></div></div>`); const wrap = d.querySelector('.opts');
          if(mode === 'doc'){ nq++; if(a.dom === 0) qOk++; }
          ordine.forEach((i, pos) => {
            const b = CN.h(`<${ro ? 'div' : 'button type="button"'} class="opt ${a.dom === i ? 'sel' : ''}"><span class="k">${'ABCDE'[pos]}</span><span>${opz[i]}</span></${ro ? 'div' : 'button'}>`);
            if(mode === 'doc'){ if(i === 0) b.classList.add('right'); else if(a.dom === i) b.classList.add('wrong'); }
            if(!ro) b.onclick = () => { a.dom = i; wrap.querySelectorAll('.opt').forEach(y => y.classList.toggle('sel', y === b)); ch(); };
            wrap.appendChild(b); });
          li.appendChild(d);
        }
        if(f.lex) li.insertAdjacentHTML('beforeend', `<div class="ver-lex"><b>Parole utili</b> ${f.lex}</div>`);
        // c. traduzione
        li.insertAdjacentHTML('beforeend', `<div class="ver-passo"><b>${passo()}.</b> ${n > 1 ? 'Ora traduci la frase.' : 'Traduci la frase.'}</div>`);
        if(ro) li.insertAdjacentHTML('beforeend', `<div class="risposta">${esc(a.tr || '') || '<span class="muted">Nessuna traduzione.</span>'}</div>`);
        else { const t = CN.h(`<textarea rows="2" placeholder="Scrivi qui la tua traduzione"></textarea>`); t.value = a.tr || ''; t.setAttribute('aria-label', 'Traduzione della frase ' + (fi + 1)); t.oninput = () => { a.tr = t.value; ch(); }; li.appendChild(t); }
        if(mode === 'doc' && f.modello) li.insertAdjacentHTML('beforeend', `<div class="vt-mod"><b>Traduzione modello</b> ${f.modello}</div>`);
        ol.appendChild(li);
      });
      box.appendChild(ol);
      if(!ro){
        box.insertAdjacentHTML('beforeend', `<div class="hint">Una frase alla volta: prima colora, poi rispondi, poi traduci. L'aiuto cala a ogni frase, e l'ultima la fai da solo. Tocca di nuovo una parola per togliere il colore.</div>`);
        const ita = CN.h(`<div class="vt-tutta"><label class="f">La tua traduzione completa (facoltativa: rileggi e sistema l'italiano)</label><textarea rows="4" placeholder="Ricopia qui le frasi in bella, una dopo l'altra"></textarea></div>`);
        const t = ita.querySelector('textarea'); t.value = ans.bella || ''; t.oninput = () => { ans.bella = t.value; ch(); }; box.appendChild(ita);
      } else if(String(ans.bella || '').trim()) box.insertAdjacentHTML('beforeend', `<div class="vt-tutta"><div class="f">La traduzione completa</div><div class="risposta">${esc(ans.bella)}</div></div>`);
      if(mode === 'doc') riep.innerHTML = `<b>Prima del voto:</b> parole colorate giuste ${tkOk} su ${tk}${fp ? ` (più ${fp} di troppo)` : ''} · domande giuste ${qOk} su ${nq}. La traduzione la valuti tu, frase per frase.`;
    }

    else if(p.tipo === 'errori'){
      const toks = tokErrori(p.testo);
      ans.sel = ans.sel || {};
      const fr = document.createElement('div'); fr.className = 'frase testo-err';
      const righe = document.createElement('div'); righe.className = 'err-list';
      function disegna(){
        fr.innerHTML = '';
        toks.forEach((tk, i) => {
          const s = ans.sel[i] !== undefined;
          let cls = 'pick' + (s ? ' sel' : '');
          if(mode === 'doc'){ cls = 'pick' + (s && tk.err ? ' right' : s ? ' wrong' : tk.err ? ' missed' : ''); }
          const b = document.createElement(ro ? 'span' : 'button'); if(!ro) b.type = 'button';
          b.className = cls; b.textContent = tk.t;
          if(!ro) b.onclick = () => { if(s) delete ans.sel[i]; else ans.sel[i] = {corr: ''}; disegna(); ch(); };
          fr.appendChild(b); fr.appendChild(document.createTextNode(' '));
        });
        const keys = Object.keys(ans.sel).map(Number).sort((a,b) => a - b);
        righe.innerHTML = keys.length ? keys.map(i => ro
          ? `<div class="er"><div class="er-w ${mode === 'doc' ? (toks[i].err ? 'ok' : 'no') : ''}">${esc(toks[i].t)}</div><div><b>Correzione:</b> ${esc(ans.sel[i].corr) || '<span class="muted">—</span>'}${ans.sel[i].perche ? `<br><b>Perché:</b> ${esc(ans.sel[i].perche)}` : ''}</div></div>`
          : `<div class="er"><div class="er-w">${esc(toks[i].t)}</div><div class="er-f"><input type="text" data-i="${i}" data-f="corr" value="${esc(ans.sel[i].corr)}" placeholder="come si scrive" aria-label="Correzione di «${esc(toks[i].t)}»"></div></div>`).join('')
          : `<p class="muted small" style="margin:6px 0 0">${ro ? 'Nessuna parola segnalata.' : 'Nessuna parola selezionata: tocca le parole che secondo te sono sbagliate.'}</p>`;
        righe.querySelectorAll('input').forEach(inp => inp.oninput = () => { ans.sel[inp.dataset.i][inp.dataset.f] = inp.value; ch(); });
      }
      box.appendChild(fr); box.appendChild(righe);
      if(mode === 'doc'){ const tot = toks.filter(t => t.err).length, trov = Object.keys(ans.sel).filter(i => toks[i] && toks[i].err).length;
        box.insertAdjacentHTML('beforeend', `<div class="legend" style="margin-top:8px"><span><i style="background:var(--ok-soft);outline:1px solid var(--ok)"></i>errore trovato (${trov} di ${tot})</span><span><i style="background:var(--ko-soft);outline:1px solid var(--ko)"></i>segnalato ma era giusto</span><span><i style="outline:1px dashed var(--ok)"></i>errore non trovato</span></div>`); }
      disegna();
    }

    else if(p.tipo === 'motiva'){
      box.insertAdjacentHTML('beforeend', `<blockquote class="tesi">${p.domanda || ''}</blockquote>`);
      const ops = document.createElement('div'); ops.className = 'opts';
      (p.opzioni||[]).forEach((o, i) => {
        const b = document.createElement(ro ? 'div' : 'button'); if(!ro) b.type = 'button';
        b.className = 'opt' + (ans.scelta === i ? ' sel' : ''); b.innerHTML = `<span class="k">${String.fromCharCode(65+i)}</span><span>${esc(o)}</span>`;
        if(!ro) b.onclick = () => { ans.scelta = i; ops.querySelectorAll('.opt').forEach((x, j) => x.classList.toggle('sel', j === i)); ch(); };
        ops.appendChild(b);
      });
      box.appendChild(ops);
      // basta scegliere la risposta giusta; una vecchia spiegazione già consegnata si mostra ancora in lettura
      if(ro && String(ans.testo || '').trim()) box.insertAdjacentHTML('beforeend', `<div class="risposta">${esc(ans.testo)}</div>`);
    }

    else if(p.tipo === 'mossa'){
      // Una mossa sola: in ogni frase si cambia UNA parola (si tocca e si scrive quella nuova) per raggiungere l'obiettivo
      ans.m = ans.m || [];
      const pezzi = f => parole(f).map(x => { const m = /^([«“(]*)(.*?)([.,;:!?»”)]*)$/.exec(x); return {pre: m[1], w: m[2], post: m[3]}; });
      (p.frasi||[]).forEach((v, k) => {
        const ws = pezzi(v.f);
        const li = CN.h(`<div class="mossa"><div class="rs-c">Obiettivo: ${v.obiettivo}</div><div class="frase"></div><div class="mossa-in"></div></div>`);
        const fr = li.querySelector('.frase'), inn = li.querySelector('.mossa-in');
        function disegna(){
          const a = ans.m[k];
          fr.innerHTML = '';
          ws.forEach((x, j) => {
            const cambiata = a && a.i === j;
            let el;
            if(ro){ el = document.createElement('span'); el.className = 'pick' + (cambiata ? ' sel' : '');
              el.innerHTML = cambiata ? `<s class="muted">${esc(x.w)}</s> ${esc(a.n || '…')}` : esc(x.w); }
            else { el = document.createElement('button'); el.type = 'button'; el.className = 'pick' + (cambiata ? ' sel' : '');
              el.textContent = cambiata && a.n ? a.n : x.w;
              el.onclick = () => { ans.m[k] = cambiata ? null : {i: j, n: ''}; ch(); disegna(); const t = inn.querySelector('input'); if(t) t.focus(); }; }
            if(x.pre) fr.appendChild(document.createTextNode(x.pre));
            fr.appendChild(el);
            if(x.post) fr.appendChild(document.createTextNode(x.post));
          });
          inn.innerHTML = '';
          if(ro){ if(!a) inn.innerHTML = '<span class="small muted">Nessuna parola cambiata.</span>'; return; }
          if(!a){ inn.innerHTML = '<span class="small muted">Tocca la parola da cambiare.</span>'; return; }
          const t = CN.h(`<input type="text" placeholder="al posto di «${esc(ws[a.i].w)}» scrivo…" aria-label="Nuova parola al posto di ${esc(ws[a.i].w)}">`);
          t.value = a.n || '';
          t.oninput = () => { a.n = t.value; fr.querySelectorAll('.pick')[a.i].textContent = t.value || ws[a.i].w; ch(); };
          inn.appendChild(t);
        }
        disegna(); box.appendChild(li);
      });
      if(!ro) box.insertAdjacentHTML('afterbegin', `<div class="hint">Una sola parola per frase: toccala e scrivi quella nuova. Toccala di nuovo per annullare.</div>`);
    }

    else if(p.tipo === 'tessere'){
      // Tessere: si compone la frase toccando le tessere nell'ordine giusto; alcune sono trappole e restano fuori
      ans.t = ans.t || [];
      const norm = s => String(s||'').toLowerCase().replace(/[«»"“”.,;:!?()]/g, '').replace(/\s+/g, ' ').trim();
      (p.voci||[]).forEach((v, k) => {
        const li = CN.h(`<div class="mossa"><div class="rs-t">${v.testo}</div>${v.compito ? `<div class="rs-c">${v.compito}</div>` : ''}<div class="frase tess-riga"></div><div class="pills tess-mazzo"></div></div>`);
        const fr = li.querySelector('.tess-riga'), mz = li.querySelector('.tess-mazzo');
        function disegna(){
          const us = ans.t[k] = (ans.t[k] || []).filter(j => j < v.tessere.length);
          fr.innerHTML = us.length ? '' : `<span class="small muted">${ro ? 'Nessuna tessera usata.' : 'Tocca le tessere qui sotto, nell\'ordine giusto…'}</span>`;
          us.forEach((j, n) => {
            const b = document.createElement(ro ? 'span' : 'button'); if(!ro) b.type = 'button';
            b.className = 'pick sel'; b.textContent = v.tessere[j];
            if(!ro) b.onclick = () => { us.splice(n, 1); ch(); disegna(); };
            fr.appendChild(b);
          });
          mz.innerHTML = '';
          if(ro){
            if(mode === 'doc' && v.soluzione){ const ok = norm(us.map(j => v.tessere[j]).join(' ')) === norm(v.soluzione);
              mz.innerHTML = `<span class="small ${ok ? '' : 'muted'}" style="${ok ? 'color:var(--ok);font-weight:800' : ''}">${ok ? '✓ uguale alla soluzione' : '✗ soluzione: ' + esc(v.soluzione)}</span>`; }
            return;
          }
          v.tessere.forEach((x, j) => { if(us.includes(j)) return;
            const b = CN.h(`<button type="button" class="pill">${esc(x)}</button>`); b.onclick = () => { us.push(j); ch(); disegna(); }; mz.appendChild(b); });
        }
        disegna(); box.appendChild(li);
      });
      if(!ro) box.insertAdjacentHTML('afterbegin', `<div class="hint">Tocca una tessera per metterla nella frase, toccala di nuovo nella frase per toglierla. Non tutte le tessere servono.</div>`);
    }

    else if(p.tipo === 'riscrivi'){
      ans.r = ans.r || [];
      const ol = CN.h(`<ol class="riscr"></ol>`);
      (p.voci||[]).forEach((v, i) => {
        const li = CN.h(`<li><div class="rs-t">${v.testo}</div><div class="rs-c">${v.compito}</div></li>`);
        if(ro) li.insertAdjacentHTML('beforeend', `<div class="risposta">${esc(ans.r[i] || '') || '<span class="muted">Nessuna risposta.</span>'}</div>`);
        else { const t = CN.h(`<textarea rows="2" placeholder="Scrivi qui la nuova frase"></textarea>`); t.value = ans.r[i] || ''; t.setAttribute('aria-label', 'Risposta ' + (i + 1)); t.oninput = () => { ans.r[i] = t.value; ch(); }; li.appendChild(t); }
        ol.appendChild(li);
      });
      box.appendChild(ol);
    }

    else if(p.tipo === 'scrivi' || p.tipo === 'frase'){
      // frase = «Tutto in una frase»: una sola frase, al massimo maxParole parole
      ans.check = ans.check || [];
      const conta = CN.h(`<div class="small muted wc"></div>`);
      const upd = () => { const n = nParole(ans.testo);
        if(p.maxParole){ conta.innerHTML = `${n} parole · massimo ${p.maxParole}${n > p.maxParole ? ' · <b style="color:var(--ko)">troppe</b>' : n ? ' ✓' : ''}`; return; }
        conta.innerHTML = `${n} parole${p.minParole ? ` · minimo ${p.minParole}` : ''}${p.minParole && n < p.minParole ? '' : p.minParole ? ' ✓' : ''}`; };
      if(ro) box.insertAdjacentHTML('beforeend', `<div class="risposta">${esc(ans.testo || '') || '<span class="muted">Nessun testo.</span>'}</div>`);
      else { const ta = CN.h(p.tipo === 'frase' ? `<textarea rows="3" placeholder="Scrivi qui la tua frase"></textarea>` : `<textarea rows="9" placeholder="Scrivi qui…"></textarea>`); ta.value = ans.testo || ''; ta.oninput = () => { ans.testo = ta.value; upd(); ch(); }; box.appendChild(ta); }
      box.appendChild(conta); upd();
      const vl = CN.h(`<div class="vincoli"><div class="f">${ro ? 'Elementi che lo studente dichiara di aver inserito' : 'Spunta ogni elemento quando l\'hai inserito'}</div></div>`);
      (p.vincoli||[]).forEach((v, i) => {
        const l = CN.h(`<label class="vc ${ans.check[i] ? 'on' : ''}"><input type="checkbox" ${ans.check[i] ? 'checked' : ''} ${ro ? 'disabled' : ''}><span>${esc(v)}</span></label>`);
        if(!ro) l.querySelector('input').onchange = e => { ans.check[i] = e.target.checked; l.classList.toggle('on', e.target.checked); ch(); };
        vl.appendChild(l);
      });
      box.appendChild(vl);
    }
    // consegne fatte quando la prova era ancora una riscrittura: le vecchie risposte si leggono lo stesso
    if(ro && ['mossa','tessere','frase'].includes(p.tipo) && Array.isArray(ans.r) && ans.r.some(x => String(x||'').trim()))
      box.insertAdjacentHTML('beforeend', `<div class="risposta"><b>Risposte date alla versione precedente della prova</b>\n${ans.r.map((x, i) => (i + 1) + '. ' + esc(x||'—')).join('\n')}</div>`);
    return box;
  }

  // Quanto è completa una consegna (per avvisare prima dell'invio)
  function mancanti(sf, risposte){
    const out = [];
    (sf.prove||[]).forEach((p, i) => {
      const a = risposte[i] || {};
      let ok = true;
      if(p.tipo === 'analisi') ok = (p.chiave || (a.tagli||[]).length > 0) && Object.values(a.etichette||{}).some(x => String(x).trim());
      if(p.tipo === 'errori') ok = Object.keys(a.sel||{}).length > 0;
      if(p.tipo === 'motiva') ok = a.scelta !== undefined;
      if(p.tipo === 'scrivi') ok = nParole(a.testo) >= (p.minParole || 1);
      if(p.tipo === 'frase') ok = nParole(a.testo) >= 1 && nParole(a.testo) <= (p.maxParole || 99);
      if(p.tipo === 'mossa') ok = (p.frasi||[]).every((f, j) => { const m = (a.m||[])[j]; return m && String(m.n||'').trim(); });
      if(p.tipo === 'tessere') ok = (p.voci||[]).every((v, j) => ((a.t||[])[j]||[]).length > 0);
      if(p.tipo === 'versione') ok = (p.frasi||[]).every((f, j) => String(((a.f||[])[j]||{}).tr||'').trim());
      if(p.tipo === 'riscrivi') ok = (p.voci||[]).every((v, j) => String((a.r||[])[j]||'').trim());
      if(!ok) out.push(i + 1);
    });
    return out;
  }

  const TIPI_PROVA = {riscrivi: 'Riscrittura', analisi: 'Analisi libera', errori: 'Caccia all\'errore', motiva: 'Chi ha ragione?', scrivi: 'Scrittura con vincoli', versione: 'Versione a tappe', mossa: 'Una mossa sola', frase: 'Tutto in una frase', tessere: 'Tessere'};
  const statoHtml = c => !c ? '<span class="badge">da affrontare</span>'
    : c.stato === 'bozza' ? '<span class="badge warn">bozza salvata</span>'
    : '<span class="badge ok">consegnata</span>';

  Object.assign(CN, {sfide: {elenco, lente, sblocco, totPunti, stelleDa, tutte, diStudente, storia, salvaConsegna, nuovaBozza, inviate,
    doc, salvaDoc, importaConsegne, letta, segnaLetta, docDi, riepilogo, renderProva, mancanti, TIPI_PROVA, statoHtml, ETICHETTE}});
})();
