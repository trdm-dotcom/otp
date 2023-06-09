import 'reflect-metadata';
import config from './Config';
import RequestHandler from './consumer/RequestHandler';
import { Logger } from 'common';
import { Container } from 'typedi';
import RedisService from './service/RedisService';
import { initKafka } from './service/KafkaProducerService';

Logger.create(config.logger.config, true);
Logger.info('Starting...');

async function run() {
  Logger.info('run service otp');
  initKafka();
  Container.get(RequestHandler).init();
  Container.get(RedisService).init();
}

run().catch((error) => {
  Logger.error(error);
  process.exit(1);
});
