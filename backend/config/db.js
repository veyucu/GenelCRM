const sql = require('mssql');

const config = {
  server: '192.168.1.242',
  user: 'sa',
  password: 'sapass1*',
  database: 'GC2025',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let pool = null;

async function getPool() {
  if (!pool) {
    pool = await sql.connect(config);
  }
  return pool;
}

async function query(queryString, params = []) {
  const pool = await getPool();
  const request = pool.request();
  
  // Add parameters if provided
  params.forEach((param, index) => {
    request.input(`param${index}`, param);
  });
  
  return request.query(queryString);
}

module.exports = {
  sql,
  getPool,
  query,
  config
};
