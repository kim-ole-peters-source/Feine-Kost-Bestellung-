/* ============================================================
   SERVER-SPEICHER
   Gleiche cloudStorage-Schnittstelle wie vorher, aber ohne Firebase.
   app.py speichert die Werte serverseitig in bestellsystem.db.
============================================================ */
const STORAGE_API_BASE = "/api/storage";

const cloudStorage = {
  async get(key){
    try{
      const res = await fetch(`${STORAGE_API_BASE}/${encodeURIComponent(key)}`, { cache: "no-store" });
      if(res.status === 404) return null;
      if(!res.ok) return null;
      const data = await res.json();
      const value = Object.prototype.hasOwnProperty.call(data, "value") ? data.value : data;
      if(value === null || value === undefined) return null;
      return { key, value: JSON.stringify(value) };
    }catch(e){
      console.error('Server-Lesefehler:', e);
      return null;
    }
  },
  async set(key, value){
    try{
      let parsedValue;
      try{ parsedValue = JSON.parse(value); }
      catch(parseError){ parsedValue = value; }
      const res = await fetch(`${STORAGE_API_BASE}/${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedValue),
      });
      if(!res.ok) return null;
      return { key, value };
    }catch(e){
      console.error('Server-Schreibfehler:', e);
      return null;
    }
  }
};

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => null);
  });
}

/* ============================================================
   E-MAIL-BENACHRICHTIGUNG (EmailJS) — HIER EINTRAGEN
   1. Kostenloses Konto auf https://www.emailjs.com erstellen
   2. "Email Service" hinzufügen (z. B. Gmail/Outlook verbinden) -> liefert SERVICE_ID
   3. "Email Template" erstellen mit den Variablen:
      {{to_email}} {{orderer_name}} {{department}} {{note}} {{items}} {{order_date}}
      -> liefert TEMPLATE_ID
   4. Unter Account -> General die "Public Key" kopieren -> PUBLIC_KEY
   Alle drei Werte unten eintragen. Ohne gültige Werte wird die Mail
   nicht verschickt, die Bestellung wird aber trotzdem gespeichert.
============================================================ */
const EMAILJS_PUBLIC_KEY  = "AUGnWL8kfNf7vbfAo";
const EMAILJS_SERVICE_ID  = "service_tkn32hj";
const EMAILJS_TEMPLATE_ID = "template_9fhe0jf";
const NOTIFY_EMAIL_DEFAULT = "schult@opapeters.de";

if (window.emailjs && EMAILJS_PUBLIC_KEY !== "DEIN_PUBLIC_KEY") {
  emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
}

async function sendOrderEmail(order){
  if (!window.emailjs || EMAILJS_PUBLIC_KEY === "DEIN_PUBLIC_KEY") {
    console.warn("EmailJS ist noch nicht konfiguriert - Mail wurde nicht gesendet.");
    return;
  }
  let empfaenger;
  if(state.notifyEmails.length > 0){
    const passend = state.notifyEmails.filter(e => e.bereich === 'alle' || e.bereich === order.bereich);
    if(passend.length === 0) return; // niemand möchte für diesen Bereich benachrichtigt werden
    empfaenger = passend.map(e=>e.email).join(",");
  } else {
    empfaenger = NOTIFY_EMAIL_DEFAULT;
  }
  const itemsText = order.items.map(it => `${it.qty}x ${it.name} (${it.unit})`).join("\n");
  try{
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_email: empfaenger,
      orderer_name: order.name,
      department: order.dept || "-",
      note: order.note || "-",
      items: itemsText,
      order_date: fmtDate(order.date),
    });
  }catch(e){
    console.error("E-Mail-Versand fehlgeschlagen:", e);
  }
}

/* ============================================================
   ZUGANGSCODES PRO KACHEL — HIER ANPASSEN
   Hinweis: Da diese Seite rein im Browser läuft, sind diese Codes
   kein echter Passwortschutz (im Quelltext einsehbar), sondern nur
   eine einfache Zugriffs-Hürde gegen versehentliches Öffnen.
============================================================ */
const ROLE_CODES = {
  laden: "121212",
  produktion: "1965",
  backend_produktion: "1965",
  backend_geschaeftsfuehrung: "3243",
};

const ARTIKELDATEN_SEED = {"i001": {"ve": "16", "haendler": "Produktion", "rhythmus": "freitag"}, "i002": {"ve": "16", "haendler": "Produktion", "rhythmus": "freitag"}, "i003": {"ve": "10", "haendler": "Produktion", "rhythmus": "freitag"}, "i004": {"ve": "10", "haendler": "Produktion", "rhythmus": "freitag"}, "i006": {"ve": "10", "haendler": "Produktion", "rhythmus": "freitag"}, "i007": {"ve": "10", "haendler": "Produktion", "rhythmus": "freitag"}, "i008": {"ve": "6", "haendler": "Produktion", "rhythmus": "freitag"}, "i009": {"ve": "10", "haendler": "Produktion", "rhythmus": "freitag"}, "i010": {"ve": "6", "haendler": "Produktion", "rhythmus": "freitag"}, "i011": {"ve": "6", "haendler": "Produktion", "rhythmus": "freitag"}, "i012": {"ve": "16", "haendler": "Produktion", "rhythmus": "freitag"}, "i013": {"ve": "10", "haendler": "Produktion", "rhythmus": "freitag"}, "i014": {"ve": "16", "haendler": "Produktion", "rhythmus": "freitag"}, "i015": {"ve": "10", "haendler": "Produktion", "rhythmus": "freitag"}, "i016": {"ve": "16", "haendler": "Produktion", "rhythmus": "freitag"}, "i017": {"ve": "16", "haendler": "Produktion", "rhythmus": "freitag"}, "i018": {"ve": "10", "haendler": "Produktion", "rhythmus": "freitag"}, "i020": {"ve": "16", "haendler": "Produktion", "rhythmus": "freitag"}, "i021": {"ve": "16", "haendler": "Produktion", "rhythmus": "freitag"}, "i022": {"ve": "10", "haendler": "Produktion", "rhythmus": "freitag"}, "i023": {"ve": "16", "haendler": "Produktion", "rhythmus": "freitag"}, "i024": {"ve": "10", "haendler": "Produktion", "rhythmus": "freitag"}, "i025": {"ve": "16", "haendler": "Produktion", "rhythmus": "freitag"}, "i026": {"ve": "10", "haendler": "Produktion", "rhythmus": "freitag"}, "i027": {"ve": "16", "haendler": "Produktion", "rhythmus": "freitag"}, "i028": {"ve": "16", "haendler": "Produktion", "rhythmus": "freitag"}, "i029": {"ve": "10", "haendler": "Produktion", "rhythmus": "freitag"}, "i031": {"ve": "16", "haendler": "Produktion", "rhythmus": "freitag"}, "i032": {"ve": "16", "haendler": "Produktion", "rhythmus": "freitag"}, "i033": {"ve": "10", "haendler": "Produktion", "rhythmus": "freitag"}, "i034": {"ve": "16", "haendler": "Produktion", "rhythmus": "freitag"}, "i035": {"ve": "16", "haendler": "Produktion", "rhythmus": "freitag"}, "i036": {"ve": "16", "haendler": "Produktion", "rhythmus": "freitag"}, "i037": {"ve": "10", "haendler": "Produktion", "rhythmus": "freitag"}, "i039": {"ve": "16", "haendler": "Produktion", "rhythmus": "freitag"}, "i040": {"ve": "16", "haendler": "Produktion", "rhythmus": "freitag"}, "i041": {"ve": "10", "haendler": "Produktion", "rhythmus": "freitag"}, "i042": {"ve": "16", "haendler": "Produktion", "rhythmus": "freitag"}, "i043": {"ve": "10", "haendler": "Produktion", "rhythmus": "freitag"}, "i044": {"ve": "20", "haendler": "Produktion", "rhythmus": "freitag"}, "i045": {"ve": "10", "haendler": "Produktion", "rhythmus": "freitag"}, "i046": {"ve": "16", "haendler": "Produktion", "rhythmus": "freitag"}, "i047": {"ve": "16", "haendler": "Produktion", "rhythmus": "freitag"}, "i048": {"ve": "10", "haendler": "Produktion", "rhythmus": "freitag"}, "i049": {"ve": "16", "haendler": "Produktion", "rhythmus": "freitag"}, "i050": {"ve": "16", "haendler": "Produktion", "rhythmus": "freitag"}, "i051": {"ve": "10", "haendler": "Produktion", "rhythmus": "freitag"}, "i052": {"ve": "16", "haendler": "Produktion", "rhythmus": "freitag"}, "i053": {"ve": "16", "haendler": "Produktion", "rhythmus": "freitag"}, "i054": {"ve": "16", "haendler": "Produktion", "rhythmus": "freitag"}, "i055": {"ve": "10", "haendler": "Produktion", "rhythmus": "freitag"}, "i057": {"ve": "20", "haendler": "Produktion", "rhythmus": "freitag"}, "i058": {"ve": "10", "haendler": "Produktion", "rhythmus": "freitag"}, "i059": {"ve": "20", "haendler": "Produktion", "rhythmus": "freitag"}, "i060": {"ve": "16", "haendler": "Produktion", "rhythmus": "freitag"}, "i062": {"ve": "10", "haendler": "Produktion", "rhythmus": "freitag"}, "i063": {"ve": "10", "haendler": "Produktion", "rhythmus": "freitag"}, "i064": {"ve": "16", "haendler": "Produktion", "rhythmus": "freitag"}, "i065": {"ve": "16", "haendler": "Produktion", "rhythmus": "freitag"}, "i066": {"ve": "10", "haendler": "Produktion", "rhythmus": "freitag"}, "i067": {"ve": "20", "haendler": "Produktion", "rhythmus": "freitag"}, "i068": {"ve": "6", "haendler": "College Curries", "rhythmus": "freitag"}, "i069": {"ve": "6", "haendler": "College Curries", "rhythmus": "freitag"}, "i070": {"ve": "6", "haendler": "College Curries", "rhythmus": "freitag"}, "i071": {"ve": "6", "haendler": "College Curries", "rhythmus": "freitag"}, "i073": {"ve": "24", "haendler": "Produktion", "rhythmus": "freitag"}, "i074": {"ve": "24", "haendler": "Produktion", "rhythmus": "freitag"}, "i075": {"ve": "24", "haendler": "Produktion", "rhythmus": "freitag"}, "i076": {"ve": "24", "haendler": "Produktion", "rhythmus": "freitag"}, "i077": {"ve": "24", "haendler": "Produktion", "rhythmus": "freitag"}, "i078": {"ve": "24", "haendler": "Produktion", "rhythmus": "freitag"}, "i079": {"ve": "24", "haendler": "Produktion", "rhythmus": "freitag"}, "i080": {"ve": "24", "haendler": "Produktion", "rhythmus": "freitag"}, "i082": {"ve": "24", "haendler": "Produktion", "rhythmus": "freitag"}, "i083": {"ve": "24", "haendler": "Produktion", "rhythmus": "freitag"}, "i084": {"ve": "24", "haendler": "Produktion", "rhythmus": "freitag"}, "i085": {"ve": "24", "haendler": "Produktion", "rhythmus": "freitag"}, "i086": {"ve": "24", "haendler": "Produktion", "rhythmus": "freitag"}, "i090": {"ve": "24", "haendler": "Produktion", "rhythmus": "freitag"}, "i091": {"ve": "24", "haendler": "Produktion", "rhythmus": "freitag"}, "i092": {"ve": "10", "haendler": "Kaffee Brügmann", "rhythmus": "monat"}, "i093": {"ve": "10", "haendler": "Kaffee Brügmann", "rhythmus": "monat"}, "i094": {"ve": "10", "haendler": "Kaffee Brügmann", "rhythmus": "monat"}, "i095": {"ve": "10", "haendler": "Kaffee Brügmann", "rhythmus": "monat"}, "i096": {"ve": "16", "haendler": "Morelli", "rhythmus": "freitag"}, "i097": {"ve": "16", "haendler": "Morelli", "rhythmus": "freitag"}, "i098": {"ve": "16", "haendler": "Morelli", "rhythmus": "freitag"}, "i099": {"ve": "16", "haendler": "Morelli", "rhythmus": "freitag"}, "i100": {"ve": "16", "haendler": "Morelli", "rhythmus": "freitag"}, "i101": {"ve": "16", "haendler": "Morelli", "rhythmus": "freitag"}, "i102": {"ve": "16", "haendler": "Morelli", "rhythmus": "freitag"}, "i103": {"ve": "16", "haendler": "Morelli", "rhythmus": "freitag"}, "i104": {"ve": "16", "haendler": "Morelli", "rhythmus": "freitag"}, "i105": {"ve": "16", "haendler": "Morelli", "rhythmus": "freitag"}, "i106": {"ve": "16", "haendler": "Viani", "rhythmus": "freitag"}, "i107": {"ve": "6", "haendler": "Viani", "rhythmus": "monat"}, "i108": {"ve": "6", "haendler": "Collier", "rhythmus": "monat"}, "i109": {"ve": "6", "haendler": "Collier", "rhythmus": "monat"}, "i110": {"ve": "6", "haendler": "Viani", "rhythmus": "monat"}, "i111": {"ve": "6", "haendler": "Viani", "rhythmus": "monat"}, "i112": {"ve": "6", "haendler": "Produktion", "rhythmus": "monat"}, "i113": {"ve": "6", "haendler": "Viani", "rhythmus": "monat"}, "i114": {"ve": "6", "haendler": "Viani", "rhythmus": "monat"}, "i115": {"ve": "6", "haendler": "Viani", "rhythmus": "monat"}, "i116": {"ve": "6", "haendler": "Produktion", "rhythmus": "monat"}, "i117": {"ve": "6", "haendler": "Viani", "rhythmus": "monat"}, "i118": {"ve": "6", "haendler": "Market Grounds", "rhythmus": "monat"}, "i119": {"ve": "6", "haendler": "Market Grounds", "rhythmus": "monat"}, "i120": {"ve": "6", "haendler": "Viani", "rhythmus": "monat"}, "i121": {"ve": "1kg", "haendler": "Viani", "rhythmus": "monat"}, "i122": {"ve": "12", "haendler": "Viani", "rhythmus": "monat"}, "i123": {"ve": "12", "haendler": "Viani", "rhythmus": "monat"}, "i124": {"ve": "12", "haendler": "Viani", "rhythmus": "monat"}, "i125": {"ve": "12", "haendler": "Viani", "rhythmus": "monat"}, "i126": {"ve": "24", "haendler": "Produktion", "rhythmus": "freitag"}, "i127": {"ve": "24", "haendler": "Produktion", "rhythmus": "freitag"}, "i128": {"ve": "6", "haendler": "Collier", "rhythmus": "monat"}, "i129": {"ve": "20", "haendler": "Viani", "rhythmus": "monat"}, "i130": {"ve": "20", "haendler": "Viani", "rhythmus": "monat"}, "i131": {"ve": "10", "haendler": "Etivera", "rhythmus": "monat"}, "i137": {"ve": "", "haendler": "Geschäftsführung", "rhythmus": "monat"}, "i138": {"ve": "", "haendler": "Geschäftsführung", "rhythmus": "monat"}, "i139": {"ve": "", "haendler": "Geschäftsführung", "rhythmus": "monat"}, "i140": {"ve": "6", "haendler": "Collier", "rhythmus": "monat"}, "i141": {"ve": "6", "haendler": "Produktion", "rhythmus": "freitag"}, "i142": {"ve": "6", "haendler": "Produktion", "rhythmus": "freitag"}, "i143": {"ve": "6", "haendler": "Produktion", "rhythmus": "freitag"}, "i144": {"ve": "6", "haendler": "Hamburg Zanzibar", "rhythmus": "monat"}, "i145": {"ve": "6", "haendler": "Hamburg Zanzibar", "rhythmus": "monat"}, "i146": {"ve": "6", "haendler": "Hamburg Zanzibar", "rhythmus": "monat"}, "i147": {"ve": "6", "haendler": "Hamburg Zanzibar", "rhythmus": "monat"}, "i148": {"ve": "6", "haendler": "Hamburg Zanzibar", "rhythmus": "monat"}, "i149": {"ve": "6", "haendler": "Collier", "rhythmus": "monat"}, "i150": {"ve": "6", "haendler": "Brinkmann", "rhythmus": "monat"}, "i151": {"ve": "6", "haendler": "Brinkmann", "rhythmus": "monat"}, "i152": {"ve": "6", "haendler": "Viani", "rhythmus": "monat"}, "i153": {"ve": "6", "haendler": "Brinkmann", "rhythmus": "monat"}, "i154": {"ve": "6", "haendler": "Viani", "rhythmus": "monat"}, "i155": {"ve": "6", "haendler": "Brinkmann", "rhythmus": "monat"}, "i156": {"ve": "6", "haendler": "Brinkmann", "rhythmus": "monat"}, "i157": {"ve": "6", "haendler": "Brinkmann", "rhythmus": "monat"}, "i158": {"ve": "6", "haendler": "Brinkmann", "rhythmus": "monat"}, "i159": {"ve": "6", "haendler": "Brinkmann", "rhythmus": "monat"}, "i160": {"ve": "6", "haendler": "Brinkmann", "rhythmus": "monat"}, "i161": {"ve": "6", "haendler": "Brinkmann", "rhythmus": "monat"}, "i162": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i163": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i164": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i165": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i166": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i167": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i168": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i169": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i170": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i171": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i172": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i173": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i174": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i175": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i176": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i177": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i178": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i179": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i180": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i181": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i182": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i183": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i184": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i185": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i186": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i187": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i188": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i189": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i190": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i191": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i192": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i193": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i194": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i195": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i196": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i197": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i198": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i199": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i200": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i201": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i202": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i203": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i204": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i205": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i206": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i207": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i208": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i209": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i210": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i211": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i212": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i213": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i214": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i215": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i217": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i218": {"ve": "6", "haendler": "Viani", "rhythmus": "monat"}, "i219": {"ve": "6", "haendler": "Viani", "rhythmus": "monat"}, "i220": {"ve": "6", "haendler": "Rindchen", "rhythmus": "monat"}, "i221": {"ve": "", "haendler": "Etivera", "rhythmus": "monat"}, "i222": {"ve": "", "haendler": "Etivera", "rhythmus": "monat"}, "i223": {"ve": "", "haendler": "Dosenprofi", "rhythmus": "monat"}, "i224": {"ve": "", "haendler": "Dosenprofi", "rhythmus": "monat"}, "i225": {"ve": "", "haendler": "Dosenprofi", "rhythmus": "monat"}, "i226": {"ve": "", "haendler": "Dosenprofi", "rhythmus": "monat"}, "i227": {"ve": "", "haendler": "Dosenprofi", "rhythmus": "monat"}, "i228": {"ve": "", "haendler": "Dosenprofi", "rhythmus": "monat"}, "i229": {"ve": "", "haendler": "Hugo", "rhythmus": "monat"}, "i230": {"ve": "", "haendler": "Etivera", "rhythmus": "monat"}, "i231": {"ve": "", "haendler": "Etivera", "rhythmus": "monat"}, "i232": {"ve": "", "haendler": "Etivera", "rhythmus": "monat"}, "i233": {"ve": "", "haendler": "Etivera", "rhythmus": "monat"}, "i234": {"ve": "", "haendler": "Etivera", "rhythmus": "monat"}, "i235": {"ve": "", "haendler": "Etivera", "rhythmus": "monat"}, "i236": {"ve": "", "haendler": "Etivera", "rhythmus": "monat"}, "i237": {"ve": "", "haendler": "Flaschenland", "rhythmus": "monat"}, "i238": {"ve": "", "haendler": "Etivera", "rhythmus": "monat"}, "i239": {"ve": "", "haendler": "Hugo", "rhythmus": "monat"}, "i240": {"ve": "", "haendler": "Etivera", "rhythmus": "monat"}, "i241": {"ve": "", "haendler": "Etivera", "rhythmus": "monat"}, "i242": {"ve": "", "haendler": "Etivera", "rhythmus": "monat"}, "i243": {"ve": "", "haendler": "Etivera", "rhythmus": "monat"}, "i244": {"ve": "", "haendler": "Etivera", "rhythmus": "monat"}, "i245": {"ve": "", "haendler": "Etivera", "rhythmus": "monat"}, "i246": {"ve": "", "haendler": "Hugo", "rhythmus": "monat"}, "i247": {"ve": "", "haendler": "Etivera", "rhythmus": "monat"}, "i248": {"ve": "", "haendler": "Etivera", "rhythmus": "monat"}, "i249": {"ve": "", "haendler": "Karton.eu", "rhythmus": "monat"}, "i250": {"ve": "", "haendler": "Bähr", "rhythmus": "monat"}, "i251": {"ve": "", "haendler": "Bähr", "rhythmus": "monat"}, "i252": {"ve": "", "haendler": "Bähr", "rhythmus": "monat"}, "i253": {"ve": "", "haendler": "Bähr", "rhythmus": "monat"}, "i254": {"ve": "", "haendler": "Bähr", "rhythmus": "monat"}, "i255": {"ve": "", "haendler": "Karton.eu", "rhythmus": "monat"}, "i256": {"ve": "", "haendler": "Nordwest Etikett", "rhythmus": "monat"}, "i257": {"ve": "", "haendler": "Nordwest Etikett", "rhythmus": "monat"}, "i258": {"ve": "", "haendler": "Nordwest Etikett", "rhythmus": "monat"}, "i259": {"ve": "", "haendler": "Nordwest Etikett", "rhythmus": "monat"}, "i260": {"ve": "", "haendler": "Nordwest Etikett", "rhythmus": "monat"}, "i261": {"ve": "", "haendler": "Nordwest Etikett", "rhythmus": "monat"}, "i262": {"ve": "", "haendler": "Etivera", "rhythmus": "monat"}, "i263": {"ve": "", "haendler": "Azada", "rhythmus": "monat"}, "i264": {"ve": "", "haendler": "Azada", "rhythmus": "monat"}, "i265": {"ve": "", "haendler": "Azada", "rhythmus": "monat"}, "i266": {"ve": "", "haendler": "Azada", "rhythmus": "monat"}, "i267": {"ve": "", "haendler": "Azada", "rhythmus": "monat"}, "i268": {"ve": "", "haendler": "Azada", "rhythmus": "monat"}, "i269": {"ve": "", "haendler": "Hamlitsch", "rhythmus": "monat"}, "i270": {"ve": "", "haendler": "Azada", "rhythmus": "monat"}, "i271": {"ve": "", "haendler": "Pena Luna", "rhythmus": "monat"}, "i272": {"ve": "", "haendler": "Pena Luna", "rhythmus": "monat"}, "i273": {"ve": "", "haendler": "Pena Luna", "rhythmus": "monat"}, "i274": {"ve": "", "haendler": "Pena Luna", "rhythmus": "monat"}, "i275": {"ve": "", "haendler": "Pena Luna", "rhythmus": "monat"}, "i276": {"ve": "", "haendler": "Frantoio", "rhythmus": "monat"}, "i277": {"ve": "", "haendler": "Bernard", "rhythmus": "monat"}, "i278": {"ve": "", "haendler": "Bernard", "rhythmus": "monat"}, "i280": {"ve": "", "haendler": "Tiziana", "rhythmus": "monat"}, "i281": {"ve": "", "haendler": "Tiziana", "rhythmus": "monat"}, "i282": {"ve": "", "haendler": "Tiziana", "rhythmus": "monat"}, "i283": {"ve": "", "haendler": "Tiziana", "rhythmus": "monat"}, "i284": {"ve": "", "haendler": "Tiziana", "rhythmus": "monat"}, "i285": {"ve": "", "haendler": "Tiziana", "rhythmus": "monat"}, "i286": {"ve": "", "haendler": "Tiziana", "rhythmus": "monat"}, "i287": {"ve": "", "haendler": "Enes", "rhythmus": "monat"}, "i288": {"ve": "", "haendler": "Enes", "rhythmus": "monat"}, "i289": {"ve": "", "haendler": "Enes", "rhythmus": "monat"}, "i290": {"ve": "", "haendler": "Enes", "rhythmus": "monat"}, "i291": {"ve": "", "haendler": "Enes", "rhythmus": "monat"}, "i292": {"ve": "", "haendler": "Enes", "rhythmus": "monat"}, "i293": {"ve": "", "haendler": "Enes", "rhythmus": "monat"}, "i294": {"ve": "", "haendler": "Enes", "rhythmus": "monat"}, "i295": {"ve": "", "haendler": "Enes", "rhythmus": "monat"}, "i296": {"ve": "", "haendler": "Amazon", "rhythmus": "monat"}, "i297": {"ve": "", "haendler": "Enes", "rhythmus": "monat"}, "i298": {"ve": "", "haendler": "Enes", "rhythmus": "monat"}, "i299": {"ve": "", "haendler": "Enes", "rhythmus": "monat"}, "i300": {"ve": "", "haendler": "Enes", "rhythmus": "monat"}, "i301": {"ve": "", "haendler": "Enes", "rhythmus": "monat"}, "i302": {"ve": "", "haendler": "Enes", "rhythmus": "monat"}, "i303": {"ve": "", "haendler": "Enes", "rhythmus": "monat"}, "i304": {"ve": "", "haendler": "Enes", "rhythmus": "monat"}, "i305": {"ve": "", "haendler": "Enes", "rhythmus": "monat"}, "i306": {"ve": "", "haendler": "Enes", "rhythmus": "monat"}, "i307": {"ve": "", "haendler": "Enes", "rhythmus": "monat"}, "i308": {"ve": "", "haendler": "Enes", "rhythmus": "monat"}, "i309": {"ve": "", "haendler": "Enes", "rhythmus": "monat"}, "i310": {"ve": "", "haendler": "BOS FOOD", "rhythmus": "monat"}, "i005": {"rhythmus": "freitag"}, "i019": {"rhythmus": "freitag"}, "i030": {"rhythmus": "freitag"}, "i038": {"rhythmus": "freitag"}, "i056": {"rhythmus": "freitag"}, "i061": {"rhythmus": "freitag"}, "i072": {"rhythmus": "freitag"}, "i081": {"rhythmus": "freitag"}, "i089": {"rhythmus": "freitag"}, "i132": {"rhythmus": "monat"}, "i133": {"rhythmus": "monat"}, "i134": {"rhythmus": "monat"}, "i135": {"rhythmus": "monat"}, "i136": {"rhythmus": "monat"}, "i216": {"rhythmus": "monat"}};

const LOGO_BASE64 = "/static/icons/brand-logo.png";

const CATALOG_LADEN = [
  {cat:"Essige", items:[
    {id:"i001", name:"Mango Fruchtbalsam - Olivicio", unit:"Einheiten"},
    {id:"i002", name:"Trüffel Balsamico", unit:"Einheiten"},
    {id:"i003", name:"Feige - Balsamico - Olivicio", unit:"Einheiten"},
    {id:"i004", name:"Granatapfel Balsamico - Olivicio", unit:"Einheiten"},
    {id:"i005", name:"Essig Klein", unit:"Einheiten"},
    {id:"i006", name:"Weißer Balsamico - Olivicio", unit:"Einheiten"},
    {id:"i007", name:"Himbeere Balsamico - Olivicio", unit:"Einheiten"},
    {id:"i008", name:"Invecchiato IGP Balsamico 3 Jahre - Olivicio", unit:"Einheiten"},
    {id:"i009", name:"Apfel - Balsamico", unit:"Einheiten"},
    {id:"i010", name:"OLIVICIO Balsamico Crema", unit:"Einheiten"},
    {id:"i011", name:"Mango Balsamico - Olivicio", unit:"Einheiten"},
    {id:"i012", name:"Himbeere Fruchtbalsam - Olivicio", unit:"Einheiten"},
  ]},
  {cat:"Öle", items:[
    {id:"i013", name:"Basic One - Olivicio - 500ml", unit:"Einheiten"},
    {id:"i014", name:"Müsli 250ml", unit:"Einheiten"},
    {id:"i015", name:"Citrus Fruits 500ml", unit:"Einheiten"},
    {id:"i016", name:"Basilikum - Olivenöl - Olivicio - 100ml", unit:"Einheiten"},
    {id:"i017", name:"Basilikum - Olivenöl - Olivicio - 250ml", unit:"Einheiten"},
    {id:"i018", name:"Basilikum - Olivenöl - Olivicio - 500ml", unit:"Einheiten"},
    {id:"i019", name:"Basilikum - Olivenöl - Olivicio - 1000ml", unit:"Einheiten"},
    {id:"i020", name:"Chili Olivenöl - Olivicio - 100ml", unit:"Einheiten"},
    {id:"i021", name:"Chili Olivenöl - Olivicio - 250ml", unit:"Einheiten"},
    {id:"i022", name:"Chili Olivenöl - Olivicio - 500ml", unit:"Einheiten"},
    {id:"i023", name:"DONCEL SPANIEN - Olivenöl - 250ml", unit:"Einheiten"},
    {id:"i024", name:"DONCEL SPANIEN - Olivenöl - 500ml", unit:"Einheiten"},
    {id:"i025", name:"Frantoio Ghiglione Olivenöl - 250ml", unit:"Einheiten"},
    {id:"i026", name:"Frantoio Ghiglione Olivenöl - 500ml", unit:"Einheiten"},
    {id:"i027", name:"Knoblauch - Thymian - 100ml", unit:"Einheiten"},
    {id:"i028", name:"Knoblauch - Thymian - 250ml", unit:"Einheiten"},
    {id:"i029", name:"Knoblauch - Thymian - 500ml", unit:"Einheiten"},
    {id:"i030", name:"Knoblauch - Thymian - 1000ml", unit:"Einheiten"},
    {id:"i031", name:"Knoblauch Olivenöl - Olivicio - 100ml", unit:"Einheiten"},
    {id:"i032", name:"Knoblauch Olivenöl - Olivicio - 250ml", unit:"Einheiten"},
    {id:"i033", name:"Knoblauch Olivenöl - Olivicio - 500ml", unit:"Einheiten"},
    {id:"i034", name:"Kürbiskernöl - 250ml", unit:"Einheiten"},
    {id:"i035", name:"Lemon Olivenöl - Olivicio - 100ml", unit:"Einheiten"},
    {id:"i036", name:"Lemon Olivenöl - Olivicio - 250ml", unit:"Einheiten"},
    {id:"i037", name:"Lemon Olivenöl - Olivicio - 500ml", unit:"Einheiten"},
    {id:"i038", name:"Lemon Olivenöl - Olivicio - 1000ml", unit:"Einheiten"},
    {id:"i039", name:"Mandarine Olivenöl - 100ml", unit:"Einheiten"},
    {id:"i040", name:"Mandarine Olivenöl - 250ml", unit:"Einheiten"},
    {id:"i041", name:"Mandarine Olivenöl - 500ml", unit:"Einheiten"},
    {id:"i042", name:"Olivenöl Avisado - Olivicio - 250ml", unit:"Einheiten"},
    {id:"i043", name:"Olivenöl Avisado - Olivicio - 500ml", unit:"Einheiten"},
    {id:"i044", name:"Panisse Noir 100ml", unit:"Einheiten"},
    {id:"i045", name:"Panisse Noir 500ml", unit:"Einheiten"},
    {id:"i046", name:"Orange Olivenöl - Olivicio - 100ml", unit:"Einheiten"},
    {id:"i047", name:"Orange Olivenöl - Olivicio - 250ml", unit:"Einheiten"},
    {id:"i048", name:"Orange Olivenöl - Olivicio - 500ml", unit:"Einheiten"},
    {id:"i049", name:"Thymian Olivenöl - 100ml", unit:"Einheiten"},
    {id:"i050", name:"Thymian Olivenöl - 250ml", unit:"Einheiten"},
    {id:"i051", name:"Thymian Olivenöl - 500ml", unit:"Einheiten"},
    {id:"i052", name:"Trüffelöl - Olivicio - 100ml", unit:"Einheiten"},
    {id:"i053", name:"Zitrone-Ingwer - 100ml", unit:"Einheiten"},
    {id:"i054", name:"Zitrone-Ingwer - 250ml", unit:"Einheiten"},
    {id:"i055", name:"Zitrone-Ingwer - 500ml", unit:"Einheiten"},
    {id:"i056", name:"Öl 50ml", unit:"Einheiten"},
    {id:"i057", name:"Panisse Vert 100ml", unit:"Einheiten"},
    {id:"i058", name:"Panisse Vert 500ml", unit:"Einheiten"},
  ]},
  {cat:"Gewürze", items:[
    {id:"i059", name:"Trüffelsalz - Olivicio", unit:"Einheiten"},
    {id:"i060", name:"Salz BBQ - Mühle", unit:"Einheiten"},
    {id:"i061", name:"Salz BBQ - Glas", unit:"Einheiten"},
    {id:"i062", name:"Flor de Sal - 150g", unit:"Einheiten"},
    {id:"i063", name:"Flor de Sal - 300g", unit:"Einheiten"},
    {id:"i064", name:"Flossenzauber", unit:"Einheiten"},
    {id:"i065", name:"Salzmühle Pasta & Salate - Mühle", unit:"Einheiten"},
    {id:"i066", name:"Salzmühle Pasta & Salate - Glas", unit:"Einheiten"},
    {id:"i067", name:"Tomatenpuder - Olivicio", unit:"Einheiten"},
    {id:"i068", name:"Minas Curry - College Curries", unit:"Einheiten"},
    {id:"i069", name:"Jancys Curry - College Curries", unit:"Einheiten"},
    {id:"i070", name:"Renukas Curry - College Curries", unit:"Einheiten"},
    {id:"i071", name:"Saibals Curry - College Curries", unit:"Einheiten"},
    {id:"i072", name:"Gewürz klein", unit:"Einheiten"},
    {id:"i073", name:"Steak Kräuter RUB - OPA PETERS Feine Kost", unit:"Einheiten"},
    {id:"i074", name:"Bruschetta Gewürz - OPA PETERS Feine Kost", unit:"Einheiten"},
    {id:"i075", name:"Arrabiata Gewürz - OPA PETERS Feine Kost", unit:"Einheiten"},
    {id:"i076", name:"Bolognese Gewürz", unit:"Einheiten"},
    {id:"i077", name:"WOK Wunder", unit:"Einheiten"},
    {id:"i078", name:"Dickes Huhn", unit:"Einheiten"},
    {id:"i079", name:"Grill Zauber BBQ Reagenz", unit:"Einheiten"},
    {id:"i080", name:"Pizza Pizza", unit:"Einheiten"},
    {id:"i081", name:"OLIVICIO und Opa Peters Geschenkset", unit:"Einheiten"},
    {id:"i082", name:"Schafskäse Olive", unit:"Einheiten"},
    {id:"i083", name:"Zitronenpfeffer - OPA PETERS Feine Kost", unit:"Einheiten"},
    {id:"i084", name:"Guacamole Mix", unit:"Einheiten"},
    {id:"i085", name:"Sesam Zauber", unit:"Einheiten"},
    {id:"i086", name:"Steak Pfeffer", unit:"Einheiten"},
    {id:"i087", name:"Kräuter der Provence", unit:"Einheiten"},
    {id:"i088", name:"Wild Gewürz", unit:"Einheiten"},
    {id:"i089", name:"Rauchsalz Reagenz", unit:"Einheiten"},
    {id:"i090", name:"Alter Finne", unit:"Einheiten"},
    {id:"i091", name:"Pilz Pfanne", unit:"Einheiten"},
  ]},
  {cat:"Kaffee & Tee", items:[
    {id:"i092", name:"Kaffee 500g", unit:"Einheiten"},
    {id:"i093", name:"WINTER KAFFEE 250g", unit:"Einheiten"},
    {id:"i094", name:"Kaffee 250g", unit:"Einheiten"},
    {id:"i095", name:"Kleine Tüte Kaffee", unit:"Einheiten"},
  ]},
  {cat:"Pasta & Risotto", items:[
    {id:"i096", name:"Linguine mit Zitrone und Pfeffer", unit:"Einheiten"},
    {id:"i097", name:"Linguine mit Peperoncino", unit:"Einheiten"},
    {id:"i098", name:"Tagliolini mit Tomaten", unit:"Einheiten"},
    {id:"i099", name:"Schwarze Linguine mit Tintenfischtinte", unit:"Einheiten"},
    {id:"i100", name:"Linguine m. Knoblauch + Basilikum", unit:"Einheiten"},
    {id:"i101", name:"Linguine Tricolore, 3-farbig", unit:"Einheiten"},
    {id:"i102", name:"Fettuccine mit grünen Oliven", unit:"Einheiten"},
    {id:"i103", name:"Morelli Linguine Zafferano mit Safran", unit:"Einheiten"},
    {id:"i104", name:"Eiernudeln mit Sommertrüffeln", unit:"Einheiten"},
    {id:"i105", name:"Tagliatelle mit Steinpilzen", unit:"Einheiten"},
    {id:"i106", name:"Spaghetti", unit:"Einheiten"},
    {id:"i107", name:"Risotto", unit:"Einheiten"},
  ]},
  {cat:"Salziges", items:[
    {id:"i108", name:"OLIVICIO Pesto", unit:"Einheiten"},
    {id:"i109", name:"OLIVICIO Crema", unit:"Einheiten"},
    {id:"i110", name:"Taggiasca Oliven", unit:"Einheiten"},
    {id:"i111", name:"Zwiebeln in Balsamico", unit:"Einheiten"},
    {id:"i112", name:"Sugo OLIVICIO", unit:"Einheiten"},
    {id:"i113", name:"Cracker mit Parmesan", unit:"Einheiten"},
    {id:"i114", name:"Focaccine", unit:"Einheiten"},
  ]},
  {cat:"Süßes", items:[
    {id:"i115", name:"Marabissi Gebäck", unit:"Einheiten"},
    {id:"i116", name:"Opa Peters Honig", unit:"Einheiten"},
    {id:"i117", name:"Schokowaffel", unit:"Einheiten"},
    {id:"i118", name:"Kandisticks", unit:"Einheiten"},
    {id:"i119", name:"Schoko Sticks", unit:"Einheiten"},
    {id:"i120", name:"Caramel & Chocolat Pistazie", unit:"Einheiten"},
    {id:"i121", name:"Praline jeglicher Art in kg", unit:"Einheiten"},
    {id:"i122", name:"Kleiner Schokoschirm", unit:"Einheiten"},
    {id:"i123", name:"Vollmilchschokolade Spekulatius", unit:"Einheiten"},
    {id:"i124", name:"Schoko Schirm", unit:"Einheiten"},
    {id:"i125", name:"Schoko Sardinen", unit:"Einheiten"},
    {id:"i126", name:"Gebrannte Mandeln", unit:"Einheiten"},
    {id:"i127", name:"Schoko Himbeere", unit:"Einheiten"},
    {id:"i128", name:"Opa Peters Gelee", unit:"Einheiten"},
    {id:"i129", name:"Schokolade Simon Coll", unit:"Einheiten"},
    {id:"i130", name:"Schoko Zigarre", unit:"Einheiten"},
  ]},
  {cat:"Handelsware", items:[
    {id:"i131", name:"Jutebeutel", unit:"Einheiten"},
    {id:"i132", name:"Dose Auto", unit:"Einheiten"},
    {id:"i133", name:"Schälchen Olive", unit:"Einheiten"},
    {id:"i134", name:"Postkarte", unit:"Einheiten"},
    {id:"i135", name:"Weingläser Zwiesel", unit:"Einheiten"},
    {id:"i136", name:"Karte mit Umschlag/handgemalt", unit:"Einheiten"},
  ]},
  {cat:"Verpackung", items:[
    {id:"i137", name:"Geschenkbox Holz - Klein", unit:"Einheiten"},
    {id:"i138", name:"Geschenkbox Holz - Mittel", unit:"Einheiten"},
    {id:"i139", name:"Geschenkbox Holz - Groß", unit:"Einheiten"},
  ]},
  {cat:"Spirituosen", items:[
    {id:"i140", name:"Opa Peters Likör", unit:"Einheiten"},
    {id:"i141", name:"Grappa Scuro - Der Dunkle", unit:"Einheiten"},
    {id:"i142", name:"Grappa Chiaro - Der Klare", unit:"Einheiten"},
    {id:"i143", name:"Limoncello", unit:"Einheiten"},
    {id:"i144", name:"Tumeric RAW Gin", unit:"Einheiten"},
    {id:"i145", name:"SKY Gin", unit:"Einheiten"},
    {id:"i146", name:"Heiliger Bim Bam", unit:"Einheiten"},
    {id:"i147", name:"Tumeric No.1 Gin", unit:"Einheiten"},
    {id:"i148", name:"Suburban Gin", unit:"Einheiten"},
    {id:"i149", name:"Opa Peters Likör Klein", unit:"Einheiten"},
    {id:"i150", name:"El Pato Gin", unit:"Einheiten"},
    {id:"i151", name:"Communico Rum", unit:"Einheiten"},
    {id:"i152", name:"Bitter Luxardo", unit:"Einheiten"},
    {id:"i153", name:"Helvada", unit:"Einheiten"},
    {id:"i154", name:"Aperitivo Spritz", unit:"Einheiten"},
    {id:"i155", name:"Ron Zuarin Classic 8 JAHRE", unit:"Einheiten"},
    {id:"i156", name:"Ron Zuarin SUMMER EDITION", unit:"Einheiten"},
    {id:"i157", name:"Ron Zuarin 20TH ANNIVERSARY", unit:"Einheiten"},
    {id:"i158", name:"Gin Classic 45%", unit:"Einheiten"},
    {id:"i159", name:"HerzoGin", unit:"Einheiten"},
    {id:"i160", name:"El Pato Private Reserve", unit:"Einheiten"},
    {id:"i161", name:"Tranquilo 500ml", unit:"Einheiten"},
  ]},
  {cat:"Wein & Sekt", items:[
    {id:"i162", name:"Amarone della Valpolicella Classico", unit:"Einheiten"},
    {id:"i163", name:"Lugana „Felugan“ - Azienda Agricola Felici", unit:"Einheiten"},
    {id:"i164", name:"Bender Rose", unit:"Einheiten"},
    {id:"i165", name:"Phyllitschiefer Kruger Rumpf", unit:"Einheiten"},
    {id:"i166", name:"Celti Mukuzani", unit:"Einheiten"},
    {id:"i167", name:"Weißburgunder Kruger Rumpf", unit:"Einheiten"},
    {id:"i168", name:"Riesling „Aus einem Guss“ - Lukas Kesselring", unit:"Einheiten"},
    {id:"i169", name:"Langhe Nebbiolo", unit:"Einheiten"},
    {id:"i170", name:"Gigondas", unit:"Einheiten"},
    {id:"i171", name:"Unfiltered Fumé Blanc - Peth-Wetz", unit:"Einheiten"},
    {id:"i172", name:"„Aus einem Guss“ Blanc de Noir - Lukas Kesselring", unit:"Einheiten"},
    {id:"i173", name:"Muskatteller SAND", unit:"Einheiten"},
    {id:"i174", name:"Gloria Primitivo di Manduria", unit:"Einheiten"},
    {id:"i175", name:"Celti Saparavi", unit:"Einheiten"},
    {id:"i176", name:"Mâcon-Fuissé Vitalis", unit:"Einheiten"},
    {id:"i177", name:"„Von den Terrassen“ Grüner Veltliner", unit:"Einheiten"},
    {id:"i178", name:"Riesling Brut Reh", unit:"Einheiten"},
    {id:"i179", name:"Bender Grauburgunder", unit:"Einheiten"},
    {id:"i180", name:"Palais Naturel Riesling Brut", unit:"Einheiten"},
    {id:"i181", name:"Rioja Riserva „Lar de Sotomayor“", unit:"Einheiten"},
    {id:"i182", name:"Cabernet Sauvignon & Merlot „Aus einem Guss“", unit:"Einheiten"},
    {id:"i183", name:"Guerra vermouth Rojo Reserva", unit:"Einheiten"},
    {id:"i184", name:"Kugelspiel Silvaner", unit:"Einheiten"},
    {id:"i185", name:"Chardonnay „vom Kalkmergel“", unit:"Einheiten"},
    {id:"i186", name:"„Saurus“ Cabernet Sauvignon - Familia Schroeder", unit:"Einheiten"},
    {id:"i187", name:"„Estate Selection“ Sauvignon Blanc Sekt", unit:"Einheiten"},
    {id:"i188", name:"Reichsgraf von Kesselstat", unit:"Einheiten"},
    {id:"i189", name:"Cerasuolo d’Abruzzo", unit:"Einheiten"},
    {id:"i190", name:"Sauvignon Blanc Weingut - Peth-Wetz", unit:"Einheiten"},
    {id:"i191", name:"LAN Privado Rioja", unit:"Einheiten"},
    {id:"i192", name:"Rimage „Cornet&Cie“", unit:"Einheiten"},
    {id:"i193", name:"MEUTE Crémant de Limoux Rosé", unit:"Einheiten"},
    {id:"i194", name:"Rosé d’une Nuit - Weingut Peth-Wetz", unit:"Einheiten"},
    {id:"i195", name:"Bacchus Weber", unit:"Einheiten"},
    {id:"i196", name:"Grauer Burgunder - Weingut Peth-Wetz", unit:"Einheiten"},
    {id:"i197", name:"Hungerbiene Riesling - Peth-Wetz", unit:"Einheiten"},
    {id:"i198", name:"Wien1 - Weingut Pfaffl", unit:"Einheiten"},
    {id:"i199", name:"Jean Marc Gilet VOUVRAY SEC", unit:"Einheiten"},
    {id:"i200", name:"Ein Stück vom Paradies Korrell", unit:"Einheiten"},
    {id:"i201", name:"Glühwein Kesselring", unit:"Einheiten"},
    {id:"i202", name:"Hauck Nero", unit:"Einheiten"},
    {id:"i203", name:"Flavabom", unit:"Einheiten"},
    {id:"i204", name:"Three Finger Jack", unit:"Einheiten"},
    {id:"i205", name:"Rudiae Primitivo Salento", unit:"Einheiten"},
    {id:"i206", name:"Unfiltered Black Blend", unit:"Einheiten"},
    {id:"i207", name:"Tschida Beerenauslese", unit:"Einheiten"},
    {id:"i208", name:"Scheurebe Fumé Fogt", unit:"Einheiten"},
    {id:"i209", name:"Spur der Steine Fogt", unit:"Einheiten"},
    {id:"i210", name:"„Aus einem Guss“ Auxerrois - Lukas Kesselring", unit:"Einheiten"},
    {id:"i211", name:"Crémant Eibling Brut", unit:"Einheiten"},
    {id:"i212", name:"Fogt Scheurebe trocken", unit:"Einheiten"},
    {id:"i213", name:"Casa Silva Cabernet Sauvignon", unit:"Einheiten"},
    {id:"i214", name:"Blauschiefer Riesling Lorenz feinherb", unit:"Einheiten"},
    {id:"i215", name:"Champagner", unit:"Einheiten"},
    {id:"i216", name:"Wein in Klein", unit:"Einheiten"},
    {id:"i217", name:"Prosecco Frizzante DOC", unit:"Einheiten"},
    {id:"i218", name:"Rosato Secco", unit:"Einheiten"},
    {id:"i219", name:"Montepulciano D'Abruzzo Jasci & Marchesani", unit:"Einheiten"},
    {id:"i220", name:"„Tesoro di Andrea“ Chianti Classico", unit:"Einheiten"},
  ]},
];

const CATALOG_PRODUKTION = [
  {cat:"Gläser, Flaschen und Dosen", items:[
    {id:"i221", name:"Gewürz Gläser Schwarz", unit:"Einheiten"},
    {id:"i222", name:"Gewürz Gläser Transparent", unit:"Einheiten"},
    {id:"i223", name:"Gewürz Mühle", unit:"Einheiten"},
    {id:"i224", name:"Großes Gewürz Glas", unit:"Einheiten"},
    {id:"i225", name:"Dose 100ml", unit:"Einheiten"},
    {id:"i226", name:"Dose 250ml", unit:"Einheiten"},
    {id:"i227", name:"Dose 500ml", unit:"Einheiten"},
    {id:"i228", name:"Dose 1000ml", unit:"Einheiten"},
    {id:"i229", name:"Essig Flaschen 250ml", unit:"Einheiten"},
    {id:"i230", name:"Kleines Bügelglas", unit:"Einheiten"},
    {id:"i231", name:"Großes Bügelglas", unit:"Einheiten"},
    {id:"i232", name:"Schwarze Flaschen Klein", unit:"Einheiten"},
    {id:"i233", name:"Schwarze Flaschen Groß", unit:"Einheiten"},
    {id:"i234", name:"Grappa Flaschen", unit:"Einheiten"},
    {id:"i235", name:"Limoncello Flaschen", unit:"Einheiten"},
    {id:"i236", name:"Tomatenpuder/- Trüffelsalzgläser", unit:"Einheiten"},
    {id:"i237", name:"Apotheker Flaschen", unit:"Einheiten"},
    {id:"i238", name:"Schachtel Grappa", unit:"Einheiten"},
    {id:"i239", name:"Korken Tapi", unit:"Einheiten"},
    {id:"i240", name:"Korken Trüffel", unit:"Einheiten"},
    {id:"i241", name:"Limoncello Deckel", unit:"Einheiten"},
    {id:"i242", name:"Korken Grappa", unit:"Einheiten"},
    {id:"i243", name:"Reagenzgläser inkl. Deckel", unit:"Einheiten"},
    {id:"i244", name:"Deckel kleine schwarze Flasche", unit:"Einheiten"},
    {id:"i245", name:"Deckel große schwarze Flasche", unit:"Einheiten"},
    {id:"i246", name:"versch. Schrumpfkapseln", unit:"Einheiten"},
    {id:"i247", name:"Tomatenpuder/- Trüffelsalzdeckel", unit:"Einheiten"},
    {id:"i248", name:"Deckel Gewürzgläser", unit:"Einheiten"},
  ]},
  {cat:"Verpackungsmaterial und Etikett", items:[
    {id:"i249", name:"Speedman Box", unit:"Einheiten"},
    {id:"i250", name:"Paketband", unit:"Einheiten"},
    {id:"i251", name:"6er Karton", unit:"Einheiten"},
    {id:"i252", name:"kleiner Karton", unit:"Einheiten"},
    {id:"i253", name:"mittlerer Karton", unit:"Einheiten"},
    {id:"i254", name:"großer Karton", unit:"Einheiten"},
    {id:"i255", name:"Schachtel für Geschenksets", unit:"Einheiten"},
    {id:"i256", name:"Blanco 100ml", unit:"Einheiten"},
    {id:"i257", name:"Blanco 250ml", unit:"Einheiten"},
    {id:"i258", name:"Blanco 500ml", unit:"Einheiten"},
    {id:"i259", name:"Blanco Essig", unit:"Einheiten"},
    {id:"i260", name:"Blanco Reagenz", unit:"Einheiten"},
    {id:"i261", name:"Sonstige Etiketten", unit:"Einheiten"},
    {id:"i262", name:"Holzwolle", unit:"Einheiten"},
  ]},
  {cat:"Öle Lager", items:[
    {id:"i263", name:"Rosmarin", unit:"Liter"},
    {id:"i264", name:"Chili", unit:"Liter"},
    {id:"i265", name:"Knoblauch", unit:"Liter"},
    {id:"i266", name:"Thymian", unit:"Liter"},
    {id:"i267", name:"Basilikum", unit:"Liter"},
    {id:"i268", name:"Lemon", unit:"Liter"},
    {id:"i269", name:"Kürbis", unit:"Liter"},
    {id:"i270", name:"Ingwer", unit:"Liter"},
    {id:"i271", name:"Basic One", unit:"Liter"},
    {id:"i272", name:"Orange", unit:"Liter"},
    {id:"i273", name:"Hojiblanca", unit:"Liter"},
    {id:"i274", name:"Arbequina", unit:"Liter"},
    {id:"i275", name:"Mandarine", unit:"Liter"},
    {id:"i276", name:"Frantoio", unit:"Liter"},
    {id:"i277", name:"Noir", unit:"Liter"},
    {id:"i278", name:"Vert", unit:"Liter"},
    {id:"i279", name:"Trüffel", unit:"Liter"},
  ]},
  {cat:"Essige Lager", items:[
    {id:"i280", name:"Mango", unit:"Liter"},
    {id:"i281", name:"Weißer", unit:"Liter"},
    {id:"i282", name:"Granatapfel", unit:"Liter"},
    {id:"i283", name:"Feige", unit:"Liter"},
    {id:"i284", name:"Apfel", unit:"Liter"},
    {id:"i285", name:"Himbeere", unit:"Liter"},
    {id:"i286", name:"Trüffel", unit:"Liter"},
  ]},
  {cat:"Gewürze Lager", items:[
    {id:"i287", name:"Wild Gewürz", unit:"kg"},
    {id:"i288", name:"Grill Mix Barbecue", unit:"kg"},
    {id:"i289", name:"Pizza", unit:"kg"},
    {id:"i290", name:"Schafskäse", unit:"kg"},
    {id:"i291", name:"Pilz", unit:"kg"},
    {id:"i292", name:"Steak", unit:"kg"},
    {id:"i293", name:"Fisch Scampi", unit:"kg"},
    {id:"i294", name:"Flammlachs", unit:"kg"},
    {id:"i295", name:"BBQ Pfeffer", unit:"kg"},
    {id:"i296", name:"Salz Blauer Sack", unit:"kg"},
    {id:"i297", name:"Salz Meersalz", unit:"kg"},
    {id:"i298", name:"Sesamzauber", unit:"kg"},
    {id:"i299", name:"Bruschetta", unit:"kg"},
    {id:"i300", name:"Arrabiatta", unit:"kg"},
    {id:"i301", name:"Zitronenpeffer", unit:"kg"},
    {id:"i302", name:"Bolognese", unit:"kg"},
    {id:"i303", name:"Kräutersalz einzelnd", unit:"kg"},
    {id:"i304", name:"Kräutersalz gemischt", unit:"kg"},
    {id:"i305", name:"Guacamole", unit:"kg"},
    {id:"i306", name:"Hähnchen", unit:"kg"},
    {id:"i307", name:"Trüffelsalz", unit:"kg"},
    {id:"i308", name:"Kräuter der Provence", unit:"kg"},
    {id:"i309", name:"WOK", unit:"kg"},
    {id:"i310", name:"Tomatenpuder", unit:"kg"},
  ]},
];

let state = {
  loading: true,
  role: null,     // "laden" | "produktion" | "empfangen" | null
  cart: {},       // id -> qty
  name: "",
  dept: "",
  note: "",
  pendingImages: [],
  lightboxSrc: null,
  orders: [],
  expanded: null,
  toast: null,
  filter: "offen", // for Empfänger-Seite: "offen" | "erledigt" | "alle"
  bereichFilter: "alle", // "alle" | "Laden" | "Produktion"
  search: "",
  openCats: new Set(),
  rhythmusFilter: "freitag", // "freitag" | "monat"
  sammlungOffset: 0, // 0 = aktueller Zeitraum, -1 = vorheriger, usw.
  // (Zielauswahl "Produktion/Geschäftsführung" entfernt – Bestellung geht direkt in die Übersicht)
  artikeldaten: {}, // { itemId: { ve: "...", haendler: "..." } }
  editingItem: null, // itemId, das gerade im Popup bearbeitet wird
  gfTab: "freitagssammlung", // "freitagssammlung" | "monatssammlung" | "artikel" | "haendler" | "email"
  confirmDeleteId: null,
  editingOrderId: null,
  editingOrderDraft: null, // { items: [...], note: '' }
  chatDraft: "",
  ladenTab: "neu", // "neu" | "bestellungen" (nur für Rolle "laden")
  produktionTab: "neu", // "neu" | "bestellungen" (nur für Rolle "produktion")
  prodBackendTab: "freitag", // "freitag" | "monat" (nur für Rolle "backend_produktion")
  customItems: [],
  deletedItems: [],
  confirmDeleteArtikelId: null,
  editingImageData: undefined, // undefined=unverändert, null=entfernt, string=neues Bild
  haendlerListe: [],
  notifyEmails: [],
  newEmailInput: "",
  newEmailBereich: "alle",
  haendlerPopup: null, // {mode:'new'|'edit', originalName, value}
  confirmDeleteHaendlerName: null,
  pendingRole: null,
  codeInput: "",
  codeError: false,
  newItemPopupOpen: false,
  newItem: { name:"", kategorie:"", bereich:"Laden", unit:"Einheiten", ve:"", haendler:"", rhythmus:"beide" },
  stammSearch: "",
  stammOpenCats: new Set(),
};

async function loadOrders(){
  try{
    const res = await cloudStorage.get('orders');
    state.orders = res ? JSON.parse(res.value) : [];
  }catch(e){
    state.orders = [];
  }
  try{
    const res2 = await cloudStorage.get('artikeldaten');
    state.artikeldaten = res2 ? JSON.parse(res2.value) : {};
  }catch(e){
    state.artikeldaten = {};
  }
  try{
    const res3 = await cloudStorage.get('customItems');
    state.customItems = res3 ? JSON.parse(res3.value) : [];
  }catch(e){
    state.customItems = [];
  }
  try{
    const res4 = await cloudStorage.get('haendlerListe');
    state.haendlerListe = res4 ? JSON.parse(res4.value) : [];
  }catch(e){
    state.haendlerListe = [];
  }
  try{
    const res5 = await cloudStorage.get('notifyEmails');
    const raw = res5 ? JSON.parse(res5.value) : [];
    state.notifyEmails = raw.map(entry =>
      typeof entry === 'string' ? { email: entry, bereich: 'alle' } : entry
    );
  }catch(e){
    state.notifyEmails = [];
  }
  try{
    const res6 = await cloudStorage.get('deletedItems');
    state.deletedItems = res6 ? JSON.parse(res6.value) : [];
  }catch(e){
    state.deletedItems = [];
  }
  let seedChanged = false;
  for(const id in ARTIKELDATEN_SEED){
    if(!state.artikeldaten[id]){
      state.artikeldaten[id] = ARTIKELDATEN_SEED[id];
      seedChanged = true;
    } else if(ARTIKELDATEN_SEED[id].rhythmus && !state.artikeldaten[id].rhythmus){
      // Bestellrhythmus nachträglich ergänzen, ohne VE/Händler/Foto zu überschreiben
      state.artikeldaten[id].rhythmus = ARTIKELDATEN_SEED[id].rhythmus;
      seedChanged = true;
    }
  }
  if(seedChanged) saveArtikeldaten();
  let haendlerSeedChanged = false;
  Object.values(state.artikeldaten).forEach(d=>{
    if(d.haendler && d.haendler.trim() && !state.haendlerListe.includes(d.haendler.trim())){
      state.haendlerListe.push(d.haendler.trim());
      haendlerSeedChanged = true;
    }
  });
  if(haendlerSeedChanged) saveHaendlerListe();
  state.loading = false;
  render();
}

async function saveOrders(){
  try{
    await cloudStorage.set('orders', JSON.stringify(state.orders));
  }catch(e){
    console.error('Speichern fehlgeschlagen', e);
  }
}

async function saveArtikeldaten(){
  try{
    await cloudStorage.set('artikeldaten', JSON.stringify(state.artikeldaten));
  }catch(e){
    console.error('Speichern fehlgeschlagen', e);
  }
}

async function saveCustomItems(){
  try{
    await cloudStorage.set('customItems', JSON.stringify(state.customItems));
  }catch(e){
    console.error('Speichern fehlgeschlagen', e);
  }
}

async function saveDeletedItems(){
  try{
    await cloudStorage.set('deletedItems', JSON.stringify(state.deletedItems));
  }catch(e){
    console.error('Speichern fehlgeschlagen', e);
  }
}

async function saveHaendlerListe(){
  try{
    await cloudStorage.set('haendlerListe', JSON.stringify(state.haendlerListe));
  }catch(e){
    console.error('Speichern fehlgeschlagen', e);
  }
}

async function saveNotifyEmails(){
  try{
    await cloudStorage.set('notifyEmails', JSON.stringify(state.notifyEmails));
  }catch(e){
    console.error('Speichern fehlgeschlagen', e);
  }
}

function isValidEmail(v){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

async function addNotifyEmail(){
  const val = state.newEmailInput.trim();
  if(!val || !isValidEmail(val)) return;
  if(!state.notifyEmails.some(e=>e.email===val)){
    state.notifyEmails.push({ email: val, bereich: state.newEmailBereich });
    await saveNotifyEmails();
  }
  state.newEmailInput = "";
  state.newEmailBereich = "alle";
  render();
}

async function removeNotifyEmail(email){
  state.notifyEmails = state.notifyEmails.filter(e=>e.email!==email);
  await saveNotifyEmails();
  render();
}

async function changeNotifyEmailBereich(email, bereich){
  const entry = state.notifyEmails.find(e=>e.email===email);
  if(entry){
    entry.bereich = bereich;
    await saveNotifyEmails();
  }
  render();
}

function getCombinedCatalog(bereich){
  const base = bereich === 'Laden' ? CATALOG_LADEN : CATALOG_PRODUKTION;
  const result = base
    .map(c => ({cat: c.cat, items: c.items.filter(it => !state.deletedItems.includes(it.id))}))
    .filter(c => c.items.length > 0);
  state.customItems.filter(ci => ci.bereich === bereich && !state.deletedItems.includes(ci.id)).forEach(ci => {
    let group = result.find(c => c.cat === ci.kategorie);
    if(!group){ group = {cat: ci.kategorie, items: []}; result.push(group); }
    group.items.push({id: ci.id, name: ci.name, unit: ci.unit});
  });
  return result;
}

function getAllKategorien(){
  const set = new Set();
  [...CATALOG_LADEN, ...CATALOG_PRODUKTION].forEach(c => set.add(c.cat));
  state.customItems.forEach(ci => set.add(ci.kategorie));
  return [...set].sort();
}

function getAllHaendler(){
  const set = new Set(state.haendlerListe);
  Object.values(state.artikeldaten).forEach(d => { if(d.haendler && d.haendler.trim()) set.add(d.haendler.trim()); });
  return [...set].sort((a,b)=>a.localeCompare(b,'de'));
}

function renderHaendlerField(prefix, currentValue){
  const liste = getAllHaendler();
  const isKnown = currentValue && liste.includes(currentValue);
  const isNeu = currentValue && !isKnown;
  return `
    <select class="field" id="${prefix}-haendler-select">
      <option value="">— keiner —</option>
      ${liste.map(h=>`<option value="${h.replace(/"/g,'&quot;')}" ${currentValue===h?'selected':''}>${h}</option>`).join('')}
      <option value="__neu__" ${isNeu?'selected':''}>+ Neuer Händler…</option>
    </select>
    <input class="field" id="${prefix}-haendler-neu" type="text" placeholder="Name des neuen Händlers"
      style="margin-top:6px;${isNeu?'':'display:none;'}"
      value="${isNeu ? currentValue.replace(/"/g,'&quot;') : ''}" />
  `;
}

function findItem(id){
  const custom = state.customItems.find(ci => ci.id === id);
  if(custom) return {id: custom.id, name: custom.name, unit: custom.unit};
  for(const c of [...CATALOG_LADEN, ...CATALOG_PRODUKTION]){
    const f = c.items.find(i=>i.id===id);
    if(f) return f;
  }
  return null;
}

function findItemKategorie(id){
  const custom = state.customItems.find(ci => ci.id === id);
  if(custom) return custom.kategorie;
  for(const c of [...CATALOG_LADEN, ...CATALOG_PRODUKTION]){
    if(c.items.some(i=>i.id===id)) return c.cat;
  }
  return null;
}

function cartCount(){
  return Object.values(state.cart).reduce((a,b)=>a+b,0);
}

function saveCartToLocal(){
  if(state.role !== 'laden' && state.role !== 'produktion') return;
  try{
    localStorage.setItem(`cart_${state.role}`, JSON.stringify(state.cart));
    localStorage.setItem(`cartNote_${state.role}`, state.note || '');
  }catch(e){ /* localStorage evtl. nicht verfügbar - Warenkorb bleibt dann nur im Speicher */ }
}

function loadCartFromLocal(role){
  try{
    const raw = localStorage.getItem(`cart_${role}`);
    state.cart = raw ? JSON.parse(raw) : {};
    state.note = localStorage.getItem(`cartNote_${role}`) || '';
  }catch(e){
    state.cart = {};
  }
}

function clearCartLocal(){
  try{
    localStorage.removeItem(`cart_${state.role}`);
    localStorage.removeItem(`cartNote_${state.role}`);
  }catch(e){ /* ignore */ }
}

function changeQty(id, delta){
  const cur = state.cart[id] || 0;
  const next = Math.max(0, cur + delta);
  if(next === 0){ delete state.cart[id]; }
  else{ state.cart[id] = next; }
  saveCartToLocal();
  render();
}

function removeCartItem(id){
  delete state.cart[id];
  saveCartToLocal();
  render();
}

const MAX_IMAGES_PER_ORDER = 6;

function handleImageFiles(fileList){
  const files = Array.from(fileList || []).filter(f => f.type.startsWith('image/'));
  const remaining = MAX_IMAGES_PER_ORDER - state.pendingImages.length;
  files.slice(0, Math.max(remaining, 0)).forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 900;
        let w = img.width, h = img.height;
        if(w > maxDim || h > maxDim){
          const scale = maxDim / Math.max(w, h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        state.pendingImages.push(canvas.toDataURL('image/jpeg', 0.7));
        render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function removeImage(index){
  state.pendingImages.splice(index, 1);
  render();
}

async function submitOrder(){
  const items = Object.entries(state.cart).map(([id,qty])=>{
    const it = findItem(id);
    return {id, name:it.name, unit:it.unit, qty};
  });
  if(items.length===0){ return; }
  const order = {
    id: Date.now().toString(36),
    bereich: state.role === 'produktion' ? 'Produktion' : 'Laden',
    rhythmus: state.rhythmusFilter,
    note: state.note.trim(),
    images: [...state.pendingImages],
    date: new Date().toISOString(),
    status: "offen",
    items,
    chat: [],
  };
  state.orders.unshift(order);
  await saveOrders();
  sendOrderEmail(order);
  state.cart = {};
  state.note = "";
  state.pendingImages = [];
  clearCartLocal();
  state.toast = "Bestellung wurde übermittelt.";
  render();
  setTimeout(()=>{ state.toast=null; render(); }, 3500);
}

async function toggleStatus(orderId){
  const o = state.orders.find(x=>x.id===orderId);
  if(!o) return;
  o.status = o.status === "offen" ? "erledigt" : "offen";
  await saveOrders();
  render();
}

async function markAlleErledigt(idsCsv){
  const ids = idsCsv.split(',').filter(Boolean);
  if(ids.length === 0) return;
  let geaendert = false;
  ids.forEach(id => {
    const o = state.orders.find(x=>x.id===id);
    if(o && o.status === 'offen'){ o.status = 'erledigt'; geaendert = true; }
  });
  if(geaendert) await saveOrders();
  render();
}

function askDeleteOrder(orderId){
  state.confirmDeleteId = orderId;
  render();
}

function cancelDeleteOrder(){
  state.confirmDeleteId = null;
  render();
}

async function deleteOrder(orderId){
  state.orders = state.orders.filter(o=>o.id!==orderId);
  await saveOrders();
  state.confirmDeleteId = null;
  state.expanded = null;
  render();
}

function openOrderEditPopup(orderId){
  const order = state.orders.find(o=>o.id===orderId);
  if(!order) return;
  state.editingOrderId = orderId;
  state.editingOrderDraft = {
    items: order.items.map(it => ({...it})),
    note: order.note || '',
  };
  render();
}

function closeOrderEditPopup(){
  state.editingOrderId = null;
  state.editingOrderDraft = null;
  render();
}

function changeOrderEditQty(itemId, delta){
  const draft = state.editingOrderDraft;
  if(!draft) return;
  const item = draft.items.find(it => it.id === itemId);
  if(!item) return;
  item.qty = Math.max(0, item.qty + delta);
  if(item.qty === 0){
    draft.items = draft.items.filter(it => it.id !== itemId);
  }
  render();
}

function removeOrderEditItem(itemId){
  const draft = state.editingOrderDraft;
  if(!draft) return;
  draft.items = draft.items.filter(it => it.id !== itemId);
  render();
}

async function saveOrderEdit(){
  const order = state.orders.find(o=>o.id===state.editingOrderId);
  const draft = state.editingOrderDraft;
  if(!order || !draft || draft.items.length === 0) return;
  order.items = draft.items;
  order.note = draft.note.trim();
  await saveOrders();
  state.editingOrderId = null;
  state.editingOrderDraft = null;
  render();
}

function getSammelZeitraum(rhythmus, offset){
  offset = offset || 0;
  const now = new Date();
  if(rhythmus === 'monat'){
    const start = new Date(now.getFullYear(), now.getMonth() + offset, 1, 0, 1, 0, 0);
    const ende = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59, 999);
    return { start, ende };
  }
  // freitag: Samstag 00:01 bis Freitag 23:59 der jeweiligen Woche
  const tag = now.getDay(); // 0=So, 1=Mo, ..., 6=Sa
  const diffZuSamstag = (tag - 6 + 7) % 7;
  const samstag = new Date(now);
  samstag.setHours(0,1,0,0);
  samstag.setDate(samstag.getDate() - diffZuSamstag + offset*7);
  const freitagEnde = new Date(samstag);
  freitagEnde.setDate(samstag.getDate() + 6);
  freitagEnde.setHours(23,59,59,999);
  return { start: samstag, ende: freitagEnde };
}

function getSammlung(rhythmus, itemFilterFn, orderFilterFn, offset){
  const { start, ende } = getSammelZeitraum(rhythmus, offset);
  const orders = state.orders.filter(o => {
    if(o.rhythmus !== rhythmus) return false;
    if(orderFilterFn && !orderFilterFn(o)) return false;
    const d = new Date(o.date);
    return d >= start && d <= ende;
  });

  const summen = {}; // itemId -> {name, unit, qty}
  orders.forEach(o => {
    const items = itemFilterFn ? o.items.filter(itemFilterFn) : o.items;
    items.forEach(it => {
      if(!summen[it.id]) summen[it.id] = { id: it.id, name: it.name, unit: it.unit, qty: 0 };
      summen[it.id].qty += it.qty;
    });
  });

  return { start, ende, orders, summen: Object.values(summen) };
}

function fmtDatumKurz(d){
  return d.toLocaleDateString('de-DE', {day:'2-digit',month:'2-digit'});
}

function fmtDate(iso){
  const d = new Date(iso);
  return d.toLocaleDateString('de-DE', {day:'2-digit',month:'2-digit',year:'numeric'}) + ' · ' +
         d.toLocaleTimeString('de-DE', {hour:'2-digit',minute:'2-digit'});
}

function getImageDims(dataUrl){
  return new Promise(resolve=>{
    const img = new Image();
    img.onload = ()=> resolve({w: img.naturalWidth, h: img.naturalHeight});
    img.onerror = ()=> resolve({w: 1, h: 1});
    img.src = dataUrl;
  });
}

async function downloadSammlungPdf(rhythmus, produktionOnly, bereich, offset){
  if(!window.jspdf){
    alert('PDF-Bibliothek konnte nicht geladen werden. Bitte Internetverbindung prüfen und Seite neu laden.');
    return;
  }
  const orderFilterFn = bereich ? (o => o.bereich === bereich) : null;
  const { start, ende, orders, summen } = getSammlung(rhythmus, produktionOnly ? (it => isProduktionsArtikel(it.id)) : null, orderFilterFn, offset);
  if(summen.length === 0) return;

  const NAVY = [35, 58, 82];
  const NAVY_DARK = [22, 40, 59];
  const INK = [33, 31, 26];
  const INK_SOFT = [109, 105, 95];
  const ROW_ALT = [244, 242, 236];

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 16;
  const contentWidth = pageWidth - marginX*2;
  let y = 20;

  doc.setFont(undefined, 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...NAVY_DARK);
  doc.text(rhythmus === 'monat' ? 'MONATS-SAMMLUNG' : 'FREITAGS-SAMMLUNG', marginX, y);

  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...INK_SOFT);
  doc.text('ZEITRAUM', pageWidth - marginX - 60, y - 9);
  doc.text('BESTELLUNGEN', pageWidth - marginX - 60, y - 1);
  doc.setTextColor(...INK);
  doc.setFont(undefined, 'bold');
  doc.text(`${fmtDatumKurz(start)} – ${fmtDatumKurz(ende)}`, pageWidth - marginX, y - 9, { align: 'right' });
  doc.text(String(orders.length), pageWidth - marginX, y - 1, { align: 'right' });

  y += 6;
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(1.2);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 12;

  const groups = {};
  summen.forEach(s => {
    const d = state.artikeldaten[s.id] || {};
    const haendler = d.haendler || 'Ohne Händler zugeordnet';
    groups[haendler] = groups[haendler] || [];
    groups[haendler].push({...s, ve: d.ve || '—'});
  });

  Object.keys(groups).sort().forEach(haendler => {
    if(y > 265){ doc.addPage(); y = 20; }
    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...NAVY);
    doc.text(haendler, marginX, y);
    y += 4;

    doc.autoTable({
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [['MENGE', 'ARTIKEL', 'EINHEIT', 'VE']],
      body: groups[haendler].map(s => [String(s.qty), s.name, s.unit, s.ve]),
      theme: 'plain',
      styles: { fontSize: 9.5, textColor: INK, cellPadding: {top:4,bottom:4,left:3,right:3}, lineColor: [233,228,217], lineWidth: 0.3 },
      headStyles: { fillColor: NAVY, textColor: [255,255,255], fontStyle: 'bold', halign: 'left' },
      alternateRowStyles: { fillColor: ROW_ALT },
      columnStyles: { 0: { cellWidth: 20 } },
    });
    y = doc.lastAutoTable.finalY + 12;
  });

  doc.save(`${rhythmus === 'monat' ? 'Monats' : 'Freitags'}-Sammlung_${fmtDatumKurz(start).replace('.','')}-${fmtDatumKurz(ende).replace('.','')}.pdf`);
}

async function downloadOrderPdf(orderId, produktionOnly){
  if(!window.jspdf){
    alert('PDF-Bibliothek konnte nicht geladen werden. Bitte Internetverbindung prüfen und Seite neu laden.');
    return;
  }
  const original = state.orders.find(o=>o.id===orderId);
  if(!original) return;
  const order = produktionOnly
    ? { ...original, items: original.items.filter(it => isProduktionsArtikel(it.id)) }
    : original;
  if(order.items.length === 0) return;

  const orderNummer = String(parseInt(order.id, 36) % 100000).padStart(5, '0');

  const NAVY = [35, 58, 82];
  const NAVY_DARK = [22, 40, 59];
  const INK = [33, 31, 26];
  const INK_SOFT = [109, 105, 95];
  const ROW_ALT = [244, 242, 236];

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 16;
  const contentWidth = pageWidth - marginX*2;
  let y = 20;

  // --- Kopfzeile: Titel links, Bestellnummer/Datum rechts ---
  doc.setFont(undefined, 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...NAVY_DARK);
  doc.text('BESTELLUNG', marginX, y);

  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...INK_SOFT);
  doc.text('BESTELL-NR.', pageWidth - marginX - 55, y - 9);
  doc.text('DATUM', pageWidth - marginX - 55, y - 1);
  doc.setTextColor(...INK);
  doc.setFont(undefined, 'bold');
  doc.text(String(orderNummer), pageWidth - marginX, y - 9, { align: 'right' });
  doc.text(fmtDate(order.date), pageWidth - marginX, y - 1, { align: 'right' });

  y += 6;
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(1.2);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 12;

  // --- Info-Block: Herkunft links, Status/Ziel rechts ---
  const colWidth = contentWidth/2 - 6;
  doc.setFont(undefined, 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...NAVY);
  doc.text('BEREICH', marginX, y);
  doc.text('STATUS', marginX + colWidth + 12, y);
  y += 6;

  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  const linksInfo = [
    order.bereich || 'Laden',
    order.name ? `Name: ${order.name}` : null,
    order.dept ? `Abteilung: ${order.dept}` : null,
  ].filter(Boolean);
  const rechtsInfo = [
    order.status === 'offen' ? 'Offen' : 'Erledigt',
    order.ziel ? `Ziel: ${order.ziel}` : null,
  ].filter(Boolean);
  const maxRows = Math.max(linksInfo.length, rechtsInfo.length);
  for(let i=0; i<maxRows; i++){
    if(linksInfo[i]) doc.text(linksInfo[i], marginX, y);
    if(rechtsInfo[i]) doc.text(rechtsInfo[i], marginX + colWidth + 12, y);
    y += 6;
  }
  y += 6;

  // --- Artikeltabelle im Vorlagen-Stil (navy Kopf, alternierende Zeilen) ---
  const zeigeHaendler = order.items.some(it => state.artikeldaten[it.id]?.haendler);
  const zeigeVe = order.items.some(it => state.artikeldaten[it.id]?.ve);
  const head = [['MENGE', 'ARTIKEL', 'EINHEIT']];
  if(zeigeVe) head[0].push('VE');
  if(zeigeHaendler) head[0].push('HÄNDLER');

  const body = order.items.map(it => {
    const d = state.artikeldaten[it.id] || {};
    const row = [String(it.qty), it.name, it.unit];
    if(zeigeVe) row.push(d.ve || '—');
    if(zeigeHaendler) row.push(d.haendler || '—');
    return row;
  });

  doc.autoTable({
    startY: y,
    margin: { left: marginX, right: marginX },
    head, body,
    theme: 'plain',
    styles: { fontSize: 9.5, textColor: INK, cellPadding: {top:4,bottom:4,left:3,right:3}, lineColor: [233,228,217], lineWidth: 0.3 },
    headStyles: { fillColor: NAVY, textColor: [255,255,255], fontStyle: 'bold', halign: 'left' },
    alternateRowStyles: { fillColor: ROW_ALT },
    columnStyles: { 0: { cellWidth: 20 } },
  });
  y = doc.lastAutoTable.finalY + 12;

  // --- Anmerkung als Notiz-Box ---
  if(order.note){
    if(y > 250){ doc.addPage(); y = 20; }
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.text('ANMERKUNG', marginX, y);
    y += 6;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    const lines = doc.splitTextToSize(order.note, contentWidth - 10);
    const boxHeight = lines.length * 5.5 + 10;
    if(y + boxHeight > 285){ doc.addPage(); y = 20; }
    doc.setDrawColor(233,228,217);
    doc.setFillColor(250,249,246);
    doc.roundedRect(marginX, y, contentWidth, boxHeight, 2, 2, 'FD');
    doc.text(lines, marginX + 5, y + 8);
    y += boxHeight;
  }

  // --- Fotos auf eigenen Seiten ---
  const imgs = order.images || (order.image ? [order.image] : []);
  for(const src of imgs){
    try{
      const {w,h} = await getImageDims(src);
      doc.addPage();
      const maxW = pageWidth - marginX*2;
      const maxH = pageHeight - 40;
      let drawW = maxW;
      let drawH = (h/w) * drawW;
      if(drawH > maxH){ drawH = maxH; drawW = (w/h) * drawH; }
      doc.setFont(undefined, 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...NAVY_DARK);
      doc.text('FOTO ZUR BESTELLUNG', marginX, 20);
      doc.addImage(src, 'JPEG', marginX, 28, drawW, drawH);
    }catch(e){
      console.error('Foto konnte nicht ins PDF eingefügt werden:', e);
    }
  }

  doc.save(`Bestellung_${orderNummer}.pdf`);
}

function setRole(r){
  state.role = r;
  state.expanded = null;
  state.ladenTab = 'neu';
  state.produktionTab = 'neu';
  state.prodBackendTab = 'freitag';
  state.gfTab = 'freitagssammlung';
  state.sammlungOffset = 0;
  if(r === 'laden' || r === 'produktion'){
    loadCartFromLocal(r);
  }
  render();
}

const CODE_GUELTIGKEIT_MS = 60 * 60 * 1000; // 60 Minuten

function istRolleNochAutorisiert(role){
  try{
    const bis = parseInt(localStorage.getItem(`auth_${role}`) || '0', 10);
    return bis > Date.now();
  }catch(e){
    return false;
  }
}

function merkeAutorisierung(role){
  try{
    localStorage.setItem(`auth_${role}`, String(Date.now() + CODE_GUELTIGKEIT_MS));
  }catch(e){ /* ignore */ }
}

function requestRoleAccess(role){
  if(istRolleNochAutorisiert(role)){
    setRole(role);
    return;
  }
  state.pendingRole = role;
  state.codeInput = "";
  state.codeError = false;
  render();
}

function cancelCode(){
  state.pendingRole = null;
  state.codeInput = "";
  state.codeError = false;
  render();
}

function pressCodeKey(k){
  if(state.codeInput.length >= 10) return;
  state.codeInput += k;
  state.codeError = false;
  render();
}

function backspaceCode(){
  state.codeInput = state.codeInput.slice(0, -1);
  state.codeError = false;
  render();
}

function submitCode(){
  const expected = ROLE_CODES[state.pendingRole];
  if(state.codeInput === expected){
    const role = state.pendingRole;
    state.pendingRole = null;
    state.codeInput = "";
    state.codeError = false;
    merkeAutorisierung(role);
    setRole(role);
  } else {
    state.codeError = true;
    state.codeInput = "";
    render();
  }
}

function renderCodePopup(){
  const labels = {
    laden: 'Bestellungen für den Laden',
    produktion: 'Bestellungen für die Produktion',
    backend_produktion: 'Backend Produktion',
    backend_geschaeftsfuehrung: 'Backend Geschäftsführung',
  };
  const dots = Array.from({length: Math.max(state.codeInput.length, 4)}, (_, i) =>
    `<span class="code-dot ${i < state.codeInput.length ? 'filled' : ''}"></span>`
  ).join('');
  const keys = ['1','2','3','4','5','6','7','8','9','⌫','0','✓'];
  return `
    <div class="popup-overlay" data-action="cancelcode">
      <div class="popup-box" onclick="event.stopPropagation()">
        <h3>Zugangscode</h3>
        <p class="code-sub">${labels[state.pendingRole] || ''}</p>
        <div class="code-dots">${dots}</div>
        ${state.codeError ? `<p class="code-error">Falscher Code, bitte erneut versuchen.</p>` : ''}
        <div class="code-keypad">
          ${keys.map(k => {
            if(k === '⌫') return `<button class="code-key code-key-alt" data-action="codebackspace">⌫</button>`;
            if(k === '✓') return `<button class="code-key code-key-alt" data-action="submitcode">✓</button>`;
            return `<button class="code-key" data-action="codekey" data-key="${k}">${k}</button>`;
          }).join('')}
        </div>
        <div class="popup-actions">
          <button class="popup-cancel" data-action="cancelcode">Abbrechen</button>
        </div>
      </div>
    </div>
  `;
}
function setExpanded(id){ state.expanded = state.expanded === id ? null : id; state.chatDraft = ""; render(); }
function setFilter(f){ state.filter = f; render(); }
function setLadenTab(t){ state.ladenTab = t; state.expanded = null; state.sammlungOffset = 0; render(); }
function setProduktionTab(t){ state.produktionTab = t; state.expanded = null; state.sammlungOffset = 0; render(); }
function setProdBackendTab(t){ state.prodBackendTab = t; state.expanded = null; state.sammlungOffset = 0; render(); }
function setRhythmusFilter(r){ state.rhythmusFilter = r; state.sammlungOffset = 0; render(); }
function navigiereSammlung(dir){
  const next = state.sammlungOffset + dir;
  if(next > 0) return; // nicht in die Zukunft navigieren
  state.sammlungOffset = next;
  render();
}
function sammlungHeute(){ state.sammlungOffset = 0; render(); }

function senderLabel(){
  if(state.role === 'laden') return 'Laden';
  if(state.role === 'produktion') return 'Produktion';
  if(state.role === 'backend_produktion') return 'Backend Produktion';
  if(state.role === 'backend_geschaeftsfuehrung') return 'Geschäftsführung';
  return 'Unbekannt';
}

function canChat(){
  return state.role === 'laden' || state.role === 'backend_produktion';
}

async function sendChatMessage(orderId){
  const text = state.chatDraft.trim();
  if(!text) return;
  const order = state.orders.find(o=>o.id===orderId);
  if(!order) return;
  if(!order.chat) order.chat = [];
  order.chat.push({ from: senderLabel(), text, date: new Date().toISOString() });
  await saveOrders();
  state.chatDraft = "";
  render();
}
function setBereichFilter(b){ state.bereichFilter = b; render(); }
function setGfTab(t){ state.gfTab = t; state.editingItem = null; state.sammlungOffset = 0; render(); }
function toggleStammCat(cat){
  if(state.stammOpenCats.has(cat)) state.stammOpenCats.delete(cat);
  else state.stammOpenCats.add(cat);
  render();
}
function setStammSearch(v){
  state.stammSearch = v;
  render();
  const s = document.getElementById('stamm-search-input');
  if(s){ s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
}
function openEditPopup(id){ state.editingItem = id; state.editingImageData = undefined; render(); }
function closeEditPopup(){ state.editingItem = null; state.editingImageData = undefined; render(); }
function readHaendlerField(prefix){
  const sel = document.getElementById(`${prefix}-haendler-select`);
  if(!sel) return '';
  if(sel.value === '__neu__'){
    return document.getElementById(`${prefix}-haendler-neu`)?.value.trim() || '';
  }
  return sel.value;
}

function handleStammImageFile(file){
  if(!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 600;
      let w = img.width, h = img.height;
      if(w > maxDim || h > maxDim){
        const scale = maxDim / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      state.editingImageData = canvas.toDataURL('image/jpeg', 0.7);
      render();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function removeStammImage(){
  state.editingImageData = null;
  render();
}

async function saveStammItem(id){
  const ve = document.getElementById('pop-ve')?.value.trim() || '';
  const haendler = readHaendlerField('pop');
  const rhythmus = document.getElementById('pop-rhythmus')?.value || 'beide';
  const bestehend = state.artikeldaten[id] || {};
  const bild = state.editingImageData === undefined ? (bestehend.bild || null) : state.editingImageData;
  state.artikeldaten[id] = { ve, haendler, bild, rhythmus };
  await saveArtikeldaten();
  state.editingItem = null;
  state.editingImageData = undefined;
  render();
}

function askDeleteArtikel(id){
  state.confirmDeleteArtikelId = id;
  render();
}

function cancelDeleteArtikel(){
  state.confirmDeleteArtikelId = null;
  render();
}

async function confirmDeleteArtikel(id){
  const isCustom = state.customItems.some(ci => ci.id === id);
  if(isCustom){
    state.customItems = state.customItems.filter(ci => ci.id !== id);
    await saveCustomItems();
  } else {
    if(!state.deletedItems.includes(id)){
      state.deletedItems.push(id);
      await saveDeletedItems();
    }
  }
  state.confirmDeleteArtikelId = null;
  state.editingItem = null;
  render();
}

function openNewItemPopup(){
  state.newItem = { name:"", kategorie:"", bereich: state.gfTab === 'Produktion' ? 'Produktion' : 'Laden', unit:"Einheiten", ve:"", haendler:"", rhythmus:"beide" };
  state.newItemPopupOpen = true;
  render();
}

function closeNewItemPopup(){
  state.newItemPopupOpen = false;
  render();
}

function refreshNewItemSaveState(){
  const btn = document.getElementById('ni-save-btn');
  if(!btn) return;
  const ni = state.newItem;
  btn.disabled = !(ni.name.trim() && ni.kategorie && ni.bereich);
}

async function saveNewItem(){
  const ni = state.newItem;
  if(!ni.name.trim() || !ni.kategorie || !ni.bereich) return;
  const id = 'c' + Date.now().toString(36);
  const haendler = readHaendlerField('ni');
  const rhythmus = document.getElementById('ni-rhythmus')?.value || 'beide';
  state.customItems.push({
    id, name: ni.name.trim(), kategorie: ni.kategorie, bereich: ni.bereich,
    unit: ni.unit.trim() || 'Einheiten'
  });
  await saveCustomItems();
  state.artikeldaten[id] = { ve: ni.ve.trim(), haendler, rhythmus };
  await saveArtikeldaten();
  state.newItemPopupOpen = false;
  render();
}

function openNewHaendlerPopup(){
  state.haendlerPopup = { mode:'new', originalName:'', value:'' };
  render();
}

function openEditHaendlerPopup(name){
  state.haendlerPopup = { mode:'edit', originalName:name, value:name };
  render();
}

function closeHaendlerPopup(){
  state.haendlerPopup = null;
  render();
}

function refreshHaendlerPopupSaveState(){
  const btn = document.getElementById('hp-save-btn');
  const input = document.getElementById('hp-name');
  if(!btn || !input) return;
  btn.disabled = !input.value.trim();
}

async function saveHaendlerPopup(){
  const input = document.getElementById('hp-name');
  const newName = input?.value.trim();
  if(!newName || !state.haendlerPopup) return;
  const p = state.haendlerPopup;

  if(p.mode === 'new'){
    if(!state.haendlerListe.includes(newName)){
      state.haendlerListe.push(newName);
      await saveHaendlerListe();
    }
  } else {
    const oldName = p.originalName;
    if(newName !== oldName){
      state.haendlerListe = state.haendlerListe.filter(h=>h!==oldName);
      if(!state.haendlerListe.includes(newName)) state.haendlerListe.push(newName);
      await saveHaendlerListe();
      let changed = false;
      Object.keys(state.artikeldaten).forEach(id=>{
        if(state.artikeldaten[id].haendler === oldName){
          state.artikeldaten[id].haendler = newName;
          changed = true;
        }
      });
      if(changed) await saveArtikeldaten();
    }
  }
  state.haendlerPopup = null;
  render();
}

function askDeleteHaendler(name){
  state.confirmDeleteHaendlerName = name;
  render();
}

function cancelDeleteHaendler(){
  state.confirmDeleteHaendlerName = null;
  render();
}

async function confirmDeleteHaendler(name){
  state.haendlerListe = state.haendlerListe.filter(h=>h!==name);
  await saveHaendlerListe();
  let changed = false;
  Object.keys(state.artikeldaten).forEach(id=>{
    if(state.artikeldaten[id].haendler === name){
      state.artikeldaten[id].haendler = '';
      changed = true;
    }
  });
  if(changed) await saveArtikeldaten();
  state.confirmDeleteHaendlerName = null;
  render();
}

function toggleCat(cat){
  if(state.openCats.has(cat)) state.openCats.delete(cat);
  else state.openCats.add(cat);
  render();
}

function setSearch(v){
  state.search = v;
  render();
  const s = document.getElementById('search-input');
  if(s){ s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
}

function renderNeu(catalog){
  const q = state.search.trim().toLowerCase();
  const catColors = ['c-terracotta','c-teal','c-blue','c-purple','c-gold'];

  const passtRhythmus = (it) => {
    const r = state.artikeldaten[it.id]?.rhythmus;
    return !r || r === 'beide' || r === state.rhythmusFilter;
  };

  const bereich = state.role === 'produktion' ? 'Produktion' : 'Laden';
  const bereitsBestelltMap = {};
  getSammlung(state.rhythmusFilter, null, o => o.bereich === bereich).summen.forEach(s => {
    bereitsBestelltMap[s.id] = s.qty;
  });

  const catalogHtml = catalog.map((cat, catIndex) => {
    const base = q
      ? cat.items.filter(it => it.name.toLowerCase().includes(q))
      : cat.items;
    const matchedItems = base.filter(passtRhythmus);
    if(matchedItems.length === 0) return '';
    const isOpen = q ? true : state.openCats.has(cat.cat);
    const colorClass = catColors[catIndex % catColors.length];
    return `
      <div class="cat-block">
        <p class="cat-title ${colorClass}" data-action="togglecat" data-cat="${cat.cat.replace(/"/g,'&quot;')}">
          <span class="chevron ${isOpen?'open':''}">▸</span>${cat.cat}
          <span class="cat-count">(${matchedItems.length})</span>
        </p>
        ${isOpen ? matchedItems.map(it => {
          const sd = state.artikeldaten[it.id];
          const zeigeHaendler = state.role !== 'laden';
          const extraParts = sd ? [sd.ve, zeigeHaendler ? sd.haendler : null].filter(Boolean) : [];
          const extra = extraParts.length > 0 ? ` &nbsp;·&nbsp; ${extraParts.join(' · ')}` : '';
          const bereitsQty = bereitsBestelltMap[it.id];
          return `
          <div class="item-row ${bereitsQty ? 'item-row-warnung' : ''}">
            <div>
              ${bereitsQty ? `<div class="bereits-bestellt-banner">⚠️ Bereits ${bereitsQty}× ${it.unit} in diesem Zeitraum bestellt!</div>` : ''}
              <div class="item-name">${it.name}</div>
              <div class="item-unit">${it.unit}${extra}</div>
            </div>
            <div class="qty-ctrl">
              <button data-action="dec" data-id="${it.id}" aria-label="Menge verringern">–</button>
              <span class="qty-val">${state.cart[it.id]||0}</span>
              <button data-action="inc" data-id="${it.id}" aria-label="Menge erhöhen">+</button>
            </div>
          </div>
        `;}).join('') : ''}
      </div>
    `;
  }).join('');

  const noResults = catalogHtml.trim() === '';

  const cartItems = Object.entries(state.cart);
  const cartHtml = cartItems.length === 0
    ? `<p class="cart-empty">Noch keine Artikel ausgewählt.</p>`
    : cartItems.map(([id,qty])=>{
        const it = findItem(id);
        const ve = state.artikeldaten[id]?.ve;
        return `
          <div class="cart-line">
            <div class="cart-line-info">
              <span class="name">${it.name}</span>
              ${ve ? `<span class="cart-ve">VE: ${ve}</span>` : ''}
            </div>
            <div class="cart-line-controls">
              <button class="cart-qty-btn" data-action="dec" data-id="${id}" aria-label="Menge verringern">–</button>
              <span class="cart-qty-val">${qty}</span>
              <button class="cart-qty-btn" data-action="inc" data-id="${id}" aria-label="Menge erhöhen">+</button>
              <span class="cart-unit">${it.unit}</span>
              <button class="cart-remove-btn" data-action="removecartitem" data-id="${id}" aria-label="Artikel entfernen">✕</button>
            </div>
          </div>
        `;
      }).join('');

  const canSubmit = cartItems.length > 0;

  return `
    <div class="layout">
      <div>
        <div class="tabs">
          <button class="tab ${state.rhythmusFilter==='freitag'?'active':''}" data-action="rhythmusfilter" data-rhythmus="freitag">Freitagsbestellung</button>
          <button class="tab ${state.rhythmusFilter==='monat'?'active':''}" data-action="rhythmusfilter" data-rhythmus="monat">Monatsbestellung</button>
        </div>
        <input class="search-box" id="search-input" type="text" placeholder="Artikel suchen…" value="${state.search.replace(/"/g,'&quot;')}" />
        ${noResults ? `<p class="no-results">Keine Artikel in dieser Bestellung gefunden.</p>` : catalogHtml}
      </div>
      <div class="cart">
        <h2>Warenkorb (${cartCount()})</h2>
        ${cartHtml}
        <label class="field">Anmerkung</label>
        <textarea class="field" id="f-note" rows="2" placeholder="Optional">${state.note}</textarea>
        <label class="field">Fotos (optional)</label>
        <p class="image-hint">
          Du findest ein Produkt nicht, es handelt sich um einen Artikel außer der Reihe,
          oder du möchtest unterschiedliche Sorten bestellen (z. B. bei Kaffee)?
          Dann schreib deine Bestellung einfach auf ein Blatt Papier, fotografiere es
          ab und füge das Foto hier hinzu.
        </p>
        <div class="image-grid">
          ${state.pendingImages.map((img, i) => `
            <div class="image-preview">
              <img src="${img}" alt="Vorschau ${i+1}" />
              <button type="button" class="image-remove-btn" data-action="removeimage" data-index="${i}">✕</button>
            </div>
          `).join('')}
          ${state.pendingImages.length < MAX_IMAGES_PER_ORDER ? `
            <label class="image-upload-btn" for="f-image">📷<br>Foto<br>hinzufügen</label>
          ` : ''}
        </div>
        <input type="file" id="f-image" accept="image/*" multiple style="display:none;" />
        <button class="submit-btn" id="submit-btn" ${canSubmit? '' : 'disabled'}>Bestellung absenden</button>
        ${state.toast ? `<div class="toast">${state.toast}</div>` : ''}
      </div>
    </div>
  `;
}

function isProduktionsArtikel(itemId){
  return (state.artikeldaten[itemId]?.haendler || '').trim() === 'Produktion';
}

function renderHistorie(orders, itemFilterFn, groupMode){
  const filtered = orders.filter(o=>{
    if(state.filter!=='alle' && o.status !== state.filter) return false;
    return true;
  });
  if(filtered.length === 0){
    const msg = orders.length === 0
      ? 'Noch keine Bestellungen vorhanden.'
      : 'Keine Bestellungen in dieser Ansicht.';
    return `<div class="empty-state"><div class="big">–</div>${msg}</div>`;
  }
  return filtered.map(o => {
    const displayItems = itemFilterFn ? o.items.filter(itemFilterFn) : o.items;

    let itemsHtml;
    if(groupMode === 'haendler-kategorie'){
      const groups = {};
      displayItems.forEach(it=>{
        const d = state.artikeldaten[it.id] || {};
        const haendler = d.haendler || 'Ohne Händler zugeordnet';
        const kat = findItemKategorie(it.id) || 'Sonstiges';
        groups[haendler] = groups[haendler] || {};
        groups[haendler][kat] = groups[haendler][kat] || [];
        groups[haendler][kat].push({...it, ve: d.ve || '—'});
      });
      itemsHtml = Object.keys(groups).sort().map(haendler => `
        <div class="haendler-group">
          <p class="group-title">${haendler}</p>
          ${Object.keys(groups[haendler]).sort().map(kat => `
            <div class="kategorie-group">
              <p class="subgroup-title">${kat}</p>
              ${groups[haendler][kat].map(it=>`
                <div class="order-item-line">
                  <span>${it.name}</span>
                  <span class="qty">${it.qty}× ${it.unit} &nbsp;·&nbsp; VE: ${it.ve}</span>
                </div>
              `).join('')}
            </div>
          `).join('')}
        </div>
      `).join('');
    } else if(groupMode === 'kategorie'){
      const groups = {};
      displayItems.forEach(it=>{
        const d = state.artikeldaten[it.id] || {};
        const kat = findItemKategorie(it.id) || 'Sonstiges';
        groups[kat] = groups[kat] || [];
        groups[kat].push({...it, ve: d.ve || '—'});
      });
      itemsHtml = Object.keys(groups).sort().map(kat => `
        <div class="kategorie-group">
          <p class="group-title">${kat}</p>
          ${groups[kat].map(it=>`
            <div class="order-item-line">
              <span>${it.name}</span>
              <span class="qty">${it.qty}× ${it.unit} &nbsp;·&nbsp; VE: ${it.ve}</span>
            </div>
          `).join('')}
        </div>
      `).join('');
    } else {
      itemsHtml = displayItems.map(it=>{
        const ve = state.artikeldaten[it.id]?.ve;
        return `<div class="order-item-line"><span>${it.name}</span><span class="qty">${it.qty}× ${it.unit}${ve ? ` &nbsp;·&nbsp; VE: ${ve}` : ''}</span></div>`;
      }).join('');
    }

    return `
    <div class="order-card">
      <div class="order-head" data-action="expand" data-id="${o.id}">
        <div>
          ${o.name ? `<div class="who">${o.name}</div>` : ''}
          ${o.dept ? `<div class="dept">${o.dept}</div>` : ''}
          <span class="bereich-pill ${o.bereich==='Produktion' ? 'b-produktion' : 'b-laden'}">${o.bereich || 'Laden'}</span>
          ${o.ziel ? `<span class="bereich-pill b-ziel">Ziel: ${o.ziel}</span>` : ''}
          <span class="status-pill ${o.status==='offen'?'status-offen':'status-erledigt'}">${o.status==='offen'?'Offen':'Erledigt'}</span>
        </div>
        <div class="date">${fmtDate(o.date)}</div>
      </div>
      ${state.expanded === o.id ? `
        <div class="order-items">
          ${itemsHtml}
        </div>
        ${o.note ? `<div class="order-note">Anmerkung: ${o.note}</div>` : ''}
        ${(() => {
          const imgs = o.images || (o.image ? [o.image] : []);
          if(imgs.length === 0) return '';
          return `<div class="order-images">${imgs.map(src =>
            `<img class="order-image" src="${src}" data-action="openlightbox" data-src="${src}" alt="Bestellfoto" />`
          ).join('')}</div>`;
        })()}
        ${canChat() ? `
          <div class="chat-box">
            <p class="chat-title">💬 Nachrichten zu dieser Bestellung</p>
            <div class="chat-thread">
              ${(o.chat && o.chat.length > 0) ? o.chat.map(m => `
                <div class="chat-msg ${m.from === senderLabel() ? 'chat-msg-own' : ''}">
                  <div class="chat-msg-meta">${m.from} · ${fmtDate(m.date)}</div>
                  <div class="chat-msg-text">${m.text.replace(/</g,'&lt;')}</div>
                </div>
              `).join('') : `<p class="chat-empty">Noch keine Nachrichten.</p>`}
            </div>
            <div class="chat-input-row">
              <input class="field chat-input" id="chat-input-${o.id}" type="text" placeholder="Nachricht schreiben…" value="${state.expanded===o.id ? state.chatDraft.replace(/"/g,'&quot;') : ''}" />
              <button class="chat-send-btn" data-action="sendchat" data-id="${o.id}">Senden</button>
            </div>
          </div>
        ` : ''}
        ${state.confirmDeleteId === o.id ? `
          <div class="confirm-delete">
            <span>Diese Bestellung wirklich unwiderruflich löschen?</span>
            <div class="order-actions">
              <button class="danger" data-action="confirmdelete" data-id="${o.id}">Ja, löschen</button>
              <button class="popup-cancel" data-action="canceldelete">Abbrechen</button>
            </div>
          </div>
        ` : (state.role === 'laden' || state.role === 'produktion') ? `
        <div class="order-actions">
          <button class="btn-pdf" data-action="editorder" data-id="${o.id}">✏️ Bearbeiten</button>
          <button class="danger-outline" data-action="askdelete" data-id="${o.id}">🗑 Löschen</button>
        </div>
        ` : `
        <div class="order-actions">
          <button class="${o.status==='offen' ? 'btn-complete' : 'btn-reopen'}" data-action="toggle" data-id="${o.id}">${o.status==='offen' ? '✓ Als erledigt markieren' : '↺ Als offen markieren'}</button>
          <button class="btn-pdf" data-action="editorder" data-id="${o.id}">✏️ Bearbeiten</button>
          <button class="btn-pdf" data-action="downloadpdf" data-id="${o.id}" data-produktiononly="${state.role==='backend_produktion' ? '1' : '0'}">📄 Als PDF</button>
          <button class="danger-outline" data-action="askdelete" data-id="${o.id}">🗑 Löschen</button>
        </div>
        `}
      ` : ''}
    </div>
  `;}).join('');
}

function getEasterSunday(year){
  const a = year % 19;
  const b = Math.floor(year/100);
  const c = year % 100;
  const d = Math.floor(b/4);
  const e = b % 4;
  const f = Math.floor((b+8)/25);
  const g = Math.floor((b-f+1)/3);
  const h = (19*a+b-d-g+15)%30;
  const i = Math.floor(c/4);
  const k = c%4;
  const l = (32+2*e+2*i-h-k)%7;
  const m = Math.floor((a+11*h+22*l)/451);
  const month = Math.floor((h+l-7*m+114)/31);
  const day = ((h+l-7*m+114)%31)+1;
  return new Date(year, month-1, day);
}

function addDays(date, days){
  const d = new Date(date);
  d.setDate(d.getDate()+days);
  return d;
}

function isSameDate(a,b){
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}

function getSpecialDayGreeting(){
  const now = new Date();
  const easter = getEasterSunday(now.getFullYear());

  const movable = [
    {date: addDays(easter, -2), text: "Einen besinnlichen Karfreitag! 🙏"},
    {date: easter, text: "Frohe Ostern! 🐣"},
    {date: addDays(easter, 1), text: "Frohe Ostern! 🐣"},
    {date: addDays(easter, 39), text: "Schönen Feiertag – Christi Himmelfahrt! 🎉"},
    {date: addDays(easter, 49), text: "Frohe Pfingsten! 🕊️"},
    {date: addDays(easter, 50), text: "Frohe Pfingsten! 🕊️"},
  ];
  for(const m of movable){
    if(isSameDate(now, m.date)) return m.text;
  }

  const md = `${now.getMonth()+1}-${now.getDate()}`;
  const fixed = {
    "1-1": "Frohes neues Jahr! 🎉",
    "2-14": "Schönen Valentinstag! 💐",
    "5-1": "Schönen Tag der Arbeit! 🌸",
    "10-3": "Schönen Tag der Deutschen Einheit! 🇩🇪",
    "12-24": "Frohe Weihnachten! 🎄",
    "12-25": "Frohe Weihnachten! 🎄",
    "12-26": "Frohe Weihnachten! 🎄",
    "12-31": "Guten Rutsch ins neue Jahr! 🎆",
  };
  return fixed[md] || null;
}

function getTimeGreeting(){
  const h = new Date().getHours();
  if(h >= 5 && h < 10) return "Guten Morgen";
  if(h >= 10 && h < 12) return "Guten Vormittag";
  if(h >= 12 && h < 14) return "Guten Mittag";
  if(h >= 14 && h < 18) return "Guten Nachmittag";
  if(h >= 18 && h < 23) return "Guten Abend";
  return "Gute Nacht";
}

function getGreeting(){
  const time = getTimeGreeting();
  const special = getSpecialDayGreeting();
  return special ? `${time}! ${special}` : `${time}!`;
}

function renderRoleScreen(){
  return `
    <div class="role-screen">
      <div class="logo-row">
        <div class="logo-icon"><img src="${LOGO_BASE64}" alt="Gebrüder Pesch Feinkost GmbH" /></div>
        <h1 class="logo-greeting">${getGreeting()}</h1>
      </div>
      <div class="role-cards">
        <div class="role-card c-terracotta" data-action="role" data-role="laden">
          <div class="icon">🛒</div>
          <h3>Bestellungen für den Laden</h3>
          <p>Sortiment für den Laden: Essige, Öle, Gewürze, Wein & Sekt und mehr.</p>
        </div>
        <div class="role-card c-teal" data-action="role" data-role="produktion">
          <div class="icon">🏭</div>
          <h3>Bestellungen für die Produktion</h3>
          <p>Gläser, Flaschen, Verpackung und Lagerware für die Produktion.</p>
        </div>
        <div class="role-card c-blue" data-action="role" data-role="backend_produktion">
          <div class="icon">📋</div>
          <h3>Backend Produktion</h3>
          <p>Eingehende Bestellungen der Produktion einsehen und bearbeiten.</p>
        </div>
        <div class="role-card c-purple" data-action="role" data-role="backend_geschaeftsfuehrung">
          <div class="icon">🗂️</div>
          <h3>Backend Geschäftsführung</h3>
          <p>Gesamtüberblick über alle Bestellungen aus Laden und Produktion.</p>
        </div>
      </div>
    </div>
  `;
}

function renderBestellSeite(){
  const isProduktion = state.role === 'produktion';
  const bereich = isProduktion ? 'Produktion' : 'Laden';
  const catalog = getCombinedCatalog(bereich);
  const tabState = isProduktion ? state.produktionTab : state.ladenTab;
  const tabAction = isProduktion ? 'produktiontab' : 'ladentab';
  const tabAttr = isProduktion ? 'produktiontab' : 'ladentab';

  const titel = tabState === 'neu' ? 'Neue Bestellung' : (tabState === 'monat' ? 'Monats-Sammlung' : 'Freitags-Sammlung');
  const inhalt = tabState === 'neu'
    ? renderNeu(catalog)
    : renderSammlung(tabState === 'monat' ? 'monat' : 'freitag', null, false, o => o.bereich === bereich, bereich);

  return `
    <div class="masthead">
      <div>
        <p class="eyebrow">${bereich}</p
        ><h1>${titel}</h1>
      </div>
      <div class="meta"><button class="switch-role" data-action="role" data-role="">🏠 Zum Home-Bildschirm</button></div>
    </div>
    <div class="tabs">
      <button class="tab ${tabState==='neu'?'active':''}" data-action="${tabAction}" data-${tabAttr}="neu">Neue Bestellung</button>
      <button class="tab ${tabState==='freitag'?'active':''}" data-action="${tabAction}" data-${tabAttr}="freitag">📦 Freitags-Sammlung</button>
      <button class="tab ${tabState==='monat'?'active':''}" data-action="${tabAction}" data-${tabAttr}="monat">📅 Monats-Sammlung</button>
    </div>
    ${inhalt}
  `;
}

function renderEmpfangSeite(){
  const isProdBackend = state.role === 'backend_produktion';

  if(isProdBackend){
    const prodTabsHtml = `
      <div class="tabs">
        <button class="tab ${state.prodBackendTab==='freitag'?'active':''}" data-action="prodbackendtab" data-prodbackendtab="freitag">📦 Freitags-Sammlung</button>
        <button class="tab ${state.prodBackendTab==='monat'?'active':''}" data-action="prodbackendtab" data-prodbackendtab="monat">📅 Monats-Sammlung</button>
      </div>
    `;

    const rhythmus = state.prodBackendTab === 'monat' ? 'monat' : 'freitag';
    return `
      <div class="masthead">
        <div>
          <p class="eyebrow">Backend Produktion</p>
          <h1>${rhythmus === 'monat' ? 'Monats-Sammlung' : 'Freitags-Sammlung'}</h1>
        </div>
        <div class="meta"><button class="switch-role" data-action="role" data-role="">🏠 Zum Home-Bildschirm</button></div>
      </div>
      ${prodTabsHtml}
      ${renderSammlung(rhythmus, it => isProduktionsArtikel(it.id), true)}
    `;
  }

  // Backend Geschäftsführung: Sammlungen + Artikelstammdaten (VE/Händler)
  const tabsHtml = `
    <div class="tabs">
      <button class="tab ${state.gfTab==='freitagssammlung'?'active':''}" data-action="gftab" data-gftab="freitagssammlung">📦 Freitags-Sammlung</button>
      <button class="tab ${state.gfTab==='monatssammlung'?'active':''}" data-action="gftab" data-gftab="monatssammlung">📅 Monats-Sammlung</button>
      <button class="tab ${state.gfTab==='artikel'?'active':''}" data-action="gftab" data-gftab="artikel">Artikelstammdaten (VE/Händler)</button>
      <button class="tab ${state.gfTab==='haendler'?'active':''}" data-action="gftab" data-gftab="haendler">Händler verwalten</button>
      <button class="tab ${state.gfTab==='email'?'active':''}" data-action="gftab" data-gftab="email">E-Mail-Empfänger</button>
    </div>
  `;

  if(state.gfTab === 'monatssammlung'){
    return `
      <div class="masthead">
        <div>
          <p class="eyebrow">Backend Geschäftsführung</p>
          <h1>Monats-Sammlung</h1>
        </div>
        <div class="meta"><button class="switch-role" data-action="role" data-role="">🏠 Zum Home-Bildschirm</button></div>
      </div>
      ${tabsHtml}
      ${renderSammlung('monat', null, false)}
    `;
  }

  if(state.gfTab === 'email'){
    return `
      <div class="masthead">
        <div>
          <p class="eyebrow">Backend Geschäftsführung</p>
          <h1>E-Mail-Empfänger</h1>
        </div>
        <div class="meta"><button class="switch-role" data-action="role" data-role="">🏠 Zum Home-Bildschirm</button></div>
      </div>
      ${tabsHtml}
      ${renderEmailEinstellungen()}
    `;
  }

  if(state.gfTab === 'haendler'){
    return `
      <div class="masthead">
        <div>
          <p class="eyebrow">Backend Geschäftsführung</p>
          <h1>Händler verwalten</h1>
        </div>
        <div class="meta"><button class="switch-role" data-action="role" data-role="">🏠 Zum Home-Bildschirm</button></div>
      </div>
      ${tabsHtml}
      ${renderHaendlerVerwaltung()}
      ${state.haendlerPopup ? renderHaendlerPopup() : ''}
    `;
  }

  if(state.gfTab === 'artikel'){
    return `
      <div class="masthead">
        <div>
          <p class="eyebrow">Backend Geschäftsführung</p>
          <h1>Artikelstammdaten</h1>
        </div>
        <div class="meta"><button class="switch-role" data-action="role" data-role="">🏠 Zum Home-Bildschirm</button></div>
      </div>
      ${tabsHtml}
      ${renderArtikelstammdaten()}
      ${state.editingItem ? renderEditPopup() : ''}
      ${state.newItemPopupOpen ? renderNewItemPopup() : ''}
    `;
  }

  return `
    <div class="masthead">
      <div>
        <p class="eyebrow">Backend Geschäftsführung</p>
        <h1>Freitags-Sammlung</h1>
      </div>
      <div class="meta"><button class="switch-role" data-action="role" data-role="">🏠 Zum Home-Bildschirm</button></div>
    </div>
    ${tabsHtml}
    ${renderSammlung('freitag', null, false)}
  `;
}

function renderArtikelstammdaten(){
  const q = state.stammSearch.trim().toLowerCase();
  const allCats = [...getCombinedCatalog('Laden'), ...getCombinedCatalog('Produktion')];
  const catColors = ['c-terracotta','c-teal','c-blue','c-purple','c-gold'];

  const html = allCats.map((cat, catIndex) => {
    const matched = q ? cat.items.filter(it=>it.name.toLowerCase().includes(q)) : cat.items;
    if(matched.length === 0) return '';
    const isOpen = q ? true : state.stammOpenCats.has(cat.cat);
    const colorClass = catColors[catIndex % catColors.length];
    return `
      <div class="cat-block">
        <p class="cat-title ${colorClass}" data-action="togglestammcat" data-cat="${cat.cat.replace(/"/g,'&quot;')}">
          <span class="chevron ${isOpen?'open':''}">▸</span>${cat.cat}
          <span class="cat-count">(${matched.length})</span>
        </p>
        ${isOpen ? matched.map(it=>{
          const d = state.artikeldaten[it.id] || {};
          return `
          <div class="item-row">
            <div class="item-row-with-thumb">
              ${d.bild ? `<img class="item-thumb" src="${d.bild}" alt="${it.name}" />` : ''}
              <div>
                <div class="item-name">${it.name}</div>
                <div class="item-unit">VE: ${d.ve || '—'} &nbsp;·&nbsp; Händler: ${d.haendler || '—'}</div>
              </div>
            </div>
            <button class="edit-btn" data-action="editstamm" data-id="${it.id}">Bearbeiten</button>
          </div>
        `;}).join('') : ''}
      </div>
    `;
  }).join('');

  const noResults = html.trim() === '';

  return `
    <div class="stamm-toolbar">
      <input class="search-box" id="stamm-search-input" type="text" placeholder="Artikel suchen…" value="${state.stammSearch.replace(/"/g,'&quot;')}" />
      <button class="new-item-btn" data-action="newitem">+ Neuer Artikel</button>
    </div>
    ${noResults ? `<p class="no-results">Keine Artikel gefunden.</p>` : html}
  `;
}

function renderSammlung(rhythmus, itemFilterFn, produktionOnly, orderFilterFn, bereichFuerPdf){
  const offset = state.sammlungOffset;
  const { start, ende, orders, summen } = getSammlung(rhythmus, itemFilterFn, orderFilterFn, offset);
  const zeitraum = `${fmtDatumKurz(start)} – ${fmtDatumKurz(ende)}`;
  const istAbgeschlossen = new Date() > ende;
  const pdfAttr = `${produktionOnly ? ' data-produktiononly="1"' : ''} data-rhythmus="${rhythmus}" data-offset="${offset}"${bereichFuerPdf ? ` data-bereich="${bereichFuerPdf}"` : ''}`;
  const zeitraumLabel = rhythmus === 'monat' ? '1. bis letzter Tag des Monats' : 'Samstag 00:01 bis Freitag 23:59';
  const bezeichnung = rhythmus === 'monat' ? 'Monatsbestellungen' : 'Freitagsbestellungen';

  const navHtml = `
    <div class="sammel-nav">
      <button class="sammel-nav-btn" data-action="sammlungnav" data-dir="-1">← ${rhythmus === 'monat' ? 'Vorheriger Monat' : 'Vorherige Woche'}</button>
      <span class="sammel-nav-label">${offset === 0 ? (rhythmus === 'monat' ? 'Aktueller Monat' : 'Aktuelle Woche') : zeitraum}</span>
      <button class="sammel-nav-btn" data-action="sammlungnav" data-dir="1" ${offset >= 0 ? 'disabled' : ''}>${rhythmus === 'monat' ? 'Nächster Monat' : 'Nächste Woche'} →</button>
      ${offset !== 0 ? `<button class="sammel-nav-today" data-action="sammlungheute">Heute</button>` : ''}
    </div>
  `;

  if(summen.length === 0){
    return `
      ${navHtml}
      <p class="haendler-intro">Zeitraum: ${zeitraum} (${zeitraumLabel}) ${istAbgeschlossen ? '· abgeschlossen' : '· läuft noch'}</p>
      <div class="empty-state"><div class="big">–</div>Noch keine ${bezeichnung} in diesem Zeitraum.</div>
    `;
  }

  const groups = {};
  summen.forEach(s => {
    const d = state.artikeldaten[s.id] || {};
    const haendler = d.haendler || 'Ohne Händler zugeordnet';
    const kat = findItemKategorie(s.id) || 'Sonstiges';
    groups[haendler] = groups[haendler] || {};
    groups[haendler][kat] = groups[haendler][kat] || [];
    groups[haendler][kat].push({...s, ve: d.ve || '—'});
  });

  const haendlerNamen = Object.keys(groups).sort();
  const gesamtArtikel = summen.length;

  const groupsHtml = haendlerNamen.map(haendler => {
    const artikelAnzahl = Object.values(groups[haendler]).reduce((sum, arr) => sum + arr.length, 0);
    return `
    <div class="sammel-card">
      <div class="sammel-card-head">
        <p class="group-title">${haendler}</p>
        <span class="sammel-count">${artikelAnzahl} Artikel</span>
      </div>
      ${Object.keys(groups[haendler]).sort().map(kat => `
        <div class="kategorie-group">
          <p class="subgroup-title">${kat}</p>
          ${groups[haendler][kat].sort((a,b)=>a.name.localeCompare(b.name,'de')).map(s => `
            <div class="sammel-item-line">
              <span class="sammel-item-name">${s.name}</span>
              <span class="sammel-item-meta">VE: ${s.ve}</span>
              <span class="sammel-qty-chip">${s.qty}× ${s.unit}</span>
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>
  `;}).join('');

  const zeigeEinzelbestellungen = state.role === 'laden' || state.role === 'backend_produktion';
  const offeneIds = orders.filter(o=>o.status==='offen').map(o=>o.id).join(',');
  const zeigeAlleErledigtBtn = state.role === 'backend_produktion' && offeneIds.length > 0;
  const einzelbestellungenHtml = zeigeEinzelbestellungen ? `
    <div class="sammel-einzel-trenner">
      <p class="haendler-intro" style="margin-bottom:14px;">
        💬 Einzelne Bestellungen in diesem Zeitraum – hier könnt ihr den Status setzen und zu einer bestimmten Bestellung chatten.
      </p>
      ${zeigeAlleErledigtBtn ? `<div class="order-actions" style="margin-bottom:14px;"><button class="btn-complete" data-action="markallerledigt" data-ids="${offeneIds}">✓ Alle offenen Bestellungen dieser Sammlung als erledigt markieren</button></div>` : ''}
      <div class="tabs">
        <button class="tab ${state.filter==='offen'?'active':''}" data-action="filter" data-filter="offen">Offen</button>
        <button class="tab ${state.filter==='erledigt'?'active':''}" data-action="filter" data-filter="erledigt">Erledigt</button>
        <button class="tab ${state.filter==='alle'?'active':''}" data-action="filter" data-filter="alle">Alle</button>
      </div>
      ${renderHistorie(orders, itemFilterFn, 'kategorie')}
    </div>
  ` : '';

  return `
    ${navHtml}
    <div class="sammel-stats">
      <div class="sammel-stat"><span class="sammel-stat-num">${orders.length}</span><span class="sammel-stat-label">Bestellung(en)</span></div>
      <div class="sammel-stat"><span class="sammel-stat-num">${gesamtArtikel}</span><span class="sammel-stat-label">Artikel-Positionen</span></div>
      <div class="sammel-stat"><span class="sammel-stat-num">${haendlerNamen.length}</span><span class="sammel-stat-label">Händler</span></div>
    </div>
    <p class="haendler-intro">
      Zeitraum: <strong>${zeitraum}</strong> (${zeitraumLabel}) ${istAbgeschlossen ? '· <strong>abgeschlossen</strong>' : '· läuft noch, es können bis Ende des Zeitraums weitere Bestellungen dazukommen'}
    </p>
    <button class="new-item-btn" data-action="downloadsammlungpdf"${pdfAttr} style="margin-bottom:18px;">📄 Sammlung als PDF</button>
    ${groupsHtml}
    ${einzelbestellungenHtml}
  `;
}

function renderEmailEinstellungen(){
  const liste = state.notifyEmails;
  const bereichLabel = { alle: 'Alle Bestellungen', Laden: 'Nur Laden', Produktion: 'Nur Produktion' };
  const rows = liste.length === 0
    ? `<p class="no-results">Noch keine Empfänger hinterlegt. Es wird der im Code hinterlegte Standard-Empfänger genutzt (falls konfiguriert).</p>`
    : liste.map(e => `
      <div class="item-row">
        <div>
          <div class="item-name">${e.email}</div>
          <div class="item-unit">Erhält Mails für: ${bereichLabel[e.bereich] || 'Alle Bestellungen'}</div>
        </div>
        <div class="haendler-row-actions">
          <select class="field" style="width:auto;" data-action="changeemailbereich" data-email="${e.email.replace(/"/g,'&quot;')}">
            <option value="alle" ${e.bereich==='alle'?'selected':''}>Alle Bestellungen</option>
            <option value="Laden" ${e.bereich==='Laden'?'selected':''}>Nur Laden</option>
            <option value="Produktion" ${e.bereich==='Produktion'?'selected':''}>Nur Produktion</option>
          </select>
          <button class="danger-outline edit-btn" data-action="removeemail" data-email="${e.email.replace(/"/g,'&quot;')}">Entfernen</button>
        </div>
      </div>
    `).join('');

  return `
    <p class="haendler-intro">Hier legst du fest, an welche E-Mail-Adresse(n) die Benachrichtigung bei einer neuen Bestellung geschickt wird – und ob jemand alle Bestellungen oder nur die aus dem Laden bzw. der Produktion bekommen soll.</p>
    <div class="stamm-toolbar">
      <input class="field" id="new-email-input" type="email" placeholder="name@firma.de" value="${state.newEmailInput.replace(/"/g,'&quot;')}" style="flex:1;" />
      <select class="field" id="new-email-bereich" style="width:auto;">
        <option value="alle" ${state.newEmailBereich==='alle'?'selected':''}>Alle Bestellungen</option>
        <option value="Laden" ${state.newEmailBereich==='Laden'?'selected':''}>Nur Laden</option>
        <option value="Produktion" ${state.newEmailBereich==='Produktion'?'selected':''}>Nur Produktion</option>
      </select>
      <button class="new-item-btn" data-action="addemail">+ Hinzufügen</button>
    </div>
    <div class="cat-block" style="margin-top:18px;">${rows}</div>
  `;
}

function renderHaendlerVerwaltung(){
  const liste = getAllHaendler();
  const counts = {};
  Object.values(state.artikeldaten).forEach(d=>{
    if(d.haendler && d.haendler.trim()) counts[d.haendler.trim()] = (counts[d.haendler.trim()]||0) + 1;
  });

  const rows = liste.length === 0
    ? `<p class="no-results">Noch keine Händler angelegt.</p>`
    : liste.map(h => `
      <div class="item-row">
        <div>
          <div class="item-name">${h}</div>
          <div class="item-unit">${counts[h] || 0} Artikel zugeordnet</div>
        </div>
        <div class="haendler-row-actions">
          <button class="edit-btn" data-action="edithaendler" data-name="${h.replace(/"/g,'&quot;')}">Bearbeiten</button>
          <button class="danger-outline edit-btn" data-action="askdeletehaendler" data-name="${h.replace(/"/g,'&quot;')}">Löschen</button>
        </div>
      </div>
    `).join('');

  return `
    <div class="stamm-toolbar">
      <p class="haendler-intro">Hier legst du Händler an, benennst sie um oder entfernst sie. Änderungen wirken sich auf alle zugeordneten Artikel aus.</p>
      <button class="new-item-btn" data-action="newhaendler">+ Neuer Händler</button>
    </div>
    ${state.confirmDeleteHaendlerName ? `
      <div class="confirm-delete">
        <span>Händler "${state.confirmDeleteHaendlerName}" wirklich löschen? Bei ${counts[state.confirmDeleteHaendlerName]||0} Artikel(n) wird die Händler-Zuordnung entfernt.</span>
        <div class="order-actions">
          <button class="danger" data-action="confirmdeletehaendler" data-name="${state.confirmDeleteHaendlerName.replace(/"/g,'&quot;')}">Ja, löschen</button>
          <button class="popup-cancel" data-action="canceldeletehaendler">Abbrechen</button>
        </div>
      </div>
    ` : ''}
    <div class="cat-block">${rows}</div>
  `;
}

function renderHaendlerPopup(){
  const p = state.haendlerPopup;
  const isNew = p.mode === 'new';
  return `
    <div class="popup-overlay" data-action="closehaendlerpopup">
      <div class="popup-box" onclick="event.stopPropagation()">
        <h3>${isNew ? 'Neuen Händler anlegen' : 'Händler umbenennen'}</h3>
        <label class="field">Name *</label>
        <input class="field" id="hp-name" type="text" placeholder="z. B. Musterlieferant GmbH" value="${p.value.replace(/"/g,'&quot;')}" />
        <div class="popup-actions">
          <button class="popup-cancel" data-action="closehaendlerpopup">Abbrechen</button>
          <button class="submit-btn" id="hp-save-btn" data-action="savehaendlerpopup">${isNew ? 'Anlegen' : 'Speichern'}</button>
        </div>
      </div>
    </div>
  `;
}

function renderEditPopup(){
  const it = findItem(state.editingItem);
  if(!it) return '';
  const d = state.artikeldaten[it.id] || {};
  const aktuellesBild = state.editingImageData === undefined ? (d.bild || null) : state.editingImageData;

  if(state.confirmDeleteArtikelId === it.id){
    return `
      <div class="popup-overlay" data-action="closepopup">
        <div class="popup-box" onclick="event.stopPropagation()">
          <h3>Artikel löschen</h3>
          <p class="code-sub">"${it.name}" wirklich unwiderruflich aus dem Sortiment entfernen? Der Artikel taucht danach in keinem Bestellformular mehr auf.</p>
          <div class="popup-actions">
            <button class="popup-cancel" data-action="canceldeleteartikel">Abbrechen</button>
            <button class="danger" data-action="confirmdeleteartikel" data-id="${it.id}">Ja, löschen</button>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="popup-overlay" data-action="closepopup">
      <div class="popup-box" onclick="event.stopPropagation()">
        <h3>${it.name}</h3>
        <label class="field">VE (Verpackungseinheit)</label>
        <input class="field" id="pop-ve" type="text" placeholder="z. B. Karton à 6 Flaschen" value="${(d.ve||'').replace(/"/g,'&quot;')}" />
        <label class="field">Händler</label>
        ${renderHaendlerField('pop', d.haendler || '')}
        <label class="field">Bestellrhythmus</label>
        <select class="field" id="pop-rhythmus">
          <option value="beide" ${(!d.rhythmus || d.rhythmus==='beide')?'selected':''}>Freitags- & Monatsbestellung</option>
          <option value="freitag" ${d.rhythmus==='freitag'?'selected':''}>Nur Freitagsbestellung</option>
          <option value="monat" ${d.rhythmus==='monat'?'selected':''}>Nur Monatsbestellung</option>
        </select>
        <label class="field">Foto (optional)</label>
        ${aktuellesBild ? `
          <div class="image-preview" style="aspect-ratio:auto;max-width:160px;">
            <img src="${aktuellesBild}" alt="Artikelfoto" style="height:120px;object-fit:cover;" />
            <button type="button" class="image-remove-btn" data-action="removestammimage">✕</button>
          </div>
        ` : `
          <label class="image-upload-btn" for="pop-image" style="aspect-ratio:auto;padding:14px;">📷 Foto hinzufügen</label>
        `}
        <input type="file" id="pop-image" accept="image/*" style="display:none;" />
        <div class="popup-actions">
          <button class="popup-cancel" data-action="closepopup">Abbrechen</button>
          <button class="submit-btn" data-action="savestamm" data-id="${it.id}">Speichern</button>
        </div>
        <button class="danger-outline edit-btn" data-action="askdeleteartikel" data-id="${it.id}" style="width:100%;margin-top:10px;">🗑 Artikel löschen</button>
      </div>
    </div>
  `;
}

function renderNewItemPopup(){
  const ni = state.newItem;
  const kategorien = getAllKategorien();
  const canSave = ni.name.trim() && ni.kategorie && ni.bereich;
  return `
    <div class="popup-overlay" data-action="closenewitem">
      <div class="popup-box" onclick="event.stopPropagation()">
        <h3>Neuen Artikel anlegen</h3>
        <label class="field">Artikelname *</label>
        <input class="field" id="ni-name" type="text" placeholder="z. B. Rosmarin Olivenöl 250ml" value="${ni.name.replace(/"/g,'&quot;')}" />
        <label class="field">Kategorie *</label>
        <select class="field" id="ni-kategorie">
          <option value="">Bitte wählen…</option>
          ${kategorien.map(k=>`<option value="${k.replace(/"/g,'&quot;')}" ${ni.kategorie===k?'selected':''}>${k}</option>`).join('')}
        </select>
        <label class="field">Bereich *</label>
        <select class="field" id="ni-bereich">
          <option value="Laden" ${ni.bereich==='Laden'?'selected':''}>Laden</option>
          <option value="Produktion" ${ni.bereich==='Produktion'?'selected':''}>Produktion</option>
        </select>
        <label class="field">Einheit</label>
        <input class="field" id="ni-unit" type="text" placeholder="z. B. Einheiten, Liter, kg" value="${ni.unit.replace(/"/g,'&quot;')}" />
        <label class="field">VE (Verpackungseinheit)</label>
        <input class="field" id="ni-ve" type="text" placeholder="z. B. Karton à 6 Flaschen" value="${ni.ve.replace(/"/g,'&quot;')}" />
        <label class="field">Händler</label>
        ${renderHaendlerField('ni', ni.haendler)}
        <label class="field">Bestellrhythmus</label>
        <select class="field" id="ni-rhythmus">
          <option value="beide" ${(!ni.rhythmus || ni.rhythmus==='beide')?'selected':''}>Freitags- & Monatsbestellung</option>
          <option value="freitag" ${ni.rhythmus==='freitag'?'selected':''}>Nur Freitagsbestellung</option>
          <option value="monat" ${ni.rhythmus==='monat'?'selected':''}>Nur Monatsbestellung</option>
        </select>
        <div class="popup-actions">
          <button class="popup-cancel" data-action="closenewitem">Abbrechen</button>
          <button class="submit-btn" id="ni-save-btn" data-action="savenewitem" ${canSave?'':'disabled'}>Anlegen</button>
        </div>
      </div>
    </div>
  `;
}

function render(){
  const app = document.getElementById('app');

  if(state.loading){
    app.innerHTML = `<p class="load-note">Lade Bestellungen…</p>`;
    return;
  }

  if(!state.role){
    app.innerHTML = renderRoleScreen() + (state.pendingRole ? renderCodePopup() : '');
    attachHandlers();
    return;
  }

  const isBackend = state.role === 'backend_produktion' || state.role === 'backend_geschaeftsfuehrung';
  app.innerHTML = (isBackend ? renderEmpfangSeite() : renderBestellSeite())
    + (state.lightboxSrc ? renderLightbox() : '')
    + (state.editingOrderId ? renderOrderEditPopup() : '');
  attachHandlers();
}

function renderLightbox(){
  return `
    <div class="lightbox-overlay" data-action="closelightbox">
      <img src="${state.lightboxSrc}" alt="Bestellfoto groß" />
    </div>
  `;
}

function renderOrderEditPopup(){
  const draft = state.editingOrderDraft;
  if(!draft) return '';
  const canSave = draft.items.length > 0;
  const itemsHtml = draft.items.length === 0
    ? `<p class="cart-empty">Alle Artikel entfernt – zum Speichern bitte "Löschen" statt "Bearbeiten" nutzen.</p>`
    : draft.items.map(it => `
        <div class="cart-line">
          <span class="name">${it.name}</span>
          <div class="cart-line-controls">
            <button class="cart-qty-btn" data-action="editqtydec" data-id="${it.id}" aria-label="Menge verringern">–</button>
            <span class="cart-qty-val">${it.qty}</span>
            <button class="cart-qty-btn" data-action="editqtyinc" data-id="${it.id}" aria-label="Menge erhöhen">+</button>
            <span class="cart-unit">${it.unit}</span>
            <button class="cart-remove-btn" data-action="removeeditcartitem" data-id="${it.id}" aria-label="Artikel entfernen">✕</button>
          </div>
        </div>
      `).join('');

  return `
    <div class="popup-overlay" data-action="closeorderedit">
      <div class="popup-box" onclick="event.stopPropagation()">
        <h3>Bestellung bearbeiten</h3>
        <p class="code-sub">Mengen anpassen oder Artikel entfernen.</p>
        <div style="max-height:260px;overflow-y:auto;margin-bottom:8px;">${itemsHtml}</div>
        <label class="field">Anmerkung</label>
        <textarea class="field" id="edit-order-note" rows="2" placeholder="Optional">${draft.note}</textarea>
        <div class="popup-actions">
          <button class="popup-cancel" data-action="closeorderedit">Abbrechen</button>
          <button class="submit-btn" data-action="saveorderedit" ${canSave ? '' : 'disabled'}>Speichern</button>
        </div>
      </div>
    </div>
  `;
}

function attachHandlers(){
  document.querySelectorAll('[data-action="role"]').forEach(el=>{
    el.addEventListener('click', ()=>{
      const r = el.dataset.role || null;
      if(r) requestRoleAccess(r);
      else setRole(null);
    });
  });
  document.querySelectorAll('[data-action="submitcode"]').forEach(el=>{
    el.addEventListener('click', submitCode);
  });
  document.querySelectorAll('[data-action="cancelcode"]').forEach(el=>{
    el.addEventListener('click', cancelCode);
  });
  document.querySelectorAll('[data-action="codekey"]').forEach(el=>{
    el.addEventListener('click', ()=>pressCodeKey(el.dataset.key));
  });
  document.querySelectorAll('[data-action="codebackspace"]').forEach(el=>{
    el.addEventListener('click', backspaceCode);
  });
  document.querySelectorAll('[data-action="filter"]').forEach(el=>{
    el.addEventListener('click', ()=>setFilter(el.dataset.filter));
  });
  document.querySelectorAll('[data-action="ladentab"]').forEach(el=>{
    el.addEventListener('click', ()=>setLadenTab(el.dataset.ladentab));
  });
  document.querySelectorAll('[data-action="produktiontab"]').forEach(el=>{
    el.addEventListener('click', ()=>setProduktionTab(el.dataset.produktiontab));
  });
  document.querySelectorAll('[data-action="prodbackendtab"]').forEach(el=>{
    el.addEventListener('click', ()=>setProdBackendTab(el.dataset.prodbackendtab));
  });
  document.querySelectorAll('[data-action="rhythmusfilter"]').forEach(el=>{
    el.addEventListener('click', ()=>setRhythmusFilter(el.dataset.rhythmus));
  });
  document.querySelectorAll('[data-action="bereichfilter"]').forEach(el=>{
    el.addEventListener('click', ()=>setBereichFilter(el.dataset.bereich));
  });
  document.querySelectorAll('[data-action="gftab"]').forEach(el=>{
    el.addEventListener('click', ()=>setGfTab(el.dataset.gftab));
  });
  document.querySelectorAll('[data-action="togglestammcat"]').forEach(el=>{
    el.addEventListener('click', ()=>toggleStammCat(el.dataset.cat));
  });
  document.querySelectorAll('[data-action="editstamm"]').forEach(el=>{
    el.addEventListener('click', ()=>openEditPopup(el.dataset.id));
  });
  document.querySelectorAll('[data-action="closepopup"]').forEach(el=>{
    el.addEventListener('click', closeEditPopup);
  });
  document.querySelectorAll('[data-action="savestamm"]').forEach(el=>{
    el.addEventListener('click', ()=>saveStammItem(el.dataset.id));
  });
  const popImage = document.getElementById('pop-image');
  if(popImage) popImage.addEventListener('change', e=>{ handleStammImageFile(e.target.files[0]); });
  document.querySelectorAll('[data-action="removestammimage"]').forEach(el=>{
    el.addEventListener('click', removeStammImage);
  });
  document.querySelectorAll('[data-action="askdeleteartikel"]').forEach(el=>{
    el.addEventListener('click', ()=>askDeleteArtikel(el.dataset.id));
  });
  document.querySelectorAll('[data-action="canceldeleteartikel"]').forEach(el=>{
    el.addEventListener('click', cancelDeleteArtikel);
  });
  document.querySelectorAll('[data-action="confirmdeleteartikel"]').forEach(el=>{
    el.addEventListener('click', ()=>confirmDeleteArtikel(el.dataset.id));
  });
  document.querySelectorAll('[data-action="newitem"]').forEach(el=>{
    el.addEventListener('click', openNewItemPopup);
  });
  document.querySelectorAll('[data-action="closenewitem"]').forEach(el=>{
    el.addEventListener('click', closeNewItemPopup);
  });
  document.querySelectorAll('[data-action="savenewitem"]').forEach(el=>{
    el.addEventListener('click', saveNewItem);
  });
  document.querySelectorAll('[data-action="newhaendler"]').forEach(el=>{
    el.addEventListener('click', openNewHaendlerPopup);
  });
  document.querySelectorAll('[data-action="edithaendler"]').forEach(el=>{
    el.addEventListener('click', ()=>openEditHaendlerPopup(el.dataset.name));
  });
  document.querySelectorAll('[data-action="closehaendlerpopup"]').forEach(el=>{
    el.addEventListener('click', closeHaendlerPopup);
  });
  document.querySelectorAll('[data-action="savehaendlerpopup"]').forEach(el=>{
    el.addEventListener('click', saveHaendlerPopup);
  });
  document.querySelectorAll('[data-action="askdeletehaendler"]').forEach(el=>{
    el.addEventListener('click', ()=>askDeleteHaendler(el.dataset.name));
  });
  document.querySelectorAll('[data-action="confirmdeletehaendler"]').forEach(el=>{
    el.addEventListener('click', ()=>confirmDeleteHaendler(el.dataset.name));
  });
  document.querySelectorAll('[data-action="canceldeletehaendler"]').forEach(el=>{
    el.addEventListener('click', cancelDeleteHaendler);
  });
  document.querySelectorAll('[data-action="addemail"]').forEach(el=>{
    el.addEventListener('click', addNotifyEmail);
  });
  document.querySelectorAll('[data-action="removeemail"]').forEach(el=>{
    el.addEventListener('click', ()=>removeNotifyEmail(el.dataset.email));
  });
  document.querySelectorAll('[data-action="changeemailbereich"]').forEach(el=>{
    el.addEventListener('change', ()=>changeNotifyEmailBereich(el.dataset.email, el.value));
  });
  const newEmailInput = document.getElementById('new-email-input');
  if(newEmailInput){
    newEmailInput.addEventListener('input', e=>{ state.newEmailInput = e.target.value; });
    newEmailInput.addEventListener('keydown', e=>{ if(e.key === 'Enter') addNotifyEmail(); });
  }
  const newEmailBereich = document.getElementById('new-email-bereich');
  if(newEmailBereich) newEmailBereich.addEventListener('change', e=>{ state.newEmailBereich = e.target.value; });
  const hpName = document.getElementById('hp-name');
  if(hpName) hpName.addEventListener('input', refreshHaendlerPopupSaveState);
  const niName = document.getElementById('ni-name');
  if(niName) niName.addEventListener('input', e=>{ state.newItem.name = e.target.value; refreshNewItemSaveState(); });
  const niKategorie = document.getElementById('ni-kategorie');
  if(niKategorie) niKategorie.addEventListener('change', e=>{ state.newItem.kategorie = e.target.value; refreshNewItemSaveState(); });
  const niBereich = document.getElementById('ni-bereich');
  if(niBereich) niBereich.addEventListener('change', e=>{ state.newItem.bereich = e.target.value; refreshNewItemSaveState(); });
  const niUnit = document.getElementById('ni-unit');
  if(niUnit) niUnit.addEventListener('input', e=>{ state.newItem.unit = e.target.value; });
  const niVe = document.getElementById('ni-ve');
  if(niVe) niVe.addEventListener('input', e=>{ state.newItem.ve = e.target.value; });
  document.querySelectorAll('select[id$="-haendler-select"]').forEach(el=>{
    el.addEventListener('change', ()=>{
      const prefix = el.id.replace('-haendler-select','');
      const neuInput = document.getElementById(`${prefix}-haendler-neu`);
      if(neuInput){
        neuInput.style.display = el.value === '__neu__' ? '' : 'none';
        if(el.value === '__neu__') neuInput.focus();
      }
    });
  });
  const stammSearchInput = document.getElementById('stamm-search-input');
  if(stammSearchInput) stammSearchInput.addEventListener('input', e=>setStammSearch(e.target.value));
  document.querySelectorAll('[data-action="togglecat"]').forEach(el=>{
    el.addEventListener('click', ()=>toggleCat(el.dataset.cat));
  });
  const searchInput = document.getElementById('search-input');
  if(searchInput) searchInput.addEventListener('input', e=>setSearch(e.target.value));
  document.querySelectorAll('[data-action="inc"]').forEach(el=>{
    el.addEventListener('click', ()=>changeQty(el.dataset.id, 1));
  });
  document.querySelectorAll('[data-action="dec"]').forEach(el=>{
    el.addEventListener('click', ()=>changeQty(el.dataset.id, -1));
  });
  document.querySelectorAll('[data-action="removecartitem"]').forEach(el=>{
    el.addEventListener('click', ()=>removeCartItem(el.dataset.id));
  });
  document.querySelectorAll('[data-action="expand"]').forEach(el=>{
    el.addEventListener('click', ()=>setExpanded(el.dataset.id));
  });
  document.querySelectorAll('[data-action="toggle"]').forEach(el=>{
    el.addEventListener('click', (e)=>{ e.stopPropagation(); toggleStatus(el.dataset.id); });
  });
  document.querySelectorAll('[data-action="markallerledigt"]').forEach(el=>{
    el.addEventListener('click', ()=>markAlleErledigt(el.dataset.ids));
  });
  document.querySelectorAll('[data-action="downloadpdf"]').forEach(el=>{
    el.addEventListener('click', (e)=>{ e.stopPropagation(); downloadOrderPdf(el.dataset.id, el.dataset.produktiononly === '1'); });
  });
  document.querySelectorAll('[data-action="editorder"]').forEach(el=>{
    el.addEventListener('click', (e)=>{ e.stopPropagation(); openOrderEditPopup(el.dataset.id); });
  });
  document.querySelectorAll('[data-action="closeorderedit"]').forEach(el=>{
    el.addEventListener('click', closeOrderEditPopup);
  });
  document.querySelectorAll('[data-action="editqtyinc"]').forEach(el=>{
    el.addEventListener('click', ()=>changeOrderEditQty(el.dataset.id, 1));
  });
  document.querySelectorAll('[data-action="editqtydec"]').forEach(el=>{
    el.addEventListener('click', ()=>changeOrderEditQty(el.dataset.id, -1));
  });
  document.querySelectorAll('[data-action="removeeditcartitem"]').forEach(el=>{
    el.addEventListener('click', ()=>removeOrderEditItem(el.dataset.id));
  });
  document.querySelectorAll('[data-action="saveorderedit"]').forEach(el=>{
    el.addEventListener('click', saveOrderEdit);
  });
  const editOrderNote = document.getElementById('edit-order-note');
  if(editOrderNote) editOrderNote.addEventListener('input', e=>{ if(state.editingOrderDraft) state.editingOrderDraft.note = e.target.value; });
  document.querySelectorAll('[data-action="downloadsammlungpdf"]').forEach(el=>{
    el.addEventListener('click', ()=>downloadSammlungPdf(el.dataset.rhythmus, el.dataset.produktiononly === '1', el.dataset.bereich || null, parseInt(el.dataset.offset || '0', 10)));
  });
  document.querySelectorAll('[data-action="sammlungnav"]').forEach(el=>{
    el.addEventListener('click', ()=>navigiereSammlung(parseInt(el.dataset.dir, 10)));
  });
  document.querySelectorAll('[data-action="sammlungheute"]').forEach(el=>{
    el.addEventListener('click', sammlungHeute);
  });
  document.querySelectorAll('.chat-input').forEach(el=>{
    el.addEventListener('click', e=>e.stopPropagation());
    el.addEventListener('input', e=>{ state.chatDraft = e.target.value; });
    el.addEventListener('keydown', e=>{ if(e.key === 'Enter'){ e.stopPropagation(); sendChatMessage(el.id.replace('chat-input-','')); } });
  });
  document.querySelectorAll('[data-action="sendchat"]').forEach(el=>{
    el.addEventListener('click', (e)=>{ e.stopPropagation(); sendChatMessage(el.dataset.id); });
  });
  document.querySelectorAll('[data-action="askdelete"]').forEach(el=>{
    el.addEventListener('click', (e)=>{ e.stopPropagation(); askDeleteOrder(el.dataset.id); });
  });
  document.querySelectorAll('[data-action="confirmdelete"]').forEach(el=>{
    el.addEventListener('click', (e)=>{ e.stopPropagation(); deleteOrder(el.dataset.id); });
  });
  document.querySelectorAll('[data-action="canceldelete"]').forEach(el=>{
    el.addEventListener('click', (e)=>{ e.stopPropagation(); cancelDeleteOrder(); });
  });
  const fnote = document.getElementById('f-note');
  if(fnote) fnote.addEventListener('input', e=>{ state.note = e.target.value; saveCartToLocal(); });
  const fimage = document.getElementById('f-image');
  if(fimage) fimage.addEventListener('change', e=>{ handleImageFiles(e.target.files); fimage.value = ''; });
  document.querySelectorAll('[data-action="removeimage"]').forEach(el=>{
    el.addEventListener('click', ()=>removeImage(parseInt(el.dataset.index, 10)));
  });
  document.querySelectorAll('[data-action="openlightbox"]').forEach(el=>{
    el.addEventListener('click', (e)=>{ e.stopPropagation(); state.lightboxSrc = el.dataset.src; render(); });
  });
  document.querySelectorAll('[data-action="closelightbox"]').forEach(el=>{
    el.addEventListener('click', ()=>{ state.lightboxSrc = null; render(); });
  });
  const submitBtn = document.getElementById('submit-btn');
  if(submitBtn) submitBtn.addEventListener('click', submitOrder);
}

function refreshSubmitState(){
  const btn = document.getElementById('submit-btn');
  if(!btn) return;
  const canSubmit = Object.keys(state.cart).length > 0;
  btn.disabled = !canSubmit;
}

render();
loadOrders();
