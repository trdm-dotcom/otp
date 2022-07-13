import * as redis from 'redis';
import { Service } from 'typedi';
import Config from '../Config';
import { Logger, Errors } from 'common';
import * as Constants from '../Constants';

const DATA_TYPE = {
    UNDEFINED: 'a',
    NULL: 'b',
    BOOLEAN: '0',
    STRING: '1',
    NUMBER: '2',
    DATE: '3',
    OBJECT: '4',
};

export const REDIS_KEY = {
    OTP_STOGE: 'otp_stoge',
    OTP_VALIDATE: 'otp_validate',
    OTP_KEY_STOGE: 'otp_key_stoge',
};

@Service()
export default class RedisService {
    private client: redis.RedisClientType;

    public init() {
        this.client = redis.createClient(Config.redis);
        this.client
            .connect()
            .then(() => {
                Logger.info('connected to redis!');
            })
            .catch((err: any) => {
                Logger.error(`connected redis error ${err}`);
                throw new Errors.GeneralError(Constants.INTERNAL_ERROR);
            });
    }

    public async set<T>(key: string, value: T, option: any): Promise<void> {
        let valueAsString: string = null;
        if (typeof value == undefined) {
            valueAsString = `${DATA_TYPE.UNDEFINED}${value}`;
        } else if (typeof value == null) {
            valueAsString = `${DATA_TYPE.NULL}${value}`;
        } else if (typeof value == 'number') {
            valueAsString = `${DATA_TYPE.NUMBER}${value}`;
        } else if (typeof value == 'string') {
            valueAsString = `${DATA_TYPE.STRING}${value}`;
        } else if (typeof value == 'object') {
            valueAsString = `${DATA_TYPE.BOOLEAN}${JSON.stringify(value)}`;
        } else if (typeof value == 'boolean') {
            valueAsString = `${DATA_TYPE.BOOLEAN}${value ? 1 : 0}`;
        } else if (value instanceof Date) {
            valueAsString = `${DATA_TYPE.DATE}${(value as unknown as Date).getTime()}`;
        } else {
            valueAsString = `${DATA_TYPE.OBJECT}${JSON.stringify(value)}`;
        }

        await this.client.set(key, valueAsString, option);
    }

    public receiver(key: string, value: string): any {
        const dateFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
        if (typeof value === 'string' && dateFormat.test(value)) {
            return new Date(value);
        }
        return value;
    }

    public async get<T>(key: string): Promise<T> {
        const data = await this.client.get(key);
        if (data == null) {
            return null;
        } else {
            const type: string = data[0];
            let content: string = null;
            switch (type) {
                case DATA_TYPE.UNDEFINED:
                    return undefined;
                case DATA_TYPE.NULL:
                    return null;
                case DATA_TYPE.DATE:
                    content = data.substring(1);
                    return new Date(Number(content)) as unknown as T;
                case DATA_TYPE.BOOLEAN:
                    content = data.substring(1);
                    return (content == '1') as unknown as T;
                case DATA_TYPE.NUMBER:
                    content = data.substring(1);
                    return content as unknown as T;
                case DATA_TYPE.STRING:
                    content = data.substring(1);
                    return content as unknown as T;
                default:
                    content = data.substring(1);
                    return JSON.parse(content, this.receiver);
            }
        }
    }
}
