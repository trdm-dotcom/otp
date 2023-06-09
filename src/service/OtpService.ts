import IOtpRequest from '../model/request/IOtpRequest';
import IOtpResponse from '../model/response/IOtpResponse';
import IVerifyOtpRequest from '../model/request/IVerifyOtprRequest';
import config from '../Config';
import * as utils from '../utils/Utils';
import { v4 as uuidv4 } from 'uuid';
import { Inject, Service } from 'typedi';
import CacheService from './CacheService';
import IOtpVerify from '../model/redis/IOtpVerify';
import { Otp } from '../model/redis/Otp';
import IVerifyOtpResponse from '../model/response/IVerifyOtpResponse';
import { OtpIdType } from '../model/enum/OtpIdType';
import { OtpTxtType } from '../model/enum/OtpTxtType';
import { totp } from 'otplib';
import { Logger, Errors, Utils, Models } from 'common';
import * as moment from 'moment';
import Config from '../Config';
import { ObjectMapper } from 'jackson-js';
import Constants from '../Constants';
import { getInstance } from './KafkaProducerService';

@Service()
export default class OtpService {
  @Inject()
  private cacheService: CacheService;

  public async generateAndSendOtp(otpRequest: IOtpRequest, transactionId: string | number): Promise<IOtpResponse> {
    const now: Date = new Date();
    let invalidParams = new Errors.InvalidParameterError();
    Utils.validate(otpRequest.id, 'id').setRequire().throwValid(invalidParams);
    Utils.validate(otpRequest.idType, 'idType').setRequire().throwValid(invalidParams);
    Utils.validate(otpRequest.txtType, 'txtType').setRequire().throwValid(invalidParams);
    invalidParams.throwErr();
    if (!Object.values(OtpIdType).includes(otpRequest.idType)) {
      throw new Errors.GeneralError(Constants.INVALID_ID_TYPE);
    }
    if (!Object.values(OtpTxtType).includes(otpRequest.txtType)) {
      throw new Errors.GeneralError(Constants.INVALID_TYPE);
    }

    try {
      let otpVerify: IOtpVerify = await this.cacheService.findOtpValidation(otpRequest.id);
      otpVerify.failCount = otpVerify.failCount + 1;
      otpVerify.count = otpVerify.count + 1;
      if (moment(now).isBefore(Utils.addTime(otpVerify.latestRequest, config.app.otpMaxGenTime, 's'))) {
        throw new Errors.GeneralError(Constants.OTP_GENERATE_TO_FAST);
      }
      if (otpVerify.count >= config.app.otpMaxGenTime) {
        throw new Errors.GeneralError(Constants.OTP_LIMIT_GENERATE);
      }
      if (otpVerify.failCount >= config.app.otpFailRetryTimes) {
        if (moment(now).isBefore(Utils.addTime(otpVerify.latestRequest, config.app.otpTemporarilyLockedTime, 's'))) {
          throw new Errors.GeneralError(Constants.OTP_TEMPORARILY_LOCKED);
        }
        otpVerify.failCount = 1;
      }
      this.cacheService.addOtpValidation(otpRequest.id, otpVerify);
    } catch (err) {
      Logger.error(`${transactionId} generateAndSendOtp error ${err}`);
      if (err instanceof Errors.GeneralError) {
        if (err.code != Constants.OBJECT_NOT_FOUND) {
          throw err;
        }
        const otpVerify: IOtpVerify = {
          otpId: otpRequest.id,
          failCount: 0,
          count: 1,
          latestRequest: now,
        };
        Logger.info(`${transactionId} otpValidation Info: ${otpVerify}`);
        this.cacheService.addOtpValidation(otpRequest.id, otpVerify);
      } else {
        throw new Errors.GeneralError();
      }
    }
    const objectMapper: ObjectMapper = new ObjectMapper();
    const otpPrivateKey: Buffer = utils.getKey(config.app.key.otp.privateKey);
    const otpId: string = uuidv4();
    const otpLifeTime: number = config.app.otpLifeTime;
    let notificationMessage: Models.NotificationMessage = new Models.NotificationMessage();
    notificationMessage.setLocale(otpRequest.headers['accept-language']);
    switch (otpRequest.idType) {
      case OtpIdType.EMAIL: {
        notificationMessage.setMethod(Models.MethodEnum.EMAIL);
        const emailConfiguration: Models.EmailConfiguration = new Models.EmailConfiguration();
        emailConfiguration.setToList([otpRequest.id]);
        emailConfiguration.setSubject(Constants.SUBJECT[otpRequest.txtType][otpRequest.headers['accept-language']]);
        notificationMessage.setConfiguration(emailConfiguration, objectMapper);
        break;
      }
      case OtpIdType.SMS: {
        notificationMessage.setMethod(Models.MethodEnum.SMS);
        const smsConfiguration: Models.SmsConfiguration = new Models.SmsConfiguration();
        smsConfiguration.setPhoneNumber(otpRequest.id);
        notificationMessage.setConfiguration(smsConfiguration, objectMapper);
        break;
      }
      case OtpIdType.FIREBASE: {
        notificationMessage.setMethod(Models.MethodEnum.FIREBASE);
        const firebaseConfiguration: Models.FirebaseConfiguration = new Models.FirebaseConfiguration();
        firebaseConfiguration.setToken(otpRequest.id);
        notificationMessage.setConfiguration(firebaseConfiguration, objectMapper);
        break;
      }
    }
    totp.options = {
      digits: 6,
      step: otpLifeTime,
    };
    const otpValue: string = totp.generate(otpPrivateKey.toString());
    const otp: Otp = new Otp(otpId, otpValue, otpRequest.txtType, otpRequest.idType);
    const value: Object = this.valueTemplate(otpValue, otpRequest, otpLifeTime / 60);
    const key: string =
      Config.app.temmplate[otpRequest.headers['accept-language']][otpRequest.txtType.toLowerCase()][
        otpRequest.idType.toLowerCase()
      ];
    const template: Map<string, Object> = new Map<string, Object>([[key, value]]);
    notificationMessage.setTemplate(template);

    getInstance().sendMessage(transactionId.toString(), Config.topic.notification, '', notificationMessage);

    this.cacheService.addOtp(otpId, otp, otpLifeTime);
    const response: IOtpResponse = {
      otpId: otpId,
      expiredTime: Utils.addTime(now, otpLifeTime, 's'),
    };
    return response;
  }

  private valueTemplate(otpValue: string, otpRequest: IOtpRequest, expiredInMinute: number): Object {
    switch (otpRequest.idType) {
      case OtpIdType.EMAIL: {
        return {
          otp: otpValue,
          expiredInMinute: expiredInMinute,
        };
      }
      default: {
        return {
          content: otpValue,
        };
      }
    }
  }

  public async verifyOtp(
    verifyOtpRequest: IVerifyOtpRequest,
    transactionId: string | number
  ): Promise<IVerifyOtpResponse> {
    let now: Date = new Date();
    let invalidParams = new Errors.InvalidParameterError();
    Utils.validate(verifyOtpRequest.otpId, 'otpId').setRequire().throwValid(invalidParams);
    Utils.validate(verifyOtpRequest.otpValue, 'otpValue').setRequire().throwValid(invalidParams);
    invalidParams.throwErr();
    try {
      let redisOtp: Otp = await this.cacheService.findOtp(verifyOtpRequest.otpId);
      const otpLifeTime: number = config.app.otpLifeTime;
      let otpPrivateKey: Buffer = utils.getKey(config.app.key.otp.privateKey);
      totp.options = {
        digits: 6,
        step: otpLifeTime,
      };
      let result = totp.verify({ token: verifyOtpRequest.otpValue, secret: otpPrivateKey.toString() });
      if (!result) {
        throw new Errors.GeneralError(Constants.INCORRECT_OTP);
      }
      const otpVerifyTime = config.app.otpVerifyTime;
      let expiredTime: Date = Utils.addTime(now, otpVerifyTime, 's');
      let jwtPrivateKey: Buffer = utils.getKey(config.app.key.jwt.privateKey);
      let otpKey: string = await utils.generateToken(
        {
          txType: redisOtp.otpTxType,
          idType: redisOtp.otpIdType,
          id: redisOtp.id,
        },
        `${otpVerifyTime}s`,
        jwtPrivateKey
      );
      let response: IVerifyOtpResponse = {
        otpKey: otpKey,
        expiredTime: expiredTime,
      };
      this.cacheService.removeVerifiedOtp(verifyOtpRequest.otpId);
      this.cacheService.addOtpKey(redisOtp.id, redisOtp, otpLifeTime);
      return response;
    } catch (err) {
      Logger.error(`${transactionId} verifyOtp error ${err.message}`);
      if (err instanceof Errors.GeneralError) {
        throw err;
      } else {
        throw new Errors.GeneralError();
      }
    }
  }
}
