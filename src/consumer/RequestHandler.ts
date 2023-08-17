import { Inject, Service } from 'typedi';
import OtpService from '../service/OtpService';
import { Errors, Logger } from 'common';
import config from '../Config';
import { Kafka } from 'kafka-common';
import { getInstance } from '../service/KafkaProducerService';

const { UriNotFound } = Errors;

@Service()
export default class RequestHandler {
  @Inject()
  private otpService: OtpService;

  public init() {
    const handle: Kafka.KafkaRequestHandler = new Kafka.KafkaRequestHandler(getInstance());
    new Kafka.KafkaConsumer(config).startConsumer([config.clusterId], (message: Kafka.MessageSetEntry) =>
      handle.handle(message, this.handleRequest)
    );
  }

  private handleRequest: Kafka.Handle = (message: Kafka.IMessage) => {
    Logger.info(`Endpoint received message: ${JSON.stringify(message)}`);
    if (message == null || message.data == null) {
      return Promise.reject(new Errors.SystemError());
    } else {
      switch (message.uri) {
        case 'post:/api/v1/otp':
          return this.otpService.generateAndSendOtp(message.data, message.transactionId);
        case 'post:/api/v1/otp/verify':
          return this.otpService.verifyOtp(message.data, message.transactionId);
        default:
          throw new UriNotFound();
      }
    }
  };
}
