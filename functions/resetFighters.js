// // seedFighters.js
// import admin from "firebase-admin";
// import { readFileSync } from "fs";

// const serviceAccount = JSON.parse(readFileSync("./serviceAccountKey.json", "utf8"));

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

// const db = admin.firestore();

// const fighters = [
//     { id: "aang", name: "Aang", image: "images/aang_thumb.png" },
//     { id: "shovel_knight", name: "Shovel Knight", image: "images/shovel_knight_thumb.png" },
//     { id: "grimace", name: "Grimace", image: "images/grimace_thumb.png" },
//     { id: "tom_bombadil", name: "Tom Bombadil", image: "images/tom_bombadil_thumb.png" },
//     { id: "ben_quadrinaros", name: "Ben Quadrinaros", image: "images/ben_quadrinaros_thumb.png" },
//     { id: "crimson_chin", name: "Crimson Chin", image: "images/crimson_chin_thumb.png" },
//     { id: "voldo", name: "Voldo", image: "images/voldo_thumb.png" },
//     { id: "frank", name: "Frank Reynolds", image: "images/frank_thumb.png" },
//     { id: "waluigi", name: "Waluigi", image: "images/waluigi_thumb.png" },
//     { id: "doom_slayer", name: "Doom Slayer", image: "images/doom_slayer_thumb.png" },
//     { id: "green_goblin", name: "Green Goblin", image: "images/green_goblin_thumb.png" },
//     { id: "elesh_norn", name: "Elesh Norn", image: "images/elesh_norn_thumb.png" },
//     { id: "white_goodman", name: "White Goodman", image: "images/white_goodman_thumb.png" },
//     { id: "rumi", name: "Rumi", image: "images/rumi_thumb.png" },
//     { id: "kamaji", name: "Kamaji", image: "images/kamaji_thumb.png" },
//     { id: "laszlo", name: "Laszlo Cravensworth", image: "images/laszlo_thumb.png" },
//     { id: "the_bride", name: "The Bride", image: "images/the_bride_thumb.png" },
//     { id: "yusuke", name: "Yusuke Urameshi", image: "images/yusuke_thumb.png" },
//     { id: "bob_ross", name: "Bob Ross", image: "images/bob_ross_thumb.png" },
//     { id: "bender", name: "Bender", image: "images/bender_thumb.png" },
//     { id: "marie_curie", name: "Marie Curie", image: "images/marie_curie_thumb.png" },
//     { id: "tars", name: "TARS", image: "images/tars_thumb.png" },
//     { id: "garfield", name: "Garfield", image: "images/garfield_thumb.png" },
//     { id: "brock", name: "brock", image: "images/brock_thumb.png" },
//     { id: "bobobo", name: "Bobobo-bo Bo-Bobo", image: "images/bobobo_thumb.png" },
//     { id: "kronk", name: "Kronk", image: "images/kronk_thumb.png" },
//     { id: "zero", name: "Zero", image: "images/zero_thumb.png" },
//     { id: "meatwad", name: "Meatwad", image: "images/meatwad_thumb.png" },
//     { id: "siegward", name: "Siegward of Caterina", image: "images/siegward_thumb.png" },
//     { id: "garnet", name: "Garnet", image: "images/garnet_thumb.png" },
//     { id: "gertie", name: "Grandma Gertie", image: "images/gertie_thumb.png" },
//     { id: "pennywise", name: "Pennywise", image: "images/pennywise_thumb.png" },
//   ];

// async function seedFighters() {
//   const fightersCol = db.collection("fighters");
//   const batch = db.batch();

//   fighters.forEach(f => batch.set(fightersCol.doc(f.id), f));

//   await batch.commit();
//   console.log(`✅ Seeded ${fighters.length} fighters.`);
// }

// seedFighters().catch(err => console.error(err));


// // // resetFighters.js
// import admin from "firebase-admin";
// import { readFileSync } from "fs";

// const serviceAccount = JSON.parse(readFileSync("./serviceAccountKey.json", "utf8"));

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

// const db = admin.firestore();

// async function resetFighters() {
//   const fightersCol = db.collection("fighters");
//   const snapshot = await fightersCol.get();

//   console.log(`🧹 Found ${snapshot.size} fighters. Deleting...`);
//   const batch = db.batch();

//   snapshot.forEach(doc => batch.delete(doc.ref));
//   await batch.commit();

//   console.log("✅ Fighters collection cleared.");
// }

// resetFighters().catch(err => console.error(err));


// // resetMatchups.js
// import admin from "firebase-admin";
// import { readFileSync } from "fs";

// const serviceAccount = JSON.parse(readFileSync("./serviceAccountKey.json", "utf8"));

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

// const db = admin.firestore();

// async function resetMatchups() {
//   const matchupsCol = db.collection("matchups");
//   const snapshot = await fightersCol.get();

//   console.log(`🧹 Found ${snapshot.size} matchups. Deleting...`);
//   const batch = db.batch();

//   snapshot.forEach(doc => batch.delete(doc.ref));
//   await batch.commit();

//   console.log("✅ Matchups collection cleared.");
// }

// resetMatchups().catch(err => console.error(err));