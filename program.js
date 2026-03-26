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

  // ── Ohjelma 2: Triathlon 2-jakoinen ─────────────────────────────────────
  {
    id: 'triathlon_2_jakoinen',
    name: 'Triathlon 2-jakoinen',
    workouts: {
      A: {
        name: "Voima A – Takaketju + yksijalkainen voima",
        exercises: [
          {
            name: "Romanialainen maastaveto",
            target: "Takareidet, pakarat ja lantion ojennusvoima",
            type: "weight",
            setsMin: 3,
            setsMax: 4,
            repsMin: 5,
            repsMax: 6,
            restDuration: 120,
            note: "Pääliike. Selkä neutraalina, pitkä eksentrinen vaihe. Jätä 1–2 toistoa varastoon."
          },
          {
            name: "Bulgarialainen askelkyykky",
            target: "Yksijalkainen voimantuotto, pakarat ja lantion hallinta",
            type: "weight",
            setsMin: 3,
            setsMax: 3,
            repsMin: 6,
            repsMax: 8,
            restDuration: 90,
            note: "Toistot per jalka. Kevyt etunoja, paina työ enemmän pakaralle kuin etureidelle."
          },
          {
            name: "Lantionnosto",
            target: "Pakarat ja juoksun loppuvaiheen työntö",
            type: "weight",
            setsMin: 3,
            setsMax: 3,
            repsMin: 6,
            repsMax: 8,
            restDuration: 90,
            note: "Pidä 1 sekunnin pito yläasennossa. Älä yliojenna alaselkää."
          },
          {
            name: "Pohkeet Smithissä",
            target: "Pohkeet ja soleus, juoksun iskunvastaanotto",
            type: "weight",
            setsMin: 3,
            setsMax: 3,
            repsMin: 10,
            repsMax: 15,
            restDuration: 60,
            note: "Seisten Smithissä korokkeella. Täysi liikerata ja rauhallinen alaslasku."
          },
          {
            name: "Pallof press",
            target: "Keskivartalon antirotaatio ja ajoasennon tuki",
            type: "reps_per_side",
            setsMin: 2,
            setsMax: 3,
            repsMin: 8,
            repsMax: 12,
            restDuration: 45,
            note: "Toistot per puoli. Pidä lantio ja rintakehä täysin vakaana."
          },
          {
            name: "Sivulankku",
            target: "Lantion sivutuki ja juoksun hallinta",
            type: "time",
            setsMin: 2,
            setsMax: 3,
            repsMin: 20,
            repsMax: 40,
            restDuration: 45,
            note: "Sekuntia per puoli. Suora linja nilkasta olkapäähän."
          }
        ]
      },
      B: {
        name: "Voima B – Yläselkä + lantio + juoksutuki",
        exercises: [
          {
            name: "Askelnousu penkille",
            target: "Yksijalkainen voima, pakarat ja juoksuspesifi työntö",
            type: "weight",
            setsMin: 3,
            setsMax: 3,
            repsMin: 6,
            repsMax: 8,
            restDuration: 90,
            note: "Toistot per jalka. Työnnä itsesi ylös etummaisen jalan avulla, ei ponnistusta takajalalla."
          },
          {
            name: "Reiden koukistus",
            target: "Takareidet ja juoksun väsymiskestävyys",
            type: "weight",
            setsMin: 3,
            setsMax: 3,
            repsMin: 8,
            repsMax: 10,
            restDuration: 75,
            note: "Hallitut toistot. Pidä lantio paikoillaan."
          },
          {
            name: "Soutulaite",
            target: "Yläselkä, lapatuen voima ja ajoasento",
            type: "weight",
            setsMin: 3,
            setsMax: 3,
            repsMin: 8,
            repsMax: 12,
            restDuration: 75,
            note: "Vedä kyynärpäät taakse, älä nosta hartioita korviin."
          },
          {
            name: "Leuanveto",
            target: "Leveä selkä, ryhti ja uintia tukeva veto",
            type: "weight",
            setsMin: 3,
            setsMax: 3,
            repsMin: 5,
            repsMax: 8,
            restDuration: 90,
            note: "Tee kehonpainolla tai lisäpainolla. Jos et saa toistoja haarukkaan, käytä avustusta."
          },
          {
            name: "Dead Bug",
            target: "Keskivartalon hallinta ja lantion kontrolli",
            type: "reps_per_side",
            setsMin: 2,
            setsMax: 3,
            repsMin: 6,
            repsMax: 10,
            restDuration: 45,
            note: "Toistot per puoli. Alaselkä pysyy koko ajan kiinni lattiassa."
          },
          {
            name: "Copenhagen lankku",
            target: "Lähentäjät, lantion stabiliteetti ja juoksun tukilihakset",
            type: "time",
            setsMin: 2,
            setsMax: 2,
            repsMin: 15,
            repsMax: 30,
            restDuration: 45,
            note: "Sekuntia per puoli. Aloita polvitukiversiolla jos täysi versio on liian raskas."
          }
        ]
      }
    }
  }
];
