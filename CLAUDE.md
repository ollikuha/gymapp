# GymTracker – ohjeet Claude Codelle

## PWA-päivitys – TÄRKEÄÄ

**Jokaisen muutoksen jälkeen ennen pushia** täytyy bumppaa service workerin cache-versio tiedostossa `sw.js`, muuten PWA-sovellus ei lataa uutta versiota.

### Miten

Avaa `sw.js` ja kasvata versionumeroa yhdellä:

```js
// Ennen:
const CACHE = 'gymtracker-v20';

// Jälkeen:
const CACHE = 'gymtracker-v21';
```

### Miksi tämä on pakollinen

Selain päivittää service workerin vain kun `sw.js`-tiedoston sisältö muuttuu. Cache-nimen muutos on yksinkertaisin tapa tehdä se. Kun uusi service worker aktivoituu, se poistaa vanhan cachen ja lataa kaikki tiedostot uudelleen.

Ilman tätä muutosta PWA näyttää käyttäjälle aina vanhan cachen version riippumatta siitä mitä mainiin on pushattu.

### Muistilista ennen jokaista pushia

1. Tee koodimuutokset normaalisti
2. Bumppaa `sw.js`:n `CACHE`-versio (v20 → v21 → v22 jne.)
3. Commitoi kaikki muuttuneet tiedostot yhteen committiin
4. Pushaa mainiin (feature-branchilla: pushaa branch ja merge mainiin)

## Arkkitehtuuri

### Tiedostot

| Tiedosto | Kuvaus |
|----------|--------|
| `app.js` | Sovelluksen logiikka, UI-renderöinti, tilamuuttujat |
| `program.js` | Ohjelmamäärittelyt (harjoitukset, sarjat, toistot) |
| `index.html` | HTML-rakenne ja kaikki CSS |
| `sw.js` | Service Worker (välimuisti, offline-tuki) |
| `manifest.json` | PWA-konfiguraatio |

### Tallennus

- **`localStorage`** – Aktiivinen sessio (`gymtracker_active`) ja aktiivinen ohjelma (`gymtracker_program`)
- **`IndexedDB`** (v2) – Treenihistoria ja mukautetut ohjelmat
  - Store `sessions` – Tallennetut treenikerrat
  - Store `programs` – Käyttäjän omat ohjelmat

### Teknologiat

- Vanilla JavaScript, ei frameworkeja
- Service Worker: network-first-strategia
- Screen Wake Lock API: estää näytön sammumisen ajastimen aikana
- Web Audio API: äänimerkki ajastimen päättyessä
- Vibration API: haptinen palaute ajastimen päättyessä
- History API: selaimen takaisin-eleen tuki treenin aikana
