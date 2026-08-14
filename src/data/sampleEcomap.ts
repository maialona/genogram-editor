import {
  createEmptyDocument,
  createEcoLink,
  createEcoSystem,
  createPerson,
  type Document,
} from "../types/document";

/** Compact ecomap sample: core family plus typical social-work systems. */
export function createSampleEcomap(): Document {
  const ids = {
    ming: "p-ming",
    mei: "p-mei",
    hua: "p-hua",
    school: "s-school",
    friends: "s-friends",
    work: "s-work",
    club: "s-club",
  } as const;

  return {
    ...createEmptyDocument(),
    title: "小明生態圖",
    householdPersonIds: [ids.ming, ids.mei, ids.hua],
    persons: [
      createPerson({
        id: ids.ming,
        gender: "male",
        name: "小明",
        age: 30,
        indexPerson: true,
        x: 200,
        y: 260,
        ecomapX: -80,
        ecomapY: 20,
      }),
      createPerson({
        id: ids.mei,
        gender: "female",
        name: "美華",
        age: 29,
        x: 330,
        y: 260,
        ecomapX: 80,
        ecomapY: 20,
      }),
      createPerson({
        id: ids.hua,
        gender: "female",
        name: "小華",
        age: 5,
        x: 265,
        y: 400,
        ecomapX: 0,
        ecomapY: 90,
      }),
    ],
    relationships: [
      { id: "r-couple", from: ids.ming, to: ids.mei, type: "marriage" },
      { id: "r-p1", from: ids.ming, to: ids.hua, type: "parent" },
      { id: "r-p2", from: ids.mei, to: ids.hua, type: "parent" },
    ],
    ecoSystems: [
      createEcoSystem({
        id: ids.school,
        label: "幼兒園",
        category: "school",
        x: 0,
        y: -230,
      }),
      createEcoSystem({
        id: ids.friends,
        label: "朋友",
        category: "friends",
        x: 250,
        y: -80,
      }),
      createEcoSystem({
        id: ids.work,
        label: "工廠",
        category: "work",
        x: 220,
        y: 180,
      }),
      createEcoSystem({
        id: ids.club,
        label: "籃球社",
        category: "recreation",
        x: -240,
        y: 160,
      }),
    ],
    ecoLinks: [
      createEcoLink({
        id: "l-school",
        from: { kind: "person", personId: ids.hua },
        to: ids.school,
        strength: "moderate",
        quality: "stressful",
        notes: "適應壓力",
      }),
      createEcoLink({
        id: "l-friends",
        from: { kind: "person", personId: ids.ming },
        to: ids.friends,
        strength: "strong",
        quality: "supportive",
        flow: "both",
      }),
      createEcoLink({
        id: "l-work",
        from: { kind: "person", personId: ids.ming },
        to: ids.work,
        strength: "weak",
        quality: "supportive",
        flow: "outward",
      }),
      createEcoLink({
        id: "l-club",
        from: { kind: "household" },
        to: ids.club,
        strength: "moderate",
        quality: "cutoff",
        notes: "已不再參加",
      }),
    ],
    meta: { source: "sample-ecomap", diagramMode: "ecomap" },
  };
}
