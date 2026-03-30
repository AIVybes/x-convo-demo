console.log("ENV CHECK:", process.env.DATABASE_URL);

import express from "express";
import pkg from "pg";
import cors from "cors";

const { Pool } = pkg;

const app = express();
app.use(cors());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// 🔥 AUTO INIT DATABASE
const initDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY
    );

    CREATE TABLE IF NOT EXISTS tweets (
      tweet_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL,
      quoted_tweet_id TEXT
    );

    CREATE TABLE IF NOT EXISTS tweet_edges (
      from_tweet_id TEXT NOT NULL,
      to_tweet_id TEXT NOT NULL,
      edge_type TEXT NOT NULL,
      PRIMARY KEY (from_tweet_id, to_tweet_id, edge_type)
    );
  `);

  // seed data (safe to run repeatedly)
  await pool.query(`
    INSERT INTO users (user_id)
    VALUES ('marklevinshow'), ('megynkelly')
    ON CONFLICT DO NOTHING;
  `);

  await pool.query(`
    INSERT INTO tweets (tweet_id, user_id, created_at, quoted_tweet_id)
    VALUES
    ('1991654970819834256', 'megynkelly', NOW(), NULL),
    ('1991680952209207640', 'marklevinshow', NOW(), '1991654970819834256')
    ON CONFLICT DO NOTHING;
  `);

  await pool.query(`
    INSERT INTO tweet_edges (from_tweet_id, to_tweet_id, edge_type)
    VALUES
    ('1991680952209207640', '1991654970819834256', 'quote')
    ON CONFLICT DO NOTHING;
  `);

  console.log("DB initialized");
};

// your existing query
const getConversation = async (tweetId) => {
  const query = `
    WITH RECURSIVE conversation AS (
      SELECT tweet_id, user_id, created_at
      FROM tweets
      WHERE tweet_id = $1

      UNION

      SELECT t.tweet_id, t.user_id, t.created_at
      FROM tweets t
      JOIN tweet_edges e ON t.tweet_id = e.from_tweet_id
      JOIN conversation c ON e.to_tweet_id = c.tweet_id

      UNION

      SELECT t.tweet_id, t.user_id, t.created_at
      FROM tweets t
      JOIN tweet_edges e ON t.tweet_id = e.to_tweet_id
      JOIN conversation c ON e.from_tweet_id = c.tweet_id
    )
    SELECT * FROM conversation;
  `;

  const { rows } = await pool.query(query, [tweetId]);
  return rows.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
};

app.get("/conversation/:tweetId", async (req, res) => {
  const data = await getConversation(req.params.tweetId);
  res.json(data);
});

// 🚀 INIT DB BEFORE START
initDB().then(() => {
  app.listen(3000, () => console.log("Server running"));
});
