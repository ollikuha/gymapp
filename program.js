// program.js – Harjoitusohjelmat
// Tiedosto sisältää kaikki harjoitusohjelmat. Lisää uusia ohjelmia PROGRAMS-taulukkoon.
// app.js lukee PROGRAMS-muuttujan ja getActiveProgramData()-funktion kautta aktiivisen ohjelman.
//
// Ohjelmarakenne:
//   id       – uniikki tunniste (merkkijono, ei välilyöntejä)
//   name     – ohjelman nimi (näkyy käyttäjälle)
//   workouts – objekti, jossa avaimina treenijakotyypit (esim. A, B, tai A/B/C)
//              Jokainen treenijakotyyppi sisältää: name (nimi) ja exercises (liikkeet)
//
// Exercise type-kentät:
//   "weight"        – paino (kg) + toistot (oletus)
//   "time"          – aikapohjainen, toistot = sekuntia (ei kg-kenttää)
//   "reps_per_side" – toistot per puoli (ei kg-kenttää)
//
// restDuration – lepoaika sarjojen välissä sekunteina (oletus 90)

const PROGRAMS = [
  // ── Ohjelma 1: Perusohjelma A/B ──────────────────────────────────────────
  {
    id: 'default',
    name: 'Perusohjelma',
    workouts: {
      A: {
        name: "Alavartalo + Pakarat + Keskivartalo",
        exercises: [
          {
            name: "Jalkaprässi",
            target: "Etureidet ja pakarat",
            type: "weight",
            setsMin: 3,
            setsMax: 3,
            repsMin: 10,
            repsMax: 12,
            restDuration: 90,
            note: "Pidä selkä tiukasti kiinni penkissä. Älä ojenna polvia täysin lukkoon yläasennossa."
          },
          {
            name: "Lantionnosto",
            target: "Pakarat",
            type: "weight",
            setsMin: 3,
            setsMax: 3,
            repsMin: 10,
            repsMax: 12,
            restDuration: 90,
            note: "Tee lantionnostolaitteessa TAI selkä penkin reunalla käsipaino sylissä. Purista pakarat tiukaksi ylhäällä, pidä pito 1 sekunti."
          },
          {
            name: "Reiden koukistus",
            target: "Takareidet",
            type: "weight",
            setsMin: 2,
            setsMax: 3,
            repsMin: 10,
            repsMax: 12,
            restDuration: 75,
            note: "Rauhallinen liike, älä riuhdo."
          },
          {
            name: "Lonkan loitonnus",
            target: "Pakaran sivuosa",
            type: "weight",
            setsMin: 2,
            setsMax: 3,
            repsMin: 12,
            repsMax: 15,
            restDuration: 60,
            note: "Tee liike hallitusti, älä \"pomputa\" painoja."
          },
          {
            name: "Pohkeet",
            target: "Pohkeet",
            type: "weight",
            setsMin: 3,
            setsMax: 3,
            repsMin: 12,
            repsMax: 15,
            restDuration: 60,
            note: "Laite, istuen tai seisten."
          },
          {
            name: "Lankku",
            target: "Syvät vatsalihakset",
            type: "time",
            setsMin: 2,
            setsMax: 3,
            repsMin: 20,
            repsMax: 40,
            restDuration: 60,
            note: "Polvet maassa. Pidä napa kevyesti sisäänvedettynä. Älä anna selän notkistua."
          }
        ]
      },
      B: {
        name: "Ylävartalo + Keskivartalo",
        exercises: [
          {
            name: "Ylätalja",
            target: "Selän leveys ja ryhti",
            type: "weight",
            setsMin: 3,
            setsMax: 3,
            repsMin: 8,
            repsMax: 12,
            restDuration: 90,
            note: "Leveä ote. Vedä tanko rinnan yläosaan, pidä hartiat alhaalla – älä nosta korviin."
          },
          {
            name: "Soutulaite",
            target: "Selän keskiosa",
            type: "weight",
            setsMin: 3,
            setsMax: 3,
            repsMin: 10,
            repsMax: 12,
            restDuration: 90,
            note: "Alatalja käy myös. Vie lapaluut yhteen vedon lopussa."
          },
          {
            name: "Rintaprässi",
            target: "Rintalihakset",
            type: "weight",
            setsMin: 2,
            setsMax: 3,
            repsMin: 8,
            repsMax: 12,
            restDuration: 90,
            note: "Laite."
          },
          {
            name: "Olkapääprässi",
            target: "Olkapäät",
            type: "weight",
            setsMin: 2,
            setsMax: 2,
            repsMin: 10,
            repsMax: 12,
            restDuration: 60,
            note: "Laite. Varo jännittämästä niskaa."
          },
          {
            name: "Ojentajapunnerrus",
            target: "Ojentajat (\"allit\")",
            type: "weight",
            setsMin: 2,
            setsMax: 2,
            repsMin: 12,
            repsMax: 15,
            restDuration: 60,
            note: "Talja, naru tai tanko. Pidä kyynärpäät kylkien vieressä koko liikkeen ajan."
          },
          {
            name: "Hauiskääntö",
            target: "Hauikset",
            type: "weight",
            setsMin: 2,
            setsMax: 2,
            repsMin: 12,
            repsMax: 15,
            restDuration: 60,
            note: "Käsipainot tai talja."
          },
          {
            name: "Dead Bug",
            target: "Vatsalihasten hallinta",
            type: "reps_per_side",
            setsMin: 2,
            setsMax: 3,
            repsMin: 6,
            repsMax: 10,
            restDuration: 60,
            note: "Makaa selällään, kädet ja jalat kohti kattoa. Laske vastakkaista kättä ja jalkaa hitaasti kohti lattiaa. Alaselän on pysyttävä koko ajan lattiassa!"
          }
        ]
      }
    }
  },

  // ── Ohjelma 2: Kolmijako A/B/C ───────────────────────────────────────────
  {
    id: 'kolmijako',
    name: 'Kolmijako',
    workouts: {
      A: {
        name: "Jalat + Pakarat",
        exercises: [
          {
            name: "Jalkaprässi",
            target: "Etureidet ja pakarat",
            type: "weight",
            setsMin: 4,
            setsMax: 4,
            repsMin: 8,
            repsMax: 12,
            restDuration: 120,
            note: "Pidä selkä tiukasti kiinni penkissä. Älä ojenna polvia täysin lukkoon yläasennossa."
          },
          {
            name: "Lantionnosto",
            target: "Pakarat",
            type: "weight",
            setsMin: 4,
            setsMax: 4,
            repsMin: 10,
            repsMax: 12,
            restDuration: 90,
            note: "Purista pakarat tiukaksi ylhäällä, pidä pito 1 sekunti."
          },
          {
            name: "Reiden koukistus",
            target: "Takareidet",
            type: "weight",
            setsMin: 3,
            setsMax: 3,
            repsMin: 10,
            repsMax: 12,
            restDuration: 75,
            note: "Rauhallinen liike, älä riuhdo."
          },
          {
            name: "Lonkan loitonnus",
            target: "Pakaran sivuosa",
            type: "weight",
            setsMin: 3,
            setsMax: 3,
            repsMin: 12,
            repsMax: 15,
            restDuration: 60,
            note: "Tee liike hallitusti, älä \"pomputa\" painoja."
          },
          {
            name: "Pohkeet",
            target: "Pohkeet",
            type: "weight",
            setsMin: 3,
            setsMax: 3,
            repsMin: 15,
            repsMax: 20,
            restDuration: 60,
            note: "Laite, istuen tai seisten."
          }
        ]
      },
      B: {
        name: "Rintalihas + Ojentajat + Olkapäät",
        exercises: [
          {
            name: "Rintaprässi",
            target: "Rintalihakset",
            type: "weight",
            setsMin: 4,
            setsMax: 4,
            repsMin: 8,
            repsMax: 12,
            restDuration: 90,
            note: "Laite tai käsipainot. Pidä lapaluut kiinni penkissä."
          },
          {
            name: "Vinopenkkiprässi",
            target: "Rintalihakset (yläosa)",
            type: "weight",
            setsMin: 3,
            setsMax: 3,
            repsMin: 10,
            repsMax: 12,
            restDuration: 90,
            note: "Käsipainot tai laite. 30–45° kulma."
          },
          {
            name: "Olkapääprässi",
            target: "Olkapäät",
            type: "weight",
            setsMin: 3,
            setsMax: 3,
            repsMin: 10,
            repsMax: 12,
            restDuration: 75,
            note: "Laite tai käsipainot. Varo jännittämästä niskaa."
          },
          {
            name: "Sivunousu",
            target: "Olkapäiden sivuosa",
            type: "weight",
            setsMin: 3,
            setsMax: 3,
            repsMin: 12,
            repsMax: 15,
            restDuration: 60,
            note: "Käsipainot. Nosta kyynärpäät hartioiden tasolle, ei korkeammalle."
          },
          {
            name: "Ojentajapunnerrus",
            target: "Ojentajat (\"allit\")",
            type: "weight",
            setsMin: 3,
            setsMax: 3,
            repsMin: 12,
            repsMax: 15,
            restDuration: 60,
            note: "Talja, naru tai tanko. Pidä kyynärpäät kylkien vieressä koko liikkeen ajan."
          }
        ]
      },
      C: {
        name: "Selkä + Hauikset + Vatsa",
        exercises: [
          {
            name: "Ylätalja",
            target: "Selän leveys ja ryhti",
            type: "weight",
            setsMin: 4,
            setsMax: 4,
            repsMin: 8,
            repsMax: 12,
            restDuration: 90,
            note: "Leveä ote. Vedä tanko rinnan yläosaan, pidä hartiat alhaalla – älä nosta korviin."
          },
          {
            name: "Soutulaite",
            target: "Selän keskiosa",
            type: "weight",
            setsMin: 4,
            setsMax: 4,
            repsMin: 10,
            repsMax: 12,
            restDuration: 90,
            note: "Alatalja käy myös. Vie lapaluut yhteen vedon lopussa."
          },
          {
            name: "Hauiskääntö",
            target: "Hauikset",
            type: "weight",
            setsMin: 3,
            setsMax: 3,
            repsMin: 10,
            repsMax: 15,
            restDuration: 60,
            note: "Käsipainot tai talja."
          },
          {
            name: "Vasarakääntö",
            target: "Hauikset ja kyynärvarret",
            type: "weight",
            setsMin: 3,
            setsMax: 3,
            repsMin: 12,
            repsMax: 15,
            restDuration: 60,
            note: "Käsipainot neutraaliote (peukalot ylös)."
          },
          {
            name: "Dead Bug",
            target: "Vatsalihasten hallinta",
            type: "reps_per_side",
            setsMin: 3,
            setsMax: 3,
            repsMin: 8,
            repsMax: 10,
            restDuration: 60,
            note: "Makaa selällään, kädet ja jalat kohti kattoa. Laske vastakkaista kättä ja jalkaa hitaasti kohti lattiaa. Alaselän on pysyttävä koko ajan lattiassa!"
          },
          {
            name: "Lankku",
            target: "Syvät vatsalihakset",
            type: "time",
            setsMin: 3,
            setsMax: 3,
            repsMin: 20,
            repsMax: 45,
            restDuration: 60,
            note: "Polvet maassa tai varpaat. Pidä napa kevyesti sisäänvedettynä."
          }
        ]
      }
    }
  }
];
