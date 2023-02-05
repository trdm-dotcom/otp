import 'reflect-metadata';
import config from './Config';
import RequestHandler from './consumer/RequestHandler';
import { Logger, Kafka } from 'common';
import { Container } from 'typedi';

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
        Container.get(RequestHandler).init();
    } catch (error) {
        Logger.error(error);
        process.exit(1);
    }
}

init();