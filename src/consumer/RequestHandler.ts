import { Inject, Service } from 'typedi';
import OtpService from '../service/OtpService';
import { Errors, Kafka, Logger } from 'common';
import config from '../Config';

@Service()
export default class RequestHandler {
    @Inject()
    private otpService: OtpService;

    public init() {
        const handle: Kafka.KafkaRequestHandler = new Kafka.KafkaRequestHandler(Kafka.getInstance());
        Kafka.createConsumer(
            config,
            config.kafkaConsumerOptions,
            config.requestHandlerTopics,
            (message: Kafka.IKafkaMessage) => handle.handle(message, this.handleRequest),
            config.kafkaTopicOptions
        );
    }

    private handleRequest: Kafka.Handle = (message: Kafka.IMessage) => {
        if (message == null || message.data == null) {
            return Promise.reject(new Errors.SystemError());
        } else {
            Logger.info('Endpoint received message: ', message);
            switch (message.uri) {
                case 'post:/api/v1/otp':
                    return this.otpService.generateAndSendOtp(message.data);
                case 'post:/api/v1/otp/verify':
                    return this.otpService.verifyOtp(message.data);
            }
            return false;
        }
    };
}
