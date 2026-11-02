# Jurnal de modificări — Aurora

## 1.3.9 — 2026-11-02 (reîmprospătare kit)

- Nou (kit): **Sincronizare între dispozitive** (`FFF.sync`) — în dialogul «Transparență» (clic pe versiune → Copie de siguranță): conectezi două dispozitive direct (WebRTC, cod/QR, fără server și fără cont) și își schimbă datele aplicației; cea mai recentă valoare câștigă, secretele (chei API, parole) nu se trimit, ștergerile nu se propagă. Aplicarea trece prin importul kitului (confirmare, chei permise, rollback).
- Nou (kit): **Istoric local — «mașina timpului»** (`FFF.history`) — instantanee automate ale datelor (IndexedDB, fără secrete), diferență față de starea curentă și restaurare reversibilă; «Șterge datele aplicației» șterge și istoricul.
- Module adăugate: `qr`, `p2p`, `sync`, `history` (+~140 KB). Versiunea aplicației nu se schimbă.

## 1.3.9 — 2026-10-27 (anterior: 2.0.0)

Doar o notă și link-uri, fără funcții noi.

- Notă „Vezi și” în Setări (8 limbi) către generatoarele de frecvențe Frequency Laboratory și generator-frecvente (doar linkuri, `target=_blank`, fără cereri de rețea).
- README: „Stare” și „Offline” (8 limbi) și secțiunea „Vezi și”.

Nu implementat:

- Modul de generator liber de frecvențe în Aurora: NU s-a făcut. Regula este să nu se fuzioneze aplicațiile; suprapunerea este doar semnalată prin link. Decizia asupra unui eventual modul aparține autorului.
- Textul notei în catalană, hindi și arabă: nu s-a tradus (afișează textul englez, ca butonul CalmWaves inițial).

Istoricul anterior (1.x–2.0.0) este în secțiunea „History” din README.md.
