const { Client } = require('pg');
require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect().then(() => {
  return client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'reports'`);
}).then(res => {
  console.log(res.rows.map(r => r.column_name));
  client.end();
}).catch(console.error);
