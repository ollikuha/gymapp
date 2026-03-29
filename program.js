// program.js – Workout programs
// Contains all workout programs. Add new programs to the PROGRAMS array.
// app.js reads the active program via PROGRAMS and getActiveProgramData().
//
// Program structure:
//   id       – unique identifier (string, no spaces)
//   name     – display name shown to the user
//   workouts – object keyed by workout split types (e.g. A, B, or A/B/C)
//              Each split contains: name (display name) and exercises (array)
//
// Exercise fields:
//   name          – exercise name (used to look up history across sessions)
//   target        – muscle group description shown to the user
//   type          – "weight" | "time" | "reps_per_side" (see below)
//   setsMin       – minimum number of sets
//   setsMax       – maximum number of sets
//   repsMin       – min reps / seconds / reps-per-side
//   repsMax       – max reps / seconds / reps-per-side
//   restDuration  – rest between sets in seconds (default 90)
//   note          – optional technique tip shown on the exercise card
//   progression   – optional progression model (weight-type exercises only, see below)
//
// Exercise types:
//   "weight"        – weight (kg) + reps input
//   "time"          – timer-based, reps = seconds (no weight field)
//   "reps_per_side" – reps per side (no weight field)
//
// Optional exercise flags:
//   perSide: true   – used with type "time": exercise is done separately for each side
//                     (e.g. side plank). Timer runs for left side first, then user
//                     manually starts it for right side.
//
// Progression models (progression field):
//   The app looks up the previous session for each exercise and suggests the
//   next weight/reps based on the model. If omitted, the last used weight is
//   suggested with no progression calculation.
//
//   { type: "double", weightIncrement: <kg> }   – Double progression (hypertrophy)
//     Work reps up to repsMax across all sets, then add weight and reset to repsMin.
//     • All sets reached repsMax last session → suggest weight + weightIncrement, target repsMin
//     • Otherwise → same weight, target reps = min(lowestRepsLastSession + 1, repsMax)
//     Hint shown in green when weight increases.
//
//   { type: "linear", weightIncrement: <kg> }   – Linear progression (strength)
//     Add weightIncrement every session regardless of rep count.
//     Suitable for low-rep strength work (≤6 reps).
//     Hint always shown in green.

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
            progression: { type: "double", weightIncrement: 5 },
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
            progression: { type: "double", weightIncrement: 2.5 },
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
            progression: { type: "double", weightIncrement: 2.5 },
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
            progression: { type: "double", weightIncrement: 2.5 },
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
            progression: { type: "double", weightIncrement: 2.5 },
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
            progression: { type: "double", weightIncrement: 2.5 },
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
            progression: { type: "double", weightIncrement: 2.5 },
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
            progression: { type: "double", weightIncrement: 2.5 },
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
            progression: { type: "double", weightIncrement: 2.5 },
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
            progression: { type: "double", weightIncrement: 2.5 },
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
            progression: { type: "double", weightIncrement: 2.5 },
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
            progression: { type: "linear", weightIncrement: 2.5 },
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
            progression: { type: "linear", weightIncrement: 2.5 },
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
            progression: { type: "double", weightIncrement: 2.5 },
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
            progression: { type: "double", weightIncrement: 2.5 },
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
            perSide: true,
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
            progression: { type: "double", weightIncrement: 2.5 },
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
            progression: { type: "double", weightIncrement: 2.5 },
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
            progression: { type: "double", weightIncrement: 2.5 },
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
            progression: { type: "linear", weightIncrement: 2.5 },
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
            perSide: true,
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
  },
  {
    id: 'puntti_ab_2026',
    name: 'Puntti A/B 2026',
    workouts: {
      A: {
        name: 'Treeni A – Kyykky & Penkki',
        exercises: [
          {
            name: 'Takakyykky',
            target: 'Reidet, pakarat ja keskivartalon tuki',
            type: 'weight',
            setsMin: 3,
            setsMax: 3,
            repsMin: 5,
            repsMax: 5,
            restDuration: 150,
            progression: { type: 'linear', weightIncrement: 2.5 },
            note: 'Aloita 70 kg. Lämmittely: 5 min dynaamiset venyttelyt + 2 x 10 tyhjällä tangolla. Tee noin joka 4. viikko kevyt viikko: noin 60 kg tai ~10–15 % kevyempi.'
          },
          {
            name: 'Penkkipunnerrus',
            target: 'Rinta, ojentajat ja etuolkapäät',
            type: 'weight',
            setsMin: 3,
            setsMax: 3,
            repsMin: 5,
            repsMax: 5,
            restDuration: 150,
            progression: { type: 'linear', weightIncrement: 2.5 },
            note: 'Aloita 50 kg. Tee noin joka 4. viikko kevyt viikko: noin 45 kg tai ~10–15 % kevyempi.'
          },
          {
            name: 'Leuanveto (vastaote)',
            target: 'Yläselkä, hauikset ja leveät selkälihakset',
            type: 'reps',
            setsMin: 3,
            setsMax: 3,
            repsMin: 5,
            repsMax: 8,
            restDuration: 120,
            note: 'Vedä hallitusti täyteen liikerataan. Lisää toistoja ennen lisäpainoa.'
          },
          {
            name: 'Facepulls',
            target: 'Takaolkapäät, lavan hallinta ja yläselkä',
            type: 'weight',
            setsMin: 2,
            setsMax: 2,
            repsMin: 15,
            repsMax: 15,
            restDuration: 75,
            progression: { type: 'double', weightIncrement: 2.5 },
            note: 'Pidä liike hallittuna kevyellä kuormalla.'
          },
          {
            name: 'Lankkupito',
            target: 'Keskivartalon staattinen tuki',
            type: 'time',
            setsMin: 3,
            setsMax: 3,
            repsMin: 45,
            repsMax: 45,
            restDuration: 60,
            note: 'Pidä vartalo suorana ja keskivartalo tiukkana koko sarjan ajan.'
          }
        ]
      },
      B: {
        name: 'Treeni B – Mave & Lisäpainoleuat',
        exercises: [
          {
            name: 'Maastaveto',
            target: 'Takaketju, pakarat, selkä ja ote',
            type: 'weight',
            setsMin: 3,
            setsMax: 3,
            repsMin: 5,
            repsMax: 5,
            restDuration: 180,
            progression: { type: 'linear', weightIncrement: 5 },
            note: 'Aloita 80 kg. Lämmittely: 2 min roikuntaa ja pyörittelyä + 2 x 8 lämmittelysarjat. Tee noin joka 4. viikko kevyt viikko: noin 70 kg tai ~10–15 % kevyempi.'
          },
          {
            name: 'Lisäpainoleuat',
            target: 'Yläselkä, hauikset ja leveät selkälihakset',
            type: 'weight',
            setsMin: 3,
            setsMax: 3,
            repsMin: 3,
            repsMax: 3,
            restDuration: 150,
            progression: { type: 'linear', weightIncrement: 1 },
            note: 'Aloita 8 kg lisäpainolla. Jos kaikki sarjat eivät täyty, toista sama paino seuraavalla kerralla.'
          },
          {
            name: 'Pystypunnerrus (kp)',
            target: 'Olkapäät ja ojentajat',
            type: 'weight',
            setsMin: 3,
            setsMax: 3,
            repsMin: 8,
            repsMax: 8,
            restDuration: 90,
            progression: { type: 'double', weightIncrement: 2 },
            note: 'Aloita 10 kg käsipainoilla. Kirjaa yhden käsipainon paino.'
          },
          {
            name: 'Yhden jalan askelkyykky',
            target: 'Pakarat, reidet ja tasapaino',
            type: 'weight',
            setsMin: 2,
            setsMax: 2,
            repsMin: 10,
            repsMax: 10,
            restDuration: 90,
            progression: { type: 'double', weightIncrement: 2 },
            note: 'Aloita 8 kg painoilla. Kirjaa yhden käsipainon paino ja tee liike hallitusti.'
          },
          {
            name: 'Vatsat',
            target: 'Keskivartalo',
            type: 'reps',
            setsMin: 3,
            setsMax: 3,
            repsMin: 30,
            repsMax: 30,
            restDuration: 60,
            note: 'Tee hallitusti ilman heilautusta.'
          }
        ]
      }
    }
  }
];
