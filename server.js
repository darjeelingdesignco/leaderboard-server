const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Initialize Firebase
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.DATABASE_URL
});

const db = admin.database();
const leaderboardRef = db.ref("leaderboard");

// Get Top 10 Scores (Sorted)
app.get("/getLeaderboard", async (req, res) => {
  leaderboardRef.orderByChild("score").limitToLast(10).once("value", (snapshot) => {
    let scores = [];
    snapshot.forEach((child) => {
      scores.push({ id: child.key, ...child.val() });
    });
    scores.sort((a, b) => b.score - a.score); // Sort from highest to lowest
    res.json(scores);
  });
});

// Submit Score and Keep Only Top 10
app.post("/updateLeaderboard", async (req, res) => {
  const { name, score } = req.body;
  if (!name || score === undefined) return res.status(400).send("Invalid data");

  // Add new score
  const newEntryRef = leaderboardRef.push();
  await newEntryRef.set({ name, score });

  // Get updated leaderboard and keep only top 10
  leaderboardRef.orderByChild("score").once("value", async (snapshot) => {
    let scores = [];
    snapshot.forEach((child) => {
      scores.push({ id: child.key, ...child.val() });
    });

    scores.sort((a, b) => b.score - a.score); // Sort highest to lowest

    if (scores.length > 10) {
      const scoresToRemove = scores.slice(10); // Remove extra scores
      scoresToRemove.forEach(async (entry) => {
        await leaderboardRef.child(entry.id).remove();
      });
    }
  });

  res.send("Leaderboard updated!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
