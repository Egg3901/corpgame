"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
dotenv_1.default.config();
const sanitizeConnectionString = (connectionString) => {
    if (!connectionString)
        return connectionString;
    try {
        const url = new URL(connectionString);
        url.searchParams.delete('sslmode');
        url.searchParams.delete('ssl');
        url.searchParams.delete('sslrootcert');
        return url.toString();
    }
    catch {
        return connectionString;
    }
};
const ssl = (() => {
    const insecure = (process.env.PGSSLINSECURE || '').trim().toLowerCase();
    if (insecure === 'true' || insecure === '1' || insecure === 'yes') {
        return { rejectUnauthorized: false };
    }
    const rootCertPath = process.env.PGSSLROOTCERT;
    if (rootCertPath) {
        const ca = fs_1.default.readFileSync(rootCertPath.trim(), 'utf8');
        let servername;
        try {
            servername = new URL(process.env.DATABASE_URL || '').hostname;
        }
        catch {
            servername = undefined;
        }
        return { ca, rejectUnauthorized: true, servername };
    }
    return undefined;
})();
const pool = new pg_1.Pool({
    connectionString: sanitizeConnectionString(process.env.DATABASE_URL),
    ssl,
});
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});
exports.default = pool;
