CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  provider VARCHAR(50) NOT NULL,
  provider_id VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  email VARCHAR(255),
  profile_pic TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (provider, provider_id)
); 
