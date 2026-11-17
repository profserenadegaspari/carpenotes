/* Carpe Notes — attività lunghe (più frasi o un brano in un solo esercizio).
   Si aggiungono ai tipi del motore (core.js) e stanno nel campo "attivita" di ogni argomento.
   Tipi:
     evidenzia  {testo, brano: "Il [gatto|n] dorme", categorie: {n:'nomi', ...}}           evidenziatori colorati sul brano
     classifica {testo, gruppi: [{nome, voci:[...]}]}                                         trascina o tocca per mettere ogni voce nel gruppo giusto
     correggi   {testo, brano: "Il custode [a>ha] sentito"}                                  tocca le parole sbagliate e scrivi la forma giusta
     trasforma  {testo, voci: [{t, c?, r: 'risposta|alternativa'}]}                          riscrivi ogni frase come richiesto
     cloze      {testo, brano: "Il [gatto] dorme", banca: true|false, extra: [...]}           completa il testo (con le parole date o scrivendo)
     analisi    {testo, frasi: ['Il cane=soggetto|abbaia=predicato verbale', ...], etichette} analizza più frasi di fila
     vfm        {testo, voci: [{a, v: true|false, m, d: [...]}]}                              vero o falso, e perché
     quiz       {testo, brano?, domande: [[domanda, [giusta, sbagliata, ...]], ...]}          domande a scelta multipla su un testo
     versione   {testo, categorie, frasi: [{la: "[Caesar|s] [vicit|v]", lex?, domanda?: [q, [giusta, ...]], trad: [giusta, sbagliata, ...]}]}
                versione guidata: per ogni frase si evidenziano verbo, soggetto… e si sceglie la traduzione; alla fine si legge la traduzione completa
*/
(function(){
  const {esc, norm, shuffle, toast} = CN;
  const COL = ['yellow', 'green', 'pink', 'blue', 'orange'];
  const changed = opts => opts.onChange && opts.onChange();
  const pulisci = s => norm(s).replace(/[«»"“”]/g, '').replace(/\s+([.,;:!?])/g, '$1').replace(/[.!?;:,]+$/, '').trim();

  function parseMarcato(brano){
    // "[parola|k]," -> {t:'parola,', k:'k'} ; parole normali -> {t}
    // sp = c'è uno spazio dopo (per «l'[amica|n]» senza spazio dopo l'apostrofo)
    const out = []; const src = brano||''; const re = /\[([^\]|]+)\|([^\]]+)\]([^\s\[]*)|([^\s\[]+)/g; let m;
    while((m = re.exec(src))){ const sp = /\s/.test(src[re.lastIndex] || ' '); if(m[1]) out.push({t: m[1] + m[3], k: m[2].trim(), sp}); else out.push({t: m[4], sp}); }
    return out;
  }
  function parseErrori(brano){
    const out = []; const src = brano||''; const re = /\[([^\]>]+)>([^\]]+)\]([^\s\[]*)|([^\s\[]+)/g; let m;
    while((m = re.exec(src))){ const sp = /\s/.test(src[re.lastIndex] || ' '); if(m[1]) out.push({t: m[1], suf: m[3], giuste: m[2].split('|').map(x => x.trim()), sp}); else out.push({t: m[4], suf: '', sp}); }
    return out;
  }
  function parseCloze(brano){
    const out = []; const re = /\[([^\]]+)\]|([^\[]+)/g; let m;
    while((m = re.exec(brano||''))){ if(m[1]) out.push({blank: true, r: m[1].split('|').map(x => x.trim())}); else out.push({txt: m[2]}); }
    return out;
  }
  const parseFrase = f => String(f).split('|').map(p => { const [t, e] = p.split('='); return {t: t.trim(), e: (e||'').trim()}; });

  // Quanti elementi conta un'attività (per il menu e per i punti)
  function conta(es){
    switch(es.tipo){
      case 'evidenzia': return parseMarcato(es.brano).filter(t => t.k).length;
      case 'classifica': return (es.gruppi||[]).reduce((n, g) => n + (g.voci||[]).length, 0);
      case 'correggi': return parseErrori(es.brano).filter(t => t.giuste).length;
      case 'trasforma': case 'vfm': return (es.voci||[]).length;
      case 'cloze': return parseCloze(es.brano).filter(x => x.blank).length;
      case 'analisi': return (es.frasi||[]).reduce((n, f) => n + parseFrase(f).filter(p => p.e).length, 0);
      case 'quiz': return (es.domande||[]).length;
      case 'versione': return (es.frasi||[]).reduce((n, f) => n + parseMarcato(f.la).filter(t => t.k).length + 1 + (f.domanda ? 1 : 0), 0);
      default: return 1;
    }
  }
  const UNITA = {evidenzia: 'parole da trovare', classifica: 'voci da classificare', correggi: 'errori da trovare', trasforma: 'frasi da trasformare',
    cloze: 'spazi da completare', analisi: 'elementi da analizzare', vfm: 'affermazioni', quiz: 'domande', versione: 'passaggi'};

  const R = {};

  /* ---------- Evidenzia nel brano ---------- */
  R.evidenzia = (es, box, opts) => {
    box.insertAdjacentHTML('beforeend', `<div class="ex-q">${es.testo}</div>`);
    const toks = parseMarcato(es.brano), cats = Object.entries(es.categorie || {x: 'parole'});
    const colore = {}; cats.forEach(([k], i) => colore[k] = COL[i % COL.length]);
    let pen = cats[0][0]; const mark = {};
    const pal = CN.h(`<div class="pens" role="group" aria-label="Evidenziatori"></div>`);
    cats.forEach(([k, nome]) => {
      const b = CN.h(`<button type="button" class="pen c-${colore[k]}"><i></i>${esc(nome)}</button>`);
      b.onclick = () => { pen = k; pal.querySelectorAll('.pen').forEach(x => x.classList.toggle('on', x === b)); };
      if(k === pen) b.classList.add('on'); pal.appendChild(b);
    });
    if(cats.length > 1) box.appendChild(pal);
    const br = CN.h(`<div class="brano"></div>`);
    const btns = toks.map((t, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'w'; b.textContent = t.t;
      b.onclick = () => { if(box.dataset.done) return; if(mark[i] === pen) delete mark[i]; else mark[i] = pen;
        b.className = 'w' + (mark[i] ? ' hl-' + colore[mark[i]] : ''); changed(opts); };
      br.appendChild(b); if(t.sp) br.appendChild(document.createTextNode(' ')); return b;
    });
    box.appendChild(br);
    box.insertAdjacentHTML('beforeend', `<div class="hint">${cats.length > 1 ? 'Scegli l\'evidenziatore e tocca le parole. ' : 'Tocca le parole per evidenziarle. '}Tocca di nuovo per togliere il colore.</div>`);
    return () => {
      if(!Object.keys(mark).length) return null;
      let ok = 0, fp = 0; const T = toks.filter(t => t.k).length;
      toks.forEach((t, i) => {
        const b = btns[i];
        if(t.k){ if(mark[i] === t.k){ ok++; b.classList.add('ok'); } else { b.classList.add(mark[i] ? 'bad' : 'miss'); b.title = (cats.find(c => c[0] === t.k)||[])[1] || ''; if(cats.length > 1) b.insertAdjacentHTML('beforeend', `<sup>${esc(b.title)}</sup>`); } }
        else if(mark[i]){ fp++; b.classList.add('bad'); }
      });
      box.insertAdjacentHTML('beforeend', `<div class="legend" style="margin-top:8px"><span><i style="outline:2px solid var(--ok)"></i>giusta</span><span><i style="outline:2px dashed var(--ok)"></i>da evidenziare</span><span><i style="background:var(--ko-soft);outline:2px solid var(--ko)"></i>sbagliata</span></div>`);
      return {punti: T ? ok / (T + fp) : 0, n: T, ok};
    };
  };

  /* ---------- Classifica ---------- */
  R.classifica = (es, box, opts) => {
    box.insertAdjacentHTML('beforeend', `<div class="ex-q">${es.testo}</div>`);
    const voci = []; (es.gruppi||[]).forEach((g, gi) => (g.voci||[]).forEach(v => voci.push({v, g: gi})));
    const ord = opts.noShuffle ? voci.map((_, i) => i) : shuffle(voci.map((_, i) => i));
    const pool = CN.h(`<div class="pool" aria-label="Voci da classificare"></div>`);
    const bins = CN.h(`<div class="bins"></div>`);
    const posto = {}; let sel = null; let drag = null;
    const chips = {};
    const metti = (i, dest) => { (dest === null ? pool : bins.querySelector(`[data-g="${dest}"] .drop`)).appendChild(chips[i]); if(dest === null) delete posto[i]; else posto[i] = dest; sel = null; aggiorna(); changed(opts); };
    const aggiorna = () => { Object.entries(chips).forEach(([i, c]) => c.classList.toggle('sel', String(sel) === i)); pool.classList.toggle('vuoto', !pool.children.length); };
    ord.forEach(i => {
      const c = CN.h(`<button type="button" class="chip-v" draggable="true">${esc(voci[i].v)}</button>`);
      c.onclick = e => { e.stopPropagation(); if(box.dataset.done) return; sel = sel === i ? null : i; aggiorna(); };
      c.ondragstart = e => { drag = i; try{ e.dataTransfer.setData('text/plain', String(i)); }catch(err){} };
      chips[i] = c; pool.appendChild(c);
    });
    (es.gruppi||[]).forEach((g, gi) => {
      const b = CN.h(`<div class="bin" data-g="${gi}"><div class="bh">${esc(g.nome)}</div><div class="drop"></div></div>`);
      b.onclick = () => { if(box.dataset.done) return; if(sel === null){ toast('Tocca prima una voce, poi il gruppo'); return; } metti(sel, gi); };
      b.ondragover = e => e.preventDefault(); b.ondrop = e => { e.preventDefault(); if(drag !== null && !box.dataset.done) metti(drag, gi); drag = null; };
      bins.appendChild(b);
    });
    pool.onclick = () => { if(sel !== null && posto[sel] !== undefined && !box.dataset.done) metti(sel, null); };
    pool.ondragover = e => e.preventDefault(); pool.ondrop = e => { e.preventDefault(); if(drag !== null && !box.dataset.done) metti(drag, null); drag = null; };
    box.appendChild(pool); box.appendChild(bins);
    box.insertAdjacentHTML('beforeend', `<div class="hint">Trascina ogni voce nel gruppo giusto, oppure tocca la voce e poi il gruppo. Per spostarla di nuovo, toccala.</div>`);
    return () => {
      if(Object.keys(posto).length < voci.length) return null;
      let ok = 0;
      voci.forEach((v, i) => { const good = posto[i] === v.g; chips[i].classList.add(good ? 'right' : 'wrong'); if(good) ok++; else chips[i].insertAdjacentHTML('beforeend', `<small> → ${esc(es.gruppi[v.g].nome)}</small>`); chips[i].disabled = true; });
      return {punti: voci.length ? ok / voci.length : 0, n: voci.length, ok};
    };
  };

  /* ---------- Individua e correggi ---------- */
  R.correggi = (es, box, opts) => {
    box.insertAdjacentHTML('beforeend', `<div class="ex-q">${es.testo}</div>`);
    const toks = parseErrori(es.brano), edit = {};
    const br = CN.h(`<div class="brano"></div>`);
    const nodi = toks.map((t, i) => {
      const span = document.createElement('span'); span.className = 'cw';
      const b = document.createElement('button'); b.type = 'button'; b.className = 'w'; b.textContent = t.t;
      b.onclick = () => {
        if(box.dataset.done) return;
        const inp = document.createElement('input'); inp.type = 'text'; inp.className = 'fix'; inp.value = edit[i] !== undefined ? edit[i] : t.t;
        inp.size = Math.max(4, inp.value.length + 2); inp.setAttribute('aria-label', 'Correzione di «' + t.t + '»');
        const fine = () => { const v = inp.value.trim(); if(!v || v === t.t) delete edit[i]; else edit[i] = v; b.textContent = edit[i] !== undefined ? edit[i] : t.t; b.classList.toggle('edited', edit[i] !== undefined); inp.replaceWith(b); changed(opts); };
        inp.oninput = () => { inp.size = Math.max(4, inp.value.length + 2); };
        inp.onkeydown = e => { if(e.key === 'Enter'){ e.preventDefault(); inp.blur(); } if(e.key === 'Escape'){ inp.value = t.t; inp.blur(); } };
        inp.onblur = fine;
        b.replaceWith(inp); inp.focus(); inp.select();
      };
      span.appendChild(b); if(t.suf) span.appendChild(document.createTextNode(t.suf));
      br.appendChild(span); if(t.sp) br.appendChild(document.createTextNode(' '));
      return {span, b};
    });
    box.appendChild(br);
    const nE = toks.filter(t => t.giuste).length;
    box.insertAdjacentHTML('beforeend', `<div class="hint">Tocca una parola sbagliata e scrivi la forma corretta (Invio per confermare). Gli errori da trovare sono ${nE}.</div>`);
    return () => {
      if(document.activeElement && document.activeElement.classList.contains('fix')) document.activeElement.blur();
      if(!Object.keys(edit).length) return null;
      let ok = 0, fp = 0;
      toks.forEach((t, i) => {
        const {span} = nodi[i]; const b = span.querySelector('button'); if(!b) return; b.disabled = true;
        if(t.giuste){
          const good = edit[i] !== undefined && t.giuste.map(pulisci).includes(pulisci(edit[i]));
          if(good){ ok++; b.classList.add('ok'); }
          else { b.classList.add(edit[i] !== undefined ? 'bad' : 'miss'); b.textContent = t.t; b.insertAdjacentHTML('afterend', `<span class="corr">${esc(t.giuste[0])}</span>`); }
        } else if(edit[i] !== undefined){ fp++; b.classList.add('bad'); b.title = 'Era già giusta: ' + t.t; b.insertAdjacentHTML('afterend', `<span class="corr">${esc(t.t)}</span>`); }
      });
      return {punti: nE ? ok / (nE + fp) : 0, n: nE, ok};
    };
  };

  /* ---------- Trasforma ---------- */
  R.trasforma = (es, box, opts) => {
    box.insertAdjacentHTML('beforeend', `<div class="ex-q">${es.testo}</div>`);
    const ol = CN.h(`<ol class="tlist"></ol>`); const ins = [];
    (es.voci||[]).forEach(v => {
      const li = CN.h(`<li><div class="tt">${v.t}</div>${v.c ? `<div class="tc">${v.c}</div>` : ''}<input type="text" autocomplete="off" spellcheck="false" placeholder="Scrivi la frase trasformata"></li>`);
      const inp = li.querySelector('input'); inp.oninput = () => changed(opts); inp.onkeydown = e => { if(e.key === 'Enter'){ const nx = ins[ins.indexOf(inp) + 1]; if(nx) nx.focus(); else opts.onEnter && opts.onEnter(); } };
      ins.push(inp); ol.appendChild(li);
    });
    box.appendChild(ol);
    return () => {
      if(ins.some(i => !i.value.trim())) return null;
      let ok = 0;
      (es.voci||[]).forEach((v, k) => {
        const acc = String(v.r).split('|').map(pulisci); const good = acc.includes(pulisci(ins[k].value));
        ins[k].disabled = true; ins[k].classList.add(good ? 'right' : 'wrong'); if(good) ok++;
        else ins[k].insertAdjacentHTML('afterend', `<div class="sol-line">→ ${esc(String(v.r).split('|')[0])}</div>`);
      });
      return {punti: ins.length ? ok / ins.length : 0, n: ins.length, ok};
    };
  };

  /* ---------- Completa il testo ---------- */
  R.cloze = (es, box, opts) => {
    box.insertAdjacentHTML('beforeend', `<div class="ex-q">${es.testo}</div>`);
    const parti = parseCloze(es.brano), conBanca = es.banca !== false;
    const slots = []; let attivo = null;
    const br = CN.h(`<div class="brano cloze"></div>`);
    const bank = CN.h(`<div class="bank"></div>`);
    const chipsB = [];
    const svuota = sl => { if(sl.chip){ sl.chip.disabled = false; sl.chip.classList.remove('used'); sl.chip = null; } sl.val = ''; sl.el.textContent = ''; sl.el.classList.remove('full'); };
    const evid = () => slots.forEach(sl => sl.el.classList.toggle('on', sl === attivo));
    parti.forEach(p => {
      if(!p.blank){ br.appendChild(document.createTextNode(p.txt)); return; }
      if(conBanca){
        const el = document.createElement('button'); el.type = 'button'; el.className = 'slot';
        const sl = {el, r: p.r, val: '', chip: null}; slots.push(sl);
        el.onclick = () => { if(box.dataset.done) return; if(sl.val){ svuota(sl); changed(opts); } attivo = sl; evid(); };
        br.appendChild(el);
      } else {
        const el = document.createElement('input'); el.type = 'text'; el.className = 'fill'; el.autocomplete = 'off'; el.spellcheck = false;
        el.style.minWidth = '90px'; el.size = Math.max(5, p.r[0].length + 2); el.oninput = () => changed(opts);
        slots.push({el, r: p.r, input: true}); br.appendChild(el);
      }
    });
    box.appendChild(br);
    if(conBanca){
      const parole = slots.map(sl => sl.r[0]).concat(es.extra || []);
      shuffle(parole).forEach(w => {
        const c = CN.h(`<button type="button" class="chip-v">${esc(w)}</button>`);
        c.onclick = () => {
          if(box.dataset.done) return;
          const sl = attivo && !attivo.val ? attivo : slots.find(x => !x.val); if(!sl) return;
          sl.val = w; sl.chip = c; sl.el.textContent = w; sl.el.classList.add('full'); c.disabled = true; c.classList.add('used');
          attivo = slots.find(x => !x.val) || null; evid(); changed(opts);
        };
        chipsB.push(c); bank.appendChild(c);
      });
      box.insertBefore(bank, br);
      box.insertAdjacentHTML('beforeend', `<div class="hint">Tocca uno spazio e poi la parola giusta (o tocca solo le parole: riempiono gli spazi in ordine). Tocca uno spazio pieno per svuotarlo.</div>`);
      attivo = slots[0] || null; evid();
    }
    return () => {
      const val = sl => sl.input ? sl.el.value : sl.val;
      if(slots.some(sl => !String(val(sl)).trim())) return null;
      let ok = 0;
      slots.forEach(sl => { const good = sl.r.map(pulisci).includes(pulisci(val(sl))); sl.el.classList.add(good ? 'right' : 'wrong'); sl.el.disabled = true; if(good) ok++; else sl.el.insertAdjacentHTML('afterend', `<span class="corr">${esc(sl.r[0])}</span>`); });
      slots.forEach(sl => sl.el.classList.remove('on'));
      return {punti: slots.length ? ok / slots.length : 0, n: slots.length, ok};
    };
  };

  /* ---------- Analisi di più frasi ---------- */
  R.analisi = (es, box, opts) => {
    box.insertAdjacentHTML('beforeend', `<div class="ex-q">${es.testo}</div>`);
    const labels = es.etichette || [];
    const sels = [];
    const ol = CN.h(`<ol class="alist"></ol>`);
    (es.frasi||[]).forEach(f => {
      const li = document.createElement('li'); const fr = document.createElement('div'); fr.className = 'frase';
      parseFrase(f).forEach(p => {
        const t = document.createElement('div'); t.className = 'tok' + (p.e ? '' : ' plain');
        t.innerHTML = `<span class="w">${esc(p.t)}</span>`;
        if(p.e){ const s = document.createElement('select'); s.innerHTML = `<option value="">— scegli —</option>` + labels.map(l => `<option>${esc(l)}</option>`).join(''); s.onchange = () => changed(opts); t.appendChild(s); sels.push({s, p, t}); }
        fr.appendChild(t);
      });
      li.appendChild(fr); ol.appendChild(li);
    });
    box.appendChild(ol);
    return () => {
      if(sels.some(x => !x.s.value)) return null;
      let ok = 0;
      sels.forEach(x => { const good = norm(x.s.value) === norm(x.p.e); x.t.classList.add(good ? 'right' : 'wrong'); x.s.disabled = true; if(good) ok++; else x.t.insertAdjacentHTML('beforeend', `<span class="sol">${esc(x.p.e)}</span>`); });
      return {punti: sels.length ? ok / sels.length : 0, n: sels.length, ok};
    };
  };

  /* ---------- Vero o falso motivato ---------- */
  R.vfm = (es, box, opts) => {
    box.insertAdjacentHTML('beforeend', `<div class="ex-q">${es.testo}</div>`);
    const ol = CN.h(`<ol class="vlist"></ol>`); const st = [];
    (es.voci||[]).forEach(v => {
      const mot = shuffle([v.m].concat(v.d || []));
      const li = CN.h(`<li><div class="tt">${v.a}</div><div class="vrow"><button type="button" class="vf" data-v="1">Vero</button><button type="button" class="vf" data-v="0">Falso</button>
        <select aria-label="Perché?"><option value="">— perché? —</option>${mot.map(m => `<option>${esc(m)}</option>`).join('')}</select></div></li>`);
      const x = {li, v, scelta: null, sel: li.querySelector('select')};
      li.querySelectorAll('.vf').forEach(b => b.onclick = () => { if(box.dataset.done) return; x.scelta = b.dataset.v === '1'; li.querySelectorAll('.vf').forEach(y => y.classList.toggle('on', y === b)); changed(opts); });
      x.sel.onchange = () => changed(opts);
      st.push(x); ol.appendChild(li);
    });
    box.appendChild(ol);
    return () => {
      if(st.some(x => x.scelta === null || !x.sel.value)) return null;
      let pt = 0, ok = 0;
      st.forEach(x => {
        const a = x.scelta === x.v.v, b = x.sel.value === x.v.m; x.sel.disabled = true;
        pt += (a ? .5 : 0) + (b ? .5 : 0); if(a && b) ok++;
        x.li.classList.add(a && b ? 'right' : a || b ? 'half' : 'wrong');
        if(!(a && b)) x.li.insertAdjacentHTML('beforeend', `<div class="sol-line">→ ${x.v.v ? 'Vero' : 'Falso'}: ${esc(x.v.m)}</div>`);
      });
      return {punti: st.length ? pt / st.length : 0, n: st.length, ok};
    };
  };

  /* ---------- Domande su un testo ---------- */
  R.quiz = (es, box, opts) => {
    box.insertAdjacentHTML('beforeend', `<div class="ex-q">${es.testo}</div>${es.brano ? `<div class="brano lettura">${es.brano}</div>` : ''}`);
    const ol = CN.h(`<ol class="qlist"></ol>`); const st = [];
    (es.domande||[]).forEach(([q, opz]) => {
      const ordine = shuffle(opz.map((_, i) => i));
      const li = CN.h(`<li><div class="tt">${q}</div><div class="opts"></div></li>`); const wrap = li.querySelector('.opts');
      const x = {sel: null, btn: {}};
      ordine.forEach((i, pos) => { const b = CN.h(`<button type="button" class="opt"><span class="k">${'ABCDE'[pos]}</span><span>${opz[i]}</span></button>`);
        b.onclick = () => { if(box.dataset.done) return; x.sel = i; wrap.querySelectorAll('.opt').forEach(y => y.classList.toggle('sel', y === b)); changed(opts); };
        x.btn[i] = b; wrap.appendChild(b); });
      st.push(x); ol.appendChild(li);
    });
    box.appendChild(ol);
    return () => {
      if(st.some(x => x.sel === null)) return null;
      let ok = 0;
      st.forEach(x => { x.btn[0].classList.add('right'); if(x.sel === 0) ok++; else x.btn[x.sel].classList.add('wrong'); });
      return {punti: st.length ? ok / st.length : 0, n: st.length, ok};
    };
  };

  /* ---------- Versione guidata ---------- */
  R.versione = (es, box, opts) => {
    box.insertAdjacentHTML('beforeend', `<div class="ex-q">${es.testo}</div>`);
    const cats = Object.entries(es.categorie || {v: 'verbo', s: 'soggetto', o: 'complemento oggetto'});
    const colore = {}; cats.forEach(([k], i) => colore[k] = COL[i % COL.length]);
    const nomeCat = k => (cats.find(c => c[0] === k) || [])[1] || '';
    // il brano intero, da leggere prima di cominciare
    const intero = (es.frasi||[]).map(f => parseMarcato(f.la).map(t => t.t + (t.sp ? ' ' : '')).join('')).join(' ');
    box.insertAdjacentHTML('beforeend', `<details class="ver-intero" open><summary>Leggi prima tutto il brano</summary><div class="brano lettura">${esc(intero)}</div></details>`);
    const ol = CN.h(`<div class="ver-list"></div>`); const st = [];
    (es.frasi||[]).forEach((f, fi) => {
      const li = CN.h(`<div class="ver-frase"><div class="ver-n">Frase ${fi + 1} di ${es.frasi.length}</div></div>`);
      const toks = parseMarcato(f.la), mark = {};
      const daTrovare = [...new Set(toks.filter(t => t.k).map(t => t.k))];
      const usate = cats.filter(([k]) => daTrovare.includes(k));
      let pen = usate.length ? usate[0][0] : null;
      li.insertAdjacentHTML('beforeend', `<div class="ver-passo"><b>a.</b> ${usate.length > 1 ? 'Scegli l’evidenziatore e tocca nella frase: ' + usate.map(([, n]) => '<b>' + esc(n) + '</b>').join(', ') + '.' : 'Tocca nella frase: <b>' + esc(usate.length ? usate[0][1] : '') + '</b>.'}</div>`);
      if(usate.length > 1){
        const pal = CN.h(`<div class="pens" role="group" aria-label="Evidenziatori"></div>`);
        usate.forEach(([k, nome]) => { const b = CN.h(`<button type="button" class="pen c-${colore[k]}"><i></i>${esc(nome)}</button>`);
          b.onclick = () => { pen = k; pal.querySelectorAll('.pen').forEach(x => x.classList.toggle('on', x === b)); };
          if(k === pen) b.classList.add('on'); pal.appendChild(b); });
        li.appendChild(pal);
      }
      const br = CN.h(`<div class="brano"></div>`);
      const btns = toks.map((t, i) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'w'; b.textContent = t.t;
        b.onclick = () => { if(box.dataset.done || !pen) return; if(mark[i] === pen) delete mark[i]; else mark[i] = pen; b.className = 'w' + (mark[i] ? ' hl-' + colore[mark[i]] : ''); changed(opts); };
        br.appendChild(b); if(t.sp) br.appendChild(document.createTextNode(' ')); return b;
      });
      li.appendChild(br);
      if(f.lex) li.insertAdjacentHTML('beforeend', `<div class="ver-lex"><b>Parole utili</b> ${f.lex}</div>`);
      const scelta = (q, opz, n) => {
        const ordine = opts.noShuffle ? opz.map((_, i) => i) : shuffle(opz.map((_, i) => i));
        const d = CN.h(`<div class="ver-q"><div class="ver-passo"><b>${n}.</b> ${q}</div><div class="opts"></div></div>`); const wrap = d.querySelector('.opts');
        const x = {sel: null, btn: {}};
        ordine.forEach((i, pos) => { const b = CN.h(`<button type="button" class="opt"><span class="k">${'ABCDE'[pos]}</span><span>${opz[i]}</span></button>`);
          b.onclick = () => { if(box.dataset.done) return; x.sel = i; wrap.querySelectorAll('.opt').forEach(y => y.classList.toggle('sel', y === b)); changed(opts); };
          x.btn[i] = b; wrap.appendChild(b); });
        li.appendChild(d); return x;
      };
      const dom = f.domanda ? scelta(f.domanda[0], f.domanda[1], 'b') : null;
      const tr = scelta('Scegli la traduzione migliore.', f.trad, f.domanda ? 'c' : 'b');
      st.push({li, toks, mark, btns, dom, tr, f});
      ol.appendChild(li);
    });
    box.appendChild(ol);
    box.insertAdjacentHTML('beforeend', `<div class="hint">Lavora una frase alla volta: prima trova le parole chiave, poi scegli la traduzione. Tocca di nuovo una parola per togliere il colore.</div>`);
    return () => {
      if(st.some(x => x.tr.sel === null || (x.dom && x.dom.sel === null))) return null;
      let ok = 0, T = 0, fp = 0;
      st.forEach(x => {
        x.toks.forEach((t, i) => { const b = x.btns[i];
          if(t.k){ T++; if(x.mark[i] === t.k){ ok++; b.classList.add('ok'); } else { b.classList.add(x.mark[i] ? 'bad' : 'miss'); b.insertAdjacentHTML('beforeend', `<sup>${esc(nomeCat(t.k))}</sup>`); } }
          else if(x.mark[i]){ fp++; b.classList.add('bad'); } });
        [x.dom, x.tr].filter(Boolean).forEach(q => { T++; q.btn[0].classList.add('right'); if(q.sel === 0) ok++; else q.btn[q.sel].classList.add('wrong'); });
      });
      box.insertAdjacentHTML('beforeend', `<div class="ver-finale"><b>La traduzione completa</b><p>${st.map(x => x.f.trad[0]).join(' ')}</p></div>`);
      return {punti: T ? ok / (T + fp) : 0, n: T, ok};
    };
  };

  Object.assign(CN.TIPI, {evidenzia: 'Evidenzia nel testo', classifica: 'Classifica', correggi: 'Trova e correggi', trasforma: 'Trasforma le frasi',
    cloze: 'Completa il testo', analisi: 'Analizza le frasi', vfm: 'Vero o falso, e perché', quiz: 'Domande sul testo', versione: 'Versione guidata'});
  CN.TIPI_EXTRA = R;
  CN.attivita = {conta, UNITA, parseMarcato, parseErrori, parseCloze, parseFrase};
})();
