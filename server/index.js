import express from 'express';
import cors from 'cors';
import mysql from 'mysql2';
import dotenv from 'dotenv';
import { Groq } from 'groq-sdk';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Check environment variables
['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'GROQ_API_KEY'].forEach((key) => {
  if (!process.env[key]) throw new Error(`Missing env variable: ${key}`);
});

// Connect to MySQL
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect(err => {
  if (err) {
    console.error('MySQL connection error:', err.message);
  } else {
    console.log('Connected to MySQL');
  }
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.get('/', (req, res) => {
  res.send('AI Data Agent Backend Running');
});

app.post('/ask', async (req, res) => {
  const { question } = req.body;

  const prompt = `
You are an AI assistant that translates natural language business questions into SQL SELECT queries.
Use only the following tables and columns:

TABLE: customers (id, name, age, signup_date, region)
TABLE: orders (id, customer_id, order_date)
TABLE: order_items (id, order_id, product_id, quantity)
TABLE: products (id, name, category, price)

Return only a valid MySQL SELECT query based on the question below.
Do NOT include explanations, comments, or semicolons.

Question: "${question}"
`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama3-70b-8192',
      messages: [{ role: 'user', content: prompt }],
    });

    let sqlQuery = completion.choices[0].message.content.trim();

    // Remove trailing semicolon if it exists
    if (sqlQuery.endsWith(';')) {
      sqlQuery = sqlQuery.slice(0, -1);
    }

    // Only allow SELECT queries without semicolons
    if (!sqlQuery.toLowerCase().startsWith('select')) {
      return res.status(400).json({ error: 'Only safe SELECT queries are allowed' });
    }

    // Execute the query
    db.query(sqlQuery, (err, results) => {
      if (err) {
        console.error('SQL error:', err.message);
        return res.status(500).json({ error: 'SQL query error', details: err.message });
      }

      res.json({ sql: sqlQuery, results });
    });
  } catch (error) {
    console.error('AI or server error:', error);
    res.status(500).json({ error: 'Failed to generate or execute SQL', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
