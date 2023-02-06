import 'reflect-metadata';
import config from './Config';
import RequestHandler from './consumer/RequestHandler';
import { Logger, Kafka } from 'common';
import { Container } from 'typedi';
import RedisService from './service/RedisService';

Logger.create(config.logger.config, true);
Logger.info('Starting...');

function init() {
    try {
        Logger.info('run service otp');
        Kafka.create(
            config,
            true,
            null,
            {
                serviceName: config.clusterId,
                nodeId: config.clientId,
            },
            config.kafkaProducerOptions,
            {},
            config.kafkaConsumerOptions,
            {}
        );
        Promise.all([
            new Promise((resolve: (value: unknown) => void, reject: (reason?: any) => void) => {
                Container.get(RequestHandler).init()
                resolve(`init container RequestHandler`);
            }),
            new Promise((resolve: (value: unknown) => void, reject: (reason?: any) => void) => {
                Container.get(RedisService).init()
                resolve(`init container RedisService`);
            }),
        ]);
    } catch (error) {
        Logger.error(error);
        process.exit(1);
    }
}

init();