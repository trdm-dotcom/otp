import IOtpRequest from '../model/request/IOtpRequest';
import IOtpResponse from '../model/response/IOtpResponse';
import IVerifyOtpRequest from '../model/request/IVerifyOtprRequest';
import config from '../Config';
import * as utils from '../utils/Utils';
import { v4 as uuidv4 } from 'uuid';
import * as constants from '../Constants';
import { Inject, Service } from 'typedi';
import CacheService from './CacheService';
import IOtpVerify from '../model/IOtpVerify';
import { Otp } from '../model/Otp';
import IVerifyOtpResponse from '../model/response/IVerifyOtpResponse';
import { OtpIdType } from '../model/enum/OtpIdType';
import { OtpTxtType } from '../model/enum/OtpTxtType';
import { totp } from 'otplib';
import { Logger, Errors, Utils } from 'common';
import moment from 'moment';

@Service()
export default class OtpService {
    @Inject()
    private cacheService: CacheService;

    public async generateAndSendOtp(otpRequest: IOtpRequest): Promise<IOtpResponse> {
        const now: Date = new Date();
        const invalidParams = new Errors.InvalidParameterError();
        Utils.validate(otpRequest.id, 'id').setRequire().throwValid(invalidParams);
        Utils.validate(otpRequest.idType, 'idType').setRequire().throwValid(invalidParams);
        Utils.validate(otpRequest.txtType, 'txtType').setRequire().throwValid(invalidParams);
        invalidParams.throwErr();
        if (!Object.values(OtpIdType).includes(otpRequest.idType)) {
            throw new Errors.GeneralError(constants.INVALID_ID_TYPE);
        }
        if (!Object.values(OtpTxtType).includes(otpRequest.txtType)) {
            throw new Errors.GeneralError(constants.INVALID_TYPE);
        }

        let otpId: string = uuidv4();
        let otpLifeTime: number = 0;
        switch (otpRequest.idType) {
            case OtpIdType.EMAIL:
                otpLifeTime = config.app.otpLifeTime.email;
                break;
            case OtpIdType.SMS:
                otpLifeTime = config.app.otpLifeTime.sms;
                break;
            default:
                otpLifeTime = config.app.otpLifeTime.email;
        }

        try {
            let otpVerify: IOtpVerify = await this.cacheService.findOtpValidation(otpRequest.id);
            otpVerify.failCount = otpVerify.failCount + 1;
            otpVerify.count = otpVerify.count + 1;
            if (moment(now).isBefore(Utils.addTime(otpVerify.latestRequest, config.app.otpMaxGenTime, 's'))) {
                throw new Errors.GeneralError(constants.OTP_GENERATE_TO_FAST);
            }
            if (otpVerify.count >= config.app.otpMaxGenTime) {
                throw new Errors.GeneralError(constants.OTP_LIMIT_GENERATE);
            }
            if (otpVerify.failCount >= config.app.otpFailRetryTimes) {
                if (
                    moment(now).isBefore(
                        Utils.addTime(otpVerify.latestRequest, config.app.otpTemporarilyLockedTime, 's')
                    )
                ) {
                    throw new Errors.GeneralError(constants.OTP_TEMPORARILY_LOCKED);
                }
                otpVerify.failCount = 1;
            }
            this.cacheService.addOtpValidation(otpRequest.id, otpVerify);
        } catch (err: any) {
            Logger.error(`generateAndSendOtp error ${err}`);
            if (err.code !== constants.OBJECT_NOT_FOUND) {
                throw new Errors.GeneralError(err.message);
            }
            let otpVerify: IOtpVerify = {
                otpId: otpRequest.id,
                failCount: 0,
                count: 1,
                latestRequest: new Date(now),
            };
            Logger.info('otpValidation Info: {}', otpVerify);
            this.cacheService.addOtpValidation(otpRequest.id, otpVerify);
        }
        let otpPrivateKey: Buffer = utils.getKey(config.app.key.otp.privateKey);
        totp.options = {
            digits: 6,
            step: otpLifeTime,
        };
        let otpValue = totp.generate(otpPrivateKey.toString());
        let expiredTime = Utils.addTime(now, otpLifeTime, 's');
        let verification: Otp = new Otp(otpId, otpValue, OtpTxtType[otpRequest.txtType], OtpIdType[otpRequest.idType]);
        this.cacheService.addOtp(otpId, verification, otpLifeTime);
        let response: IOtpResponse = {
            otpId: otpId,
            expiredTime: new Date(expiredTime),
        };
        return response;
    }

    public async verifyOtp(verifyOtpRequest: IVerifyOtpRequest): Promise<IVerifyOtpResponse> {
        let now: Date = new Date();
        const invalidParams = new Errors.InvalidParameterError();
        Utils.validate(verifyOtpRequest.otpId, 'otpId').setRequire().throwValid(invalidParams);
        Utils.validate(verifyOtpRequest.otpValue, 'otpValue').setRequire().throwValid(invalidParams);
        invalidParams.throwErr();
        try {
            let redisOtp: Otp = await this.cacheService.findOtp(verifyOtpRequest.otpId);
            let otpLifeTime: number = 0;
            switch (redisOtp.otpIdType) {
                case OtpIdType.EMAIL:
                    otpLifeTime = config.app.otpLifeTime.email;
                    break;
                case OtpIdType.SMS:
                    otpLifeTime = config.app.otpLifeTime.sms;
                    break;
                default:
                    otpLifeTime = config.app.otpLifeTime.email;
                    break;
            }

            let otpPrivateKey: Buffer = utils.getKey(config.app.key.otp.privateKey);
            totp.options = {
                digits: 6,
                step: otpLifeTime,
            };
            let result = totp.verify({ token: verifyOtpRequest.otpValue, secret: otpPrivateKey.toString() });
            if (!result) {
                throw new Errors.GeneralError(constants.INCORRECT_OTP);
            }
            otpLifeTime = config.app.otpVerifyTime;
            let expiredTime: Date = Utils.addTime(now, otpLifeTime, 's');
            let jwtPrivateKey: Buffer = utils.getKey(config.app.key.jwt.privateKey);
            let otpKey: string = await utils.generateToken(
                {
                    txType: redisOtp.otpTxType,
                    idType: redisOtp.otpIdType,
                    id: redisOtp.id,
                },
                `${otpLifeTime}s`,
                jwtPrivateKey
            );
            let response: IVerifyOtpResponse = {
                otpKey: otpKey,
                expiredTime: expiredTime,
            };
            await this.cacheService.removeVerifiedOtp(verifyOtpRequest.otpId);
            this.cacheService.addOtpKey(otpKey, redisOtp, otpLifeTime);
            return response;
        } catch (err: any) {
            Logger.error(`verifyOtp error ${err.message}`);
            throw new Errors.GeneralError(err.message);
        }
    }
}
