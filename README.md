# GymTracker

Mobiilioptimioitu salitreenisovellus, joka toimii suoraan selaimessa ilman asennusta tai backendiä. Kaikki data tallennetaan laitteen omaan selainmuistiin (localStorage).

## Ominaisuudet

- **Vuorottelevat treeniohjelmat** – Treeni A (alavartalo + pakarat + keskivartalo) ja Treeni B (ylävartalo + keskivartalo) vuorottelevat automaattisesti
- **Sarjatimer** – Aikapohjaisille liikkeille (esim. lankku) sisäänrakennettu ajastin, joka pitää näytön auki koko suorituksen ajan
- **Lepotimer** – Sarjojen välinen ajastin animoidulla kaarella; värinä + äänimerkki kun lepo on ohi
- **Painoehdotukset** – Sovellus muistaa edellisestä treenistä käytetyn painon ja ehdottaa sitä automaattisesti
- **Treenihistoria** – Kaikki tehdyt treenit tallentuvat, yksittäisiä treenejä voi poistaa
- **Kesken jäänyt treeni** – Sovelluksen sulkeminen kesken treenin ei haittaa; avaamalla sen uudelleen voi jatkaa siitä mihin jäi
- **Laite varattu** – Liikeen voi ohittaa ja siirtää listalle loppuun
- **PWA** – Sovellus on asennettavissa puhelimen kotinäytölle ja toimii offline-tilassa

## Tiedostorakenne

```
index.html    – HTML-runko ja kaikki CSS
app.js        – Sovelluslogiikka ja UI-renderointi
program.js    – Treeniohjelma (liikkeet, sarjat, toistot, lepoajat)
sw.js         – Service Worker (välimuistitus, offline-tuki)
manifest.json – PWA-konfiguraatio
icon.svg      – Sovelluksen ikoni
```

## Harjoitusohjelman muokkaaminen

Kaikki liikkeet, sarjat, toistot ja lepoajat löytyvät tiedostosta `program.js`. Muuttamalla tätä tiedostoa voi vaihtaa koko ohjelman tarvitsematta koskea muuhun koodiin.

### Liikkeen kentät

| Kenttä | Kuvaus |
|--------|--------|
| `name` | Liikkeen nimi (näkyy myös historiassa) |
| `target` | Kohdelihas |
| `type` | `"weight"` = paino + toistot, `"time"` = sekuntipohjainen, `"reps_per_side"` = toistot/puoli |
| `setsMin` / `setsMax` | Sarjamäärä |
| `repsMin` / `repsMax` | Toisto- tai sekuntimäärä |
| `restDuration` | Lepoaika sekunteina sarjojen välissä |
| `note` | Tekniikkavinkki, näkyy liikekortissa |

> **Huom:** Jos vaihdat liikkeen nimen, sovellus ei enää löydä vanhoja painoehdotuksia kyseiselle liikkeelle. Treenihistoria säilyy silti ehjänä.

## Tekninen toteutus

- Vanilla JS, ei frameworkeja
- Kaikki data `localStorage`-muistissa – ei palvelinyhteyttä
- Service Worker käyttää network-first-strategiaa: hakee aina uusimman version verkosta ja palaa välimuistiin vain jos yhteys puuttuu
- [Screen Wake Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API) estää näytön sammumisen sarjatimerin aikana
- History API mahdollistaa selaimen takaisin-eleen treenin aikana

## Asennus (GitHub Pages)

1. Forkkaa tai kloonaa repo
2. Ota GitHub Pages käyttöön repon asetuksista (Settings → Pages → Deploy from branch → `main`)
3. Sovellus on käytettävissä osoitteessa `https://<käyttäjänimi>.github.io/<repon-nimi>/`
