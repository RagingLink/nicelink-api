export interface Config {
    discord: {
        token: string;
        logChannel: string;
    };
    postgres: {
        user: string;
        db: string;
        password: string;
    };
    beta: boolean;
    port: number;
}
