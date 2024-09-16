import { cleanEnv, port, str } from 'envalid';

const validateEnv = (): void => {
    cleanEnv(process.env, {
        PORT: port(),
        DATABASE_URL: str()
    });
};
export default validateEnv;
