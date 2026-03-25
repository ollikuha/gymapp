// program.js – Harjoitusohjelma
// Tiedosto sisältää kaikki harjoitusliikkeet. Voit vaihtaa ohjelman muokkaamalla tätä tiedostoa.
// app.js lukee tämän tiedoston WORKOUT_PROGRAM-muuttujan.
//
// Exercise type-kentät:
//   "weight"        – paino (kg) + toistot (oletus)
//   "time"          – aikapohjainen, toistot = sekuntia (ei kg-kenttää)
//   "reps_per_side" – toistot per puoli (ei kg-kenttää)

const WORKOUT_PROGRAM = {
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
        note: "Makaa selällään, kädet ja jalat kohti kattoa. Laske vastakkaista kättä ja jalkaa hitaasti kohti lattiaa. Alaselän on pysyttävä koko ajan lattiassa!"
      }
    ]
  }
};
