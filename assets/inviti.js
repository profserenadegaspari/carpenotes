/* Carpe Notes — inviti degli studenti
   Gli studenti entrano solo con un link creato dalla docente.
   Ogni link contiene nome, classe e una FIRMA digitale (ECDSA P-256):
   - la chiave segreta (per firmare) resta solo nel browser della docente;
   - la chiave pubblica (per controllare) viene pubblicata in contenuti.js.
   Senza la chiave segreta nessuno può creare un link valido o cambiare il nome dentro un link. */
(function(){
  const sub = (window.crypto && crypto.subtle) || null;
  const ALG = {name: 'ECDSA', namedCurve: 'P-256'}, SIG = {name: 'ECDSA', hash: 'SHA-256'};
  const KEY = 'cn_inviti'; // solo nel browser della docente: chiave segreta, elenco dei link, indirizzo
  const enc = new TextEncoder(), dec = new TextDecoder();
  const b64u = bytes => { let s = ''; new Uint8Array(bytes).forEach(b => s += String.fromCharCode(b)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const unb64u = s => { s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while(s.length % 4) s += '='; const b = atob(s); return Uint8Array.from(b, c => c.charCodeAt(0)); };

  const disponibile = () => !!sub;
  const imp = () => CN.catalog().impostazioni || {};
  const attivi = () => !!(imp().chiaveInviti && imp().chiaveInviti.x);

  // Da un link incollato (o dal solo codice) ricava il codice d'invito
  function codiceDa(testo){
    const t = String(testo || '').trim();
    const m = t.match(/invito[\/=]([A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+(?:\.[A-Za-z0-9_\-]+)?)/);
    if(m) return m[1];
    return /^[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+(\.[A-Za-z0-9_\-]+)?$/.test(t) ? t : '';
  }

  // Controlla un codice. Risponde {ok:true, dati} oppure {ok:false, motivo}
  // motivi: manca, nonattivi, browser, falso, revocato
  async function verifica(codice){
    if(!codice) return {ok: false, motivo: 'manca'};
    const pub = imp().chiaveInviti;
    if(!pub || !pub.x) return {ok: false, motivo: 'nonattivi'};
    if(!sub) return {ok: false, motivo: 'browser'};
    try{
      const [p, s] = String(codice).split('.');
      const key = await sub.importKey('jwk', {kty: 'EC', crv: 'P-256', x: pub.x, y: pub.y, ext: true}, ALG, false, ['verify']);
      const ok = await sub.verify(SIG, key, unb64u(s), enc.encode(p));
      if(!ok) return {ok: false, motivo: 'falso'};
      const dati = JSON.parse(dec.decode(unb64u(p)));
      if((imp().revocati || []).includes(dati.i)) return {ok: false, motivo: 'revocato', dati};
      return {ok: true, dati};
    }catch(e){ return {ok: false, motivo: 'falso'}; }
  }
  // Lo studente salvato sul dispositivo corrisponde al suo invito?
  function corrisponde(dati, s){
    if(!dati || !s) return false;
    if(CN.norm(dati.c) !== CN.norm(s.classe)) return false;
    return dati.t === 'classe' ? true : CN.norm(dati.n) === CN.norm(s.nome);
  }

  /* ---------- Lato docente ---------- */
  const stato = () => Object.assign({chiave: null, elenco: [], indirizzo: ''}, CN.load(KEY, {}));
  const salvaStato = st => CN.save(KEY, st);
  const pubblica = ch => ch ? {x: ch.x, y: ch.y} : null;

  async function nuovaChiave(){
    const kp = await sub.generateKey(ALG, true, ['sign', 'verify']);
    const j = await sub.exportKey('jwk', kp.privateKey);
    return {x: j.x, y: j.y, d: j.d, creata: new Date().toISOString()};
  }
  async function firma(dati, ch){
    const key = await sub.importKey('jwk', {kty: 'EC', crv: 'P-256', x: ch.x, y: ch.y, d: ch.d, ext: true}, ALG, false, ['sign']);
    const p = b64u(enc.encode(JSON.stringify(dati)));
    const s = await sub.sign(SIG, key, enc.encode(p));
    return p + '.' + b64u(s);
  }
  // Chiave pubblica e link revocati vanno nelle impostazioni del catalogo (e quindi in contenuti.js)
  function sincronizza(cat){
    const st = stato(); if(!st.chiave) return false;
    const im = cat.impostazioni = cat.impostazioni || {};
    const rev = st.elenco.filter(x => x.revocato).map(x => x.i).sort();
    const prima = JSON.stringify([im.chiaveInviti, im.revocati || []]);
    im.chiaveInviti = pubblica(st.chiave); im.revocati = rev;
    return prima !== JSON.stringify([im.chiaveInviti, im.revocati]);
  }
  // Il file contenuti.js pubblicato è già aggiornato?
  function daPubblicare(){
    const st = stato(); if(!st.chiave) return null;
    // st.pubblicato = cosa c'era nell'ultimo file per il sito online scaricato dalla prof
    const f = st.pubblicato ? {chiaveInviti: {x: st.pubblicato.x}, revocati: st.pubblicato.rev} : ((CN.fileCatalog().impostazioni) || {});
    if(!f.chiaveInviti || f.chiaveInviti.x !== st.chiave.x) return 'chiave';
    if(st.pubblicato && st.pubblicato.sito !== st.chiaveSito) return 'chiave';
    const rev = st.elenco.filter(x => x.revocato).map(x => x.i).sort();
    const frev = (f.revocati || []).slice().sort();
    if(rev.join() !== frev.join()) return 'revoche';
    return null;
  }

  /* ---------- Sito online: contenuti cifrati ----------
     Sul sito online (GitHub) il catalogo non è leggibile: è cifrato (AES-GCM) con la "chiave del sito".
     La chiave viaggia solo dentro i link d'invito (dopo il #, quindi non arriva mai al server)
     e resta solo nel browser della docente e degli studenti invitati. */
  const nuovaChiaveSito = () => b64u(crypto.getRandomValues(new Uint8Array(32)));
  async function cifra(cat, k){
    const key = await sub.importKey('raw', unb64u(k), {name: 'AES-GCM'}, false, ['encrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const dati = await sub.encrypt({name: 'AES-GCM', iv}, key, enc.encode(JSON.stringify(cat)));
    // l'impronta permette di riconoscere quale chiave serve, senza rivelarla
    const impronta = b64u(await sub.digest('SHA-256', unb64u(k))).slice(0, 8);
    return {v: 1, impronta, iv: b64u(iv), dati: b64u(dati)};
  }
  // Link completo: indirizzo + #/invito/<codice firmato>.<chiave del sito>
  const conChiave = (codice, st) => String(codice).split('.').slice(0, 2).join('.') + (st && st.chiaveSito ? '.' + st.chiaveSito : '');

  CN.inviti = {disponibile, attivi, codiceDa, verifica, corrisponde, stato, salvaStato, nuovaChiave, firma, sincronizza, daPubblicare, nuovaChiaveSito, cifra, conChiave};
})();
