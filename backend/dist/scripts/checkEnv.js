"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const possibleEnvPaths = [
    path_1.default.join(__dirname, '..', '..', '.env'),
    path_1.default.join(process.cwd(), '.env'),
    path_1.default.join(process.cwd(), 'backend', '.env'),
];
console.log('Checking environment variables...');
console.log('Current working directory:', process.cwd());
for (const envPath of possibleEnvPaths) {
    if (fs_1.default.existsSync(envPath)) {
        console.log('Found .env at:', envPath);
        dotenv_1.default.config({ path: envPath });
    }
}
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
if (process.env.DATABASE_URL) {
    console.log('DATABASE_URL starts with:', process.env.DATABASE_URL.substring(0, 20) + '...');
}
