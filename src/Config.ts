import * as dotenv from 'dotenv';
import { v4 as uuid } from 'uuid';
dotenv.config();

const nodeId = uuid();

let Config = {
    clusterId: 'otp',
    clientId: `otp-${nodeId}`,
    nodeId: nodeId,
    kafkaUrls: ['localhost:9092'],
    kafkaCommonOptions: {},
    kafkaConsumerOptions: {},
    kafkaProducerOptions: {},
    kafkaTopicOptions: {},
    requestHandlerTopics: [],
    redis: {
        url: 'redis://localhost:6379',
    },
    app: {
        otpLength: 6,
        otpMaxGenTime: 10, // seconds
        otpFailRetryTimes: 5,
        otpTemporarilyLockedTime: 1800, // seconds
        otpVerifyTime: 86400, // seconds
        otpLifeTime: {
            email: (process.env.OTP_LIFE_TIME && parseInt(process.env.OTP_LIFE_TIME)) || 300,
            sms: (process.env.OTP_LIFE_TIME && parseInt(process.env.OTP_LIFE_TIME)) || 300,
        },
        key: {
            otp: {
                privateKey: './../../external/otp_private.key',
                publicKey: './../../external/otp_public.key',
            },
            jwt: {
                publicKey: 'external/key/jwt_public.key',
                privateKey: 'external/key/jwt_private.key',
            },
        },
    },
    topic: {
        otp: 'otp',
    },
    logger: {
        config: {
            appenders: {
                application: { type: 'console' },
                file: {
                    type: 'file',
                    filename: './../../logs/application_otp.log',
                    compression: true,
                    maxLogSize: 10485760,
                    backups: 100,
                },
            },
            categories: {
                default: { appenders: ['application', 'file'], level: 'info' },
            },
        },
    },
};

try {
    const env = require('./env');
    if (env) {
        Config = { ...Config, ...env(Config) };
    }
    console.log(`config: ${JSON.stringify(Config)}`);
} catch (e) {
    console.log(`error while load env.js :${e}`);
}

Config.kafkaConsumerOptions = {
    ...(Config.kafkaCommonOptions ? Config.kafkaCommonOptions : {}),
    ...(Config.kafkaConsumerOptions ? Config.kafkaConsumerOptions : {}),
};
Config.kafkaProducerOptions = {
    ...(Config.kafkaCommonOptions ? Config.kafkaCommonOptions : {}),
    ...(Config.kafkaProducerOptions ? Config.kafkaProducerOptions : {}),
};

if (Config.requestHandlerTopics.length === 0) {
    Config.requestHandlerTopics.push(Config.clusterId);
}

export default Config;