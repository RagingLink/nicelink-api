import dotenv from 'dotenv';
dotenv.config();

import validateEnv from './validateEnv.js';
validateEnv();

export default process.env;