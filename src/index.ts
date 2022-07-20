import 'reflect-metadata';
import Config from './Config';
import RedisService from './service/RedisService';
import RequestHandler from './consumer/RequestHandler';
import { Logger, Kafka } from 'common';
import { Container } from 'typedi';

Logger.create(Config.logger.config, true);
Logger.info('Starting...');

async function init() {
    Logger.info('run service otp');
    const redisService = Container.get(RedisService);
    redisService.init();
    const topicConf = {
        ...Config.kafkaTopicOptions,
        'auto.offset.reset': 'earliest',
    };
    Kafka.create(Config, Config.kafkaConsumerOptions, true, topicConf, Config.kafkaProducerOptions);
    Kafka.createService(Kafka.getInstance(), {
        serviceName: Config.clusterId,
        nodeId: Config.nodeId,
        listeningTopic: Config.clusterId,
    });
    const requestHandler = Container.get(RequestHandler);
    requestHandler.init();
}

init()
    .then()
    .catch((error: any) => {
        Logger.error(error);
        process.exit(1);
    });
