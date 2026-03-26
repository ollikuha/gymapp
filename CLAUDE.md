# GymTracker – ohjeet Claude Codelle

## PWA-päivitys – TÄRKEÄÄ

**Jokaisen muutoksen jälkeen ennen pushia** täytyy bumppaa service workerin cache-versio tiedostossa `sw.js`, muuten PWA-sovellus ei lataa uutta versiota.

### Miten

Avaa `sw.js` ja kasvata versionumeroa yhdellä:

```js
// Ennen:
const CACHE = 'gymtracker-v4';

// Jälkeen:
const CACHE = 'gymtracker-v5';
```

### Miksi tämä on pakollinen

Selain päivittää service workerin vain kun `sw.js`-tiedoston sisältö muuttuu. Cache-nimen muutos on yksinkertaisin tapa tehdä se. Kun uusi service worker aktivoituu, se poistaa vanhan cachen ja lataa kaikki tiedostot uudelleen.

Ilman tätä muutosta PWA näyttää käyttäjälle aina vanhan cachen version riippumatta siitä mitä mainiin on pushattu.

### Muistilista ennen jokaista pushia

1. Tee koodimuutokset normaalisti
2. Bumppaa `sw.js`:n `CACHE`-versio (v4 → v5 → v6 jne.)
3. Commitoi kaikki muuttuneet tiedostot yhteen committiin
4. Pushaa mainiin
