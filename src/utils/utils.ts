import * as fs from 'fs';
import * as path from 'path';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

export default class utils {
    public static async generateToken(payload: any, expiresIn: string, privateKey: any): Promise<string> {
        const signInOptions: jwt.SignOptions = {
            keyid: uuidv4(),
            algorithm: 'RS256',
            expiresIn: expiresIn,
        };
        return await jwt.sign(payload, privateKey, signInOptions);
    }

    public static getPrivateKey(filename: string): Buffer {
        return fs.readFileSync(path.join(__dirname, filename));
    }
}
