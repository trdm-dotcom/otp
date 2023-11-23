import { Utils } from 'common';

let Config = {
  clusterId: 'otp',
  clientId: `otp-${Utils.getEnvNum('ENV_NODE_ID')}`,
  nodeId: Utils.getEnvNum('ENV_NODE_ID'),
  kafkaUrls: Utils.getEnvArr('ENV_KAFKA_URLS'),
  kafkaCommonOptions: {},
  kafkaConsumerOptions: {},
  kafkaProducerOptions: {},
  kafkaTopicOptions: {},
  requestHandlerTopics: [],
  redis: {
    url: `redis://${Utils.getEnvStr('ENV_REDIS_HOST')}:${Utils.getEnvStr('ENV_REDIS_PORT')}`,
  },
  app: {
    otpLength: 6,
    otpMaxGenTime: 10, // seconds
    otpFailRetryTimes: 5,
    otpTemporarilyLockedTime: 1800, // seconds
    otpVerifyTime: 300, // seconds
    otpLifeTime: 300, // seconds
    key: {
      otp: {
        privateKey: './key/otp_private.key',
        publicKey: '../key/otp_public.key',
      },
      jwt: {
        publicKey: './key/jwt_public.key',
        privateKey: './key/jwt_private.key',
      },
    },
    template: {
      email: 'email_otp_verify',
      sms: 'otp_verify',
      firebase: 'otp_verify',
    },
  },
  topic: {
    notification: 'notification',
  },
  logger: {
    config: {
      appenders: {
        application: { type: 'console' },
        file: {
          type: 'file',
          filename: './../logs/otp/application.log',
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
