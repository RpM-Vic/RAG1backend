import { pool } from './dbConnection';

async function main() {
  try {
    await pool.query(/* sql */ ` 

    -- CREATE TABLE IF NOT EXISTS products(
    --   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    --   price BIGINT NOT NULL,
    --   currency CHAR(3) NOT NULL DEFAULT 'USD',
    --   credits BIGINT NOT NULL,
    --   description TEXT
    -- )

    -- DO $$
    -- BEGIN
    --   IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    --     CREATE TYPE payment_status AS ENUM (
    --       'processing',
    --       'completed',
    --       'failed',
    --       'other'
    --     );
    --   END IF;
    -- END$$;


    -- -- Create function to update timestamp
    -- CREATE OR REPLACE FUNCTION update_updated_at_column()
    -- RETURNS TRIGGER AS $$
    -- BEGIN
    --   NEW.updated_at = CURRENT_TIMESTAMP;
    --   RETURN NEW;
    -- END;
    -- $$ LANGUAGE plpgsql;

    CREATE TRIGGER update_payments_updated_at
      BEFORE UPDATE ON payments
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

      -- ALTER TABLE payments 
      -- ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

    -- CREATE TABLE IF NOT EXISTS payments(
    --   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    --   provider TEXT NOT NULL DEFAULT 'stripe',
    --   provider_payment_id TEXT NOT NULL,
    --   user_id UUID NOT NULL REFERENCES users(id),
    --   product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    --   status payment_status NOT NULL DEFAULT 'processing',
    --   metadata JSONB DEFAULT '{}',
    --   created_at TIMESTAMPTZ DEFAULT NOW(),
    --   updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    --   completed_at TIMESTAMPTZ DEFAULT NULL,

    --   UNIQUE(provider, provider_payment_id)
    -- );

    -- CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
    -- CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

    --   CREATE EXTENSION IF NOT EXISTS vector;

    --   USER ROLE ENUM
    --   DO $$ BEGIN
    --     CREATE TYPE user_role AS ENUM ('visitor','user', 'admin');
    --   EXCEPTION WHEN duplicate_object THEN null; END $$;


    --   CREATE EXTENSION IF NOT EXISTS citext;
    --   -- USERS
    --   CREATE TABLE IF NOT EXISTS users (
    --     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    --     name VARCHAR(255) NOT NULL,
    --     email CITEXT UNIQUE NOT NULL, -- case-insensitive
    --     password VARCHAR(255) ,
    --     credits INT DEFAULT 0,
    --     active BOOLEAN NOT NULL DEFAULT TRUE,
    --     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    --     updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    --     expiration_date TIMESTAMPTZ,
    --     role user_role NOT NULL DEFAULT 'visitor',
    --     otp VARCHAR(30),
    --     password_buffer VARCHAR(30)
    --   );

    --   CREATE INDEX IF NOT EXISTS idx_email ON users(email);

      -- CREATE TRIGGER update_users_updated_at
      --   BEFORE UPDATE ON users
      --   FOR EACH ROW
      -- EXECUTE FUNCTION update_updated_at_column();

      -- CREATE TABLE IF NOT EXISTS books(
      --   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      --   user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      --   embedded_pages integer DEFAULT 0 NOT NULL;
      --   path TEXT
      --   title TEXT NOT NULL,
      --   created_at TIMESTAMPTZ DEFAULT now()
      -- );

      -- CREATE INDEX IF NOT EXISTS idx_books_user_id ON books(user_id);

    -- CREATE TABLE IF NOT EXISTS chunks(
    --   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    --   book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    --   content TEXT ,
    --   hash_version TEXT ,
    --   embedding vector(1536) NOT NULL,
    --   page_number INT,
    --   chunk_index INT, -- Order within document
    --   metadata JSONB DEFAULT '{}'::jsonb, -- Flexible metadata
    --   token_count INT, -- For context window management,
    --   created_at TIMESTAMPTZ DEFAULT now(),
      
    -- );

    -- CREATE INDEX chunks_embedding_idx ON chunks
    -- USING ivfflat (embedding vector_cosine_ops)
    -- WITH (lists = 100);

    -- CREATE INDEX idx_chunks_manual ON chunks(manual_id);

    -- DO $$ BEGIN
    --   CREATE TYPE log_level AS ENUM ('warning','error', 'info');
    -- EXCEPTION WHEN duplicate_object THEN null; END $$;
    -- CREATE TABLE IF NOT EXISTS logs(
    --   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    --   user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    --   level log_level,
    --   message TEXT NOT NULL,
    --   origin TEXT,
    --   function TEXT,
    --   happened_at TIMESTAMPTZ DEFAULT now()
    -- );

    -- CREATE INDEX IF NOT EXISTS idx_logs_user_id ON logs(user_id);

    `);
  } catch (e) {
    console.log(e);
  }
}

main();
