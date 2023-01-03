import dotenv from 'dotenv';

import validateEnv from './validateEnv.js';

dotenv.config();
validateEnv();

export default process.env;
