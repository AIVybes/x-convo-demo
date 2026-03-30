CREATE TABLE users (
  user_id TEXT PRIMARY KEY
);

CREATE TABLE tweets (
  tweet_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL,
  quoted_tweet_id TEXT
);

CREATE TABLE tweet_edges (
  from_tweet_id TEXT NOT NULL,
  to_tweet_id TEXT NOT NULL,
  edge_type TEXT NOT NULL,
  PRIMARY KEY (from_tweet_id, to_tweet_id, edge_type)
);
