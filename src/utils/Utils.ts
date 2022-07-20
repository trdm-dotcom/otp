import { readFileSync } from 'fs';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

export async function generateToken(payload: any, expiresIn: string, privateKey: any): Promise<string> {
    const signInOptions: jwt.SignOptions = {
        keyid: uuidv4(),
        algorithm: 'RS256',
        expiresIn: expiresIn,
    };
    return await jwt.sign(payload, privateKey, signInOptions);
}

export function getKey(filename): Buffer {
    return readFileSync(filename);
}
