import { config } from 'dotenv';

import validateEnv from './validateEnv.js';

config();
validateEnv();

export default process.env;
