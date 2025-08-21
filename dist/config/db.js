"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const pool = new pg_1.Pool({
    user: "postgres",
    host: "database-1.czi08gwqmkga.eu-north-1.rds.amazonaws.com",
    database: "database-1.czi08gwqmkga.eu-north-1.rds.amazonaws.com",
    password: "Anmol26ffthind",
    port: 5432,
});
exports.default = pool;
