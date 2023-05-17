import { Utils } from 'common';
import { v4 as uuid } from 'uuid';

const nodeId = uuid();

let Config = {
  clusterId: 'otp',
  clientId: `otp-${nodeId}`,
  nodeId: nodeId,
  kafkaUrls: Utils.getEnvArr('ENV_KAFKA_URLS', ['localhost:9092']),
  kafkaCommonOptions: {},
  kafkaConsumerOptions: {},
  kafkaProducerOptions: {},
  kafkaTopicOptions: {},
  requestHandlerTopics: [],
  redis: {
    url: `redis://${Utils.getEnvStr('ENV_REDIS_HOST', 'localhost')}:${Utils.getEnvStr('ENV_REDIS_PORT', '6379')}`,
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
        privateKey: './../external/key/otp_private.key',
        publicKey: './../external/key/otp_public.key',
      },
      jwt: {
        publicKey: './../external/key/jwt_public.key',
        privateKey: './../external/key/jwt_private.key',
      },
    },
    temmplate: {
      vi: {
        reset_password: {
          email: 'reset_password_vi',
          sms: 'push_up',
          firebase: 'push_up',
        },
        verify: {
          email: 'email_otp_verify_vi',
          sms: 'push_up',
          firebase: 'push_up',
        },
      },
      en: {
        reset_password: {
          email: 'reset_password_en',
          sms: 'push_up',
        },
        verify: {
          email: 'email_otp_verify_en',
          sms: 'push_up',
        },
      },
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
