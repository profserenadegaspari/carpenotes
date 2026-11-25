/* Carpe Notes — nucleo comune: dati, salvataggio locale, motore degli esercizi */
(function(){
  const K = {
    cat: 'cn_catalogo',            // copia dei contenuti modificata dalla docente (su questo dispositivo)
    stud: 'cn_studente',           // studente attivo su questo dispositivo
    ris: 'cn_risultati',           // risultati registrati su questo dispositivo
    imp: 'cn_risultati_importati', // risultati importati dalla docente
    pin: 'cn_pin',
    sess: 'cn_docente_ok'
  };
  function load(k, d){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return d; } }
  function save(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); return true; }catch(e){ return false; } }
  function del(k){ try{ localStorage.removeItem(k); }catch(e){} }
  const clone = o => JSON.parse(JSON.stringify(o));
  const uid = p => (p||'x') + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  const esc = s => String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = s => String(s||'').trim().toLowerCase().replace(/\s+/g,' ').replace(/[’`]/g,"'");
  function shuffle(a){ a = a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

  /* ---------- Catalogo dei contenuti ---------- */
  function fileCatalog(){ return clone(window.CARPE_CONTENUTI || {versione:0, materie:[], impostazioni:{}}); }
  function catalog(){
    const loc = load(K.cat, null);
    const c = loc && loc.materie ? loc : fileCatalog();
    if(c === loc){ // catalogo salvato dalla docente prima delle attività lunghe: le prende dal file
      const f = fileCatalog(), att = {};
      if(f.sfide) c.sfide = f.sfide; // le sfide si scrivono solo nel file contenuti.js: valgono sempre quelle del file
      (f.materie||[]).forEach(m => (m.sezioni||[]).forEach(s => (s.argomenti||[]).forEach(a => { if(a.attivita) att[a.id] = a.attivita; })));
      c.materie.forEach(m => (m.sezioni||[]).forEach(s => (s.argomenti||[]).forEach(a => { if(!a.attivita && att[a.id]) a.attivita = att[a.id]; })));
      // sezioni arrivate con un contenuti.js più recente (es. Latino): si aggiungono senza toccare le modifiche della docente
      (f.materie||[]).forEach(fm => {
        const m = c.materie.find(x => x.id === fm.id);
        if(!m){ c.materie.push(fm); return; }
        m.sezioni = m.sezioni || [];
        (fm.sezioni||[]).forEach(fs => {
          const ms = m.sezioni.find(x => x.id === fs.id);
          if(!ms){ m.sezioni.push(fs); return; }
          // argomenti nuovi dentro una sezione esistente: si inseriscono dopo quello che li precede nel file
          ms.argomenti = ms.argomenti || [];
          (fs.argomenti||[]).forEach((fa, i) => {
            if(ms.argomenti.some(x => x.id === fa.id)) return;
            const prima = i > 0 ? ms.argomenti.findIndex(x => x.id === fs.argomenti[i-1].id) : -1;
            ms.argomenti.splice(prima >= 0 ? prima + 1 : ms.argomenti.length, 0, fa);
          });
        });
      });
    }
    c.impostazioni = Object.assign({sbloccoProgressivo:true, soglia:60}, c.impostazioni||{});
    return c;
  }
  function hasLocalCatalog(){ return !!load(K.cat, null); }
  function saveCatalog(c){ c.modificato = new Date().toISOString(); return save(K.cat, c); }
  function resetCatalog(){ del(K.cat); }
  function findArg(c, mId, sId, aId){
    const m = c.materie.find(x=>x.id===mId); if(!m) return {};
    const s = (m.sezioni||[]).find(x=>x.id===sId); if(!s) return {m};
    const a = (s.argomenti||[]).find(x=>x.id===aId);
    return {m, s, a};
  }

  /* ---------- Studente e risultati ---------- */
  // Nome e cognome sempre con l'iniziale maiuscola, anche se lo studente scrive "giulia rossi"
  const maiuscole = t => String(t || '').trim().replace(/\s+/g, ' ').replace(/(^|[\s'’-])(\p{Ll})/gu, (m, p, c) => p + c.toUpperCase());
  const conNome = s => s ? Object.assign({}, s, {nome: maiuscole(s.nome)}) : s;
  const studente = () => conNome(load(K.stud, null));
  const setStudente = s => save(K.stud, conNome(s));
  const logoutStudente = () => del(K.stud);
  const studKey = s => norm(s.nome) + '|' + norm(s.classe);
  const risultati = () => load(K.ris, []);
  // Anteprima della prof: tutto sbloccato, nessun risultato salvato (non sporca le statistiche della classe)
  const anteprima = () => { const s = load(K.stud, null); return !!(s && s.anteprima); };
  const entraAnteprima = () => save(K.stud, {nome: 'Prof (anteprima)', classe: 'PROF', anteprima: true});
  const pinDocente = () => load(K.pin, 'docente');
  function addRisultato(r){ if(anteprima()) return; const a = risultati(); a.push(r); save(K.ris, a); }
  function risultatiStudente(s){ const k = studKey(s); return risultati().filter(r => studKey(r) === k); }
  function migliore(s, aId){
    const rs = risultatiStudente(s).filter(r => r.argomento === aId && !r.ripasso);
    return rs.length ? Math.max(...rs.map(r=>r.punteggio)) : null;
  }
  function tuttiRisultati(){
    const map = new Map();
    [...risultati(), ...load(K.imp, [])].forEach(r => map.set(r.id, r));
    return [...map.values()].sort((a,b)=> (b.data||'').localeCompare(a.data||''));
  }
  function importaRisultati(arr){
    const imp = load(K.imp, []); const ids = new Set(imp.map(r=>r.id).concat(risultati().map(r=>r.id)));
    let n = 0; arr.forEach(r => { if(r && r.id && !ids.has(r.id)){ imp.push(r); ids.add(r.id); n++; } });
    save(K.imp, imp); return n;
  }
  function cancellaRisultati(){ del(K.imp); del(K.ris); }

  /* ---------- Utilità interfaccia ---------- */
  function modale(inner){
    const bg = document.createElement('div'); bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true" style="max-width:520px">${inner}</div>`;
    document.body.appendChild(bg); return bg;
  }
  // Conferma e domanda fatte nella pagina (al posto di confirm/prompt del browser)
  function conferma(msg, ok){
    return new Promise(res => {
      const bg = modale(`<p style="font-size:1.05rem">${esc(msg)}</p><div class="btn-row" style="justify-content:flex-end;margin-top:16px"><button class="btn ghost" data-no>Annulla</button><button class="btn primary" data-ok>${esc(ok||'Conferma')}</button></div>`);
      const end = v => { bg.remove(); res(v); };
      bg.querySelector('[data-no]').onclick = () => end(false);
      bg.querySelector('[data-ok]').onclick = () => end(true);
      bg.onclick = e => { if(e.target === bg) end(false); };
      bg.querySelector('[data-ok]').focus();
    });
  }
  function chiedi(msg){
    return new Promise(res => {
      const bg = modale(`<form><label class="f" for="cn-ask">${esc(msg)}</label><input type="text" id="cn-ask" autocomplete="off"><div class="btn-row" style="justify-content:flex-end;margin-top:16px"><button type="button" class="btn ghost" data-no>Annulla</button><button class="btn primary">Crea</button></div></form>`);
      const inp = bg.querySelector('input'); const end = v => { bg.remove(); res(v); };
      bg.querySelector('[data-no]').onclick = () => end(null);
      bg.querySelector('form').onsubmit = e => { e.preventDefault(); end(inp.value.trim() || null); };
      setTimeout(()=>inp.focus(), 20);
    });
  }
  // Scaricamento file, con in più la possibilità di copiare il testo (utile dove i download sono bloccati)
  function download(nome, testo, tipo){
    try{
      const b = new Blob([testo], {type: tipo||'application/json'});
      const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = nome;
      document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 500);
    }catch(e){}
    const bg = modale(`<h3>${esc(nome)}</h3><p class="muted small">Se il file non si è scaricato, copia il testo qui sotto e incollalo dove ti serve (per esempio in un nuovo file con questo nome, o nella pagina dei risultati della docente).</p>
      <textarea class="code" readonly style="min-height:160px">${esc(testo)}</textarea>
      <div class="btn-row" style="justify-content:flex-end;margin-top:12px"><button class="btn" data-copy>Copia il testo</button><button class="btn primary" data-close>Chiudi</button></div>`);
    const ta = bg.querySelector('textarea');
    bg.querySelector('[data-close]').onclick = () => bg.remove();
    bg.onclick = e => { if(e.target === bg) bg.remove(); };
    bg.querySelector('[data-copy]').onclick = () => {
      const fall = () => { ta.focus(); ta.select(); toast('Testo selezionato: premi Ctrl+C (o Cmd+C) per copiarlo'); };
      try{ navigator.clipboard.writeText(testo).then(() => toast('Testo copiato'), fall); }catch(e){ fall(); }
    };
  }
  function toast(msg){
    const t = document.createElement('div'); t.className='toast'; t.textContent = msg;
    document.body.appendChild(t); setTimeout(()=>t.remove(), 2600);
  }
  function h(html){ const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }

  /* ---------- Motore degli esercizi ----------
     Tipi:
       scelta     {testo, opzioni[], corretta (indice), spiegazione}
       vf         {testo, corretta (true/false), spiegazione}
       completa   {testo con ___, risposte[] (accettate), spiegazione}
       individua  {testo (consegna), frase con *parole* da trovare, spiegazione}
       etichetta  {testo (consegna), parti:[{t, e}] (e vuoto = non richiesto), etichette[], spiegazione}
       abbina     {testo (consegna), coppie:[[sinistra, destra], ...], spiegazione}
  */
  const TIPI = {
    scelta: 'Scelta multipla', vf: 'Vero o falso', completa: 'Completa',
    individua: 'Individua nella frase', etichetta: 'Analizza la frase', abbina: 'Abbina'
  };
  function parseIndividua(frase){
    // "Il *gatto* nero" -> [{t:'Il',ok:false},{t:'gatto',ok:true},{t:'nero',ok:false}]
    const out = []; const re = /\*([^*]+)\*([.,;:!?»”)]*)|(\S+)/g; let m;
    while((m = re.exec(frase||''))){
      if(m[1]) out.push({t:m[1] + (m[2]||''), ok:true}); else out.push({t:m[3], ok:false});
    }
    return out;
  }
  function etichetteDi(es){
    if(es.etichette && es.etichette.length) return es.etichette;
    return [...new Set((es.parti||[]).map(p=>p.e).filter(Boolean))].sort();
  }

  function renderEsercizio(es, opts){
    opts = opts || {};
    const box = document.createElement('div');
    box.className = 'ex';
    box.innerHTML = `<div class="ex-tipo">${esc(TIPI[es.tipo]||es.tipo)}</div>`;
    let verifica;

    if(es.tipo === 'scelta' || es.tipo === 'vf'){
      const isVf = es.tipo === 'vf';
      box.insertAdjacentHTML('beforeend', `<div class="ex-q">${es.testo}</div>`);
      const opzioni = isVf ? ['Vero','Falso'] : es.opzioni;
      const corr = isVf ? (es.corretta ? 0 : 1) : Number(es.corretta);
      let order = opzioni.map((o,i)=>i); if(!isVf && !opts.noShuffle) order = shuffle(order);
      const wrap = document.createElement('div'); wrap.className='opts';
      let sel = null;
      order.forEach((i, pos) => {
        const b = document.createElement('button'); b.type='button'; b.className='opt'; b.dataset.i = i;
        b.innerHTML = `<span class="k">${isVf ? (i===0?'V':'F') : 'ABCDEFG'[pos]}</span><span>${opzioni[i]}</span>`;
        b.onclick = () => { if(box.dataset.done) return; sel = i; wrap.querySelectorAll('.opt').forEach(x=>x.classList.toggle('sel', x===b)); opts.onChange && opts.onChange(); };
        wrap.appendChild(b);
      });
      box.appendChild(wrap);
      verifica = () => {
        if(sel === null) return null;
        wrap.querySelectorAll('.opt').forEach(x => { const i = +x.dataset.i; if(i===corr) x.classList.add('right'); else if(i===sel) x.classList.add('wrong'); });
        return {punti: sel===corr ? 1 : 0};
      };
    }

    else if(es.tipo === 'completa'){
      const parts = String(es.testo).split('___');
      const q = document.createElement('div'); q.className='ex-q';
      const inputs = [];
      parts.forEach((p, i) => {
        q.insertAdjacentHTML('beforeend', p);
        if(i < parts.length-1){
          const inp = document.createElement('input'); inp.type='text'; inp.className='fill'; inp.autocomplete='off'; inp.spellcheck=false;
          inp.oninput = () => opts.onChange && opts.onChange();
          inp.onkeydown = e => { if(e.key==='Enter' && opts.onEnter) opts.onEnter(); };
          inputs.push(inp); q.appendChild(inp);
        }
      });
      box.appendChild(q);
      // risposte: una voce per ogni spazio ___ ; alternative accettate separate da "|"
      const sets = (es.risposte||[]).map(r => String(r).split('|').map(norm));
      verifica = () => {
        if(inputs.some(i=>!i.value.trim())) return null;
        let ok = 0;
        inputs.forEach((inp, i) => {
          const good = (sets[i]||[]).includes(norm(inp.value));
          inp.classList.add(good ? 'right' : 'wrong'); inp.disabled = true;
          if(good) ok++;
          else { const s = document.createElement('span'); s.className='small'; s.style.cssText='color:var(--ok);font-weight:600;margin:0 6px'; s.textContent='→ '+String(es.risposte[i]||'').split('|')[0]; inp.after(s); }
        });
        return {punti: ok/inputs.length};
      };
      setTimeout(()=>inputs[0] && opts.focus && inputs[0].focus(), 30);
    }

    else if(es.tipo === 'individua'){
      box.insertAdjacentHTML('beforeend', `<div class="ex-q">${es.testo}</div>`);
      const toks = parseIndividua(es.frase);
      const fr = document.createElement('div'); fr.className='frase';
      toks.forEach((tk, i) => {
        const b = document.createElement('button'); b.type='button'; b.className='pick'; b.textContent = tk.t; b.dataset.i=i;
        b.onclick = () => { if(box.dataset.done) return; b.classList.toggle('sel'); opts.onChange && opts.onChange(); };
        fr.appendChild(b);
      });
      box.appendChild(fr);
      box.insertAdjacentHTML('beforeend', `<div class="hint">Tocca le parole per selezionarle; tocca di nuovo per deselezionarle.</div>`);
      verifica = () => {
        const btns = [...fr.querySelectorAll('.pick')];
        if(!btns.some(b=>b.classList.contains('sel'))) return null;
        let tp=0, fp=0; const tot = toks.filter(t=>t.ok).length;
        btns.forEach((b,i) => {
          const s = b.classList.contains('sel'), ok = toks[i].ok;
          b.classList.remove('sel');
          if(s && ok){ b.classList.add('right'); tp++; }
          else if(s && !ok){ b.classList.add('wrong'); fp++; }
          else if(!s && ok){ b.classList.add('missed'); }
        });
        return {punti: tot ? Math.max(0, (tp - fp) / tot) : 0};
      };
    }

    else if(es.tipo === 'etichetta'){
      box.insertAdjacentHTML('beforeend', `<div class="ex-q">${es.testo}</div>`);
      const labels = etichetteDi(es);
      const fr = document.createElement('div'); fr.className='frase';
      const sels = [];
      (es.parti||[]).forEach(p => {
        const t = document.createElement('div'); t.className = 'tok' + (p.e ? '' : ' plain');
        t.innerHTML = `<span class="w">${esc(p.t)}</span>`;
        if(p.e){
          const s = document.createElement('select');
          s.innerHTML = `<option value="">— scegli —</option>` + labels.map(l=>`<option>${esc(l)}</option>`).join('');
          s.onchange = () => opts.onChange && opts.onChange();
          t.appendChild(s); sels.push({s, p, t});
        }
        fr.appendChild(t);
      });
      box.appendChild(fr);
      verifica = () => {
        if(sels.some(x=>!x.s.value)) return null;
        let ok = 0;
        sels.forEach(x => {
          const good = norm(x.s.value) === norm(x.p.e);
          x.t.classList.add(good?'right':'wrong'); x.s.disabled = true;
          if(good) ok++; else x.t.insertAdjacentHTML('beforeend', `<span class="sol">${esc(x.p.e)}</span>`);
        });
        return {punti: sels.length ? ok/sels.length : 0};
      };
    }

    else if(es.tipo === 'abbina'){
      box.insertAdjacentHTML('beforeend', `<div class="ex-q">${es.testo}</div>`);
      const coppie = es.coppie || [];
      const ordR = opts.noShuffle ? coppie.map((_, i) => i) : shuffle(coppie.map((_, i) => i));
      const wrap = document.createElement('div'); wrap.className = 'abbina';
      const colL = document.createElement('div'), colR = document.createElement('div'); colL.className = colR.className = 'col';
      const pair = new Map(); // indice sinistra -> indice destra
      let sel = null; const L = [], Rb = {};
      const ridisegna = () => {
        const num = new Map(); [...pair.keys()].sort((a,b)=>a-b).forEach((l, k) => num.set(l, k+1));
        L.forEach((b, i) => { b.classList.toggle('sel', sel === i); b.classList.toggle('paired', pair.has(i)); b.querySelector('.tag').textContent = pair.has(i) ? num.get(i) : ''; });
        ordR.forEach(j => { const l = [...pair.entries()].find(([, r]) => r === j); Rb[j].classList.toggle('paired', !!l); Rb[j].querySelector('.tag').textContent = l ? num.get(l[0]) : ''; });
      };
      coppie.forEach((cp, i) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'ab'; b.innerHTML = `<span class="tag"></span><span>${esc(cp[0])}</span>`;
        b.onclick = () => { if(box.dataset.done) return; pair.delete(i); sel = sel === i ? null : i; ridisegna(); opts.onChange && opts.onChange(); };
        L.push(b); colL.appendChild(b);
      });
      ordR.forEach(j => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'ab'; b.innerHTML = `<span class="tag"></span><span>${esc(coppie[j][1])}</span>`;
        b.onclick = () => {
          if(box.dataset.done) return;
          const gia = [...pair.entries()].find(([, r]) => r === j);
          if(sel === null){ if(gia){ pair.delete(gia[0]); ridisegna(); } else toast('Scegli prima una voce nella colonna di sinistra'); return; }
          if(gia) pair.delete(gia[0]);
          pair.set(sel, j); sel = null; ridisegna(); opts.onChange && opts.onChange();
        };
        Rb[j] = b; colR.appendChild(b);
      });
      wrap.appendChild(colL); wrap.appendChild(colR); box.appendChild(wrap);
      box.insertAdjacentHTML('beforeend', `<div class="hint">Tocca una voce a sinistra e poi quella corrispondente a destra. Tocca di nuovo per cambiare.</div>`);
      verifica = () => {
        if(pair.size < coppie.length) return null;
        let ok = 0; sel = null; ridisegna();
        L.forEach((b, i) => { const good = norm(coppie[pair.get(i)][1]) === norm(coppie[i][1]); b.classList.remove('paired'); b.classList.add(good ? 'right' : 'wrong'); if(good) ok++; else b.lastElementChild.insertAdjacentHTML('beforeend', `<span class="sol">→ ${esc(coppie[i][1])}</span>`); });
        return {punti: coppie.length ? ok / coppie.length : 0};
      };
    }

    else if(CN.TIPI_EXTRA && CN.TIPI_EXTRA[es.tipo]){
      box.classList.add('ex-lungo');
      verifica = CN.TIPI_EXTRA[es.tipo](es, box, opts);
    }

    box.verifica = () => {
      const r = verifica ? verifica() : null;
      if(r){
        box.dataset.done = '1';
        const cls = r.punti >= 0.999 ? 'ok' : r.punti > 0 ? 'part' : 'ko';
        let head = cls==='ok' ? 'Corretto!' : cls==='part' ? `Quasi: ${Math.round(r.punti*100)}% corretto.` : 'Non è corretto.';
        if(r.n > 1) head = cls==='ok' ? `Tutto giusto: ${r.ok} su ${r.n}!` : `${r.ok} su ${r.n} giuste (${Math.round(r.punti*100)}%).`;
        let extra = '';
        if(es.tipo==='vf' && cls!=='ok') extra = ` La risposta giusta è <b>${es.corretta?'Vero':'Falso'}</b>.`;
        box.insertAdjacentHTML('beforeend', `<div class="feedback ${cls}"><b>${head}</b>${extra}${es.spiegazione?`<div class="exp">${es.spiegazione}</div>`:''}</div>`);
      }
      return r;
    };
    return box;
  }

  window.CN = { K, load, save, del, clone, uid, esc, norm, shuffle, catalog, fileCatalog, hasLocalCatalog, saveCatalog, resetCatalog, findArg,
    studente, setStudente, maiuscole, anteprima, entraAnteprima, pinDocente, logoutStudente, studKey, risultati, addRisultato, risultatiStudente, migliore, tuttiRisultati, importaRisultati, cancellaRisultati,
    download, modale, conferma, chiedi, toast, h, TIPI, renderEsercizio, parseIndividua, etichetteDi };
})();
