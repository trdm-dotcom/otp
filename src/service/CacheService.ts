import { Inject, Service } from 'typedi';
import RedisService, { REDIS_KEY } from './RedisService';
import IOtpVerify from '../model/IOtpVerify';
import { Otp } from '../model/Otp';
import * as constants from '../Constants';
import { Errors, Utils } from 'common';

@Service()
export default class CacheService {
    @Inject()
    private readonly redisService: RedisService;

    public async findOtpValidation(key: string): Promise<IOtpVerify> {
        let date: Date = new Date();
        let realKey: string = `${REDIS_KEY.OTP_VALIDATE}_${key}_${Utils.formatDateToDisplay(
            Utils.addTime(date, 7, 'h')
        )}`;
        let data: IOtpVerify = await this.redisService.get<IOtpVerify>(realKey);
        if (data) {
            return data;
        } else {
            throw new Errors.GeneralError(constants.OBJECT_NOT_FOUND);
        }
    }

    public addOtpValidation(key: string, otpVerify: IOtpVerify): void {
        let date: Date = new Date();
        let lifeTime = 60 * 60 * 24;
        let realKey: string = `${REDIS_KEY.OTP_VALIDATE}_${key}_${Utils.formatDateToDisplay(
            Utils.addTime(date, 7, 'h')
        )}`;
        this.redisService.set<IOtpVerify>(realKey, otpVerify, { EX: lifeTime });
    }

    public async findOtp(key: string): Promise<Otp> {
        let realKey: string = `${REDIS_KEY.OTP_STOGE}_${key}`;
        let data: Otp = await this.redisService.get<Otp>(realKey);
        if (data) {
            return data;
        } else {
            throw new Errors.GeneralError(constants.OTP_ID_INVALID);
        }
    }

    public addOtp(key: string, otp: Otp, otpLifeTime: number): void {
        let realKey: string = `${REDIS_KEY.OTP_STOGE}_${key}`;
        this.redisService.set<Otp>(realKey, otp, { EX: otpLifeTime });
    }

    public addOtpKey(key: string, otp: Otp, otpExpiredTime: number): void {
        let realKey: string = `${REDIS_KEY.OTP_KEY_STOGE}_${key}`;
        this.redisService.set<Otp>(realKey, otp, { EX: otpExpiredTime });
    }

    public removeVerifiedOtp(key: string) {
        let realKey: string = `${REDIS_KEY.OTP_STOGE}_${key}`;
        this.redisService.set<any>(realKey, '', { PX: 1 });
    }
}
