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

app.listen(3000, () => {
  console.log("Server running");
});
