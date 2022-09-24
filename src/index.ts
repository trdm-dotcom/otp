import 'reflect-metadata';
import config from './Config';
import RedisService from './service/RedisService';
import RequestHandler from './consumer/RequestHandler';
import { Logger, Kafka } from 'common';
import { Container } from 'typedi';

Logger.create(config.logger.config, true);
Logger.info('Starting...');

async function init() {
    Logger.info('run service otp');
    const redisService = await Container.get(RedisService);
    await redisService.init();
    await Kafka.create(
        config,
        true,
        null,
        {
            serviceName: config.clusterId,
            nodeId: config.nodeId,
        },
        config.kafkaProducerOptions,
        {},
        config.kafkaConsumerOptions,
        {}
    );
    const requestHandler = await Container.get(RequestHandler);
    await requestHandler.init();
}

init().catch((error: any) => {
    Logger.error(error);
    process.exit(1);
});
