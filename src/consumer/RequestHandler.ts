import { Inject, Service } from 'typedi';
import OtpService from '../service/OtpService';
import { Errors, Kafka } from 'common';
import Config from '../Config';

@Service()
export default class RequestHandler {
    @Inject()
    private otpService: OtpService;

    public init() {
        const handle: Kafka.MessageHandler = new Kafka.MessageHandler();
        new Kafka.ConsumerHandler(
            Config,
            Config.kafkaConsumerOptions,
            Config.requestHandlerTopics,
            (message: any) => handle.handle(message, this.handleRequest),
            Config.kafkaTopicOptions
        );
    }

    private handleRequest: Kafka.Handle = (message: Kafka.IMessage) => {
        if (message == null || message.data == null) {
            return Promise.reject(new Errors.SystemError());
        } else {
            switch (message.uri) {
                case 'post:/api/v1/otp':
                    return this.otpService.generateAndSendOtp(message.data);
                case 'post:/api/v1/otp/verify':
                    return this.otpService.verifyOtp(message.data);
            }
        }
        return false;
    };
}
