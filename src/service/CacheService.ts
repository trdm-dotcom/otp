import { Inject, Service } from 'typedi';
import RedisService, { REDIS_KEY } from './RedisService';
import IOtpVerify from '../model/redis/IOtpVerify';
import { Otp } from '../model/redis/Otp';
import { Errors, Utils } from 'common';
import Constants from '../Constants';

@Service()
export default class CacheService {
  @Inject()
  private readonly redisService: RedisService;

  public async findOtpValidation(key: string): Promise<IOtpVerify> {
    let realKey: string = `${REDIS_KEY.OTP_VALIDATE}_${key}_${Utils.formatDateToDisplay(
      Utils.addTime(new Date(), 7, 'h')
    )}`;
    let data: IOtpVerify = (await this.redisService.get(realKey)) as IOtpVerify;
    if (data) {
      return data;
    } else {
      throw new Errors.GeneralError(Constants.OBJECT_NOT_FOUND);
    }
  }

  public addOtpValidation(key: string, otpVerify: IOtpVerify): void {
    let lifeTime = 60 * 60 * 24;
    let realKey: string = `${REDIS_KEY.OTP_VALIDATE}_${key}_${Utils.formatDateToDisplay(
      Utils.addTime(new Date(), 7, 'h')
    )}`;
    this.redisService.set(realKey, otpVerify, { EX: lifeTime });
  }

  public async findOtp(key: string): Promise<Otp> {
    let realKey: string = `${REDIS_KEY.OTP_STORAGE}_${key}`;
    let data: Otp = (await this.redisService.get(realKey)) as Otp;
    if (data) {
      return data;
    } else {
      throw new Errors.GeneralError(Constants.OTP_ID_INVALID);
    }
  }

  public addOtp(key: string, otp: Otp, otpLifeTime: number): void {
    let realKey: string = `${REDIS_KEY.OTP_STORAGE}_${key}`;
    this.redisService.set(realKey, otp, { EX: otpLifeTime });
  }

  public addOtpKey(key: string, otp: Otp, otpExpiredTime: number): void {
    let realKey: string = `${REDIS_KEY.OTP_KEY_STORAGE}_${key}`;
    this.redisService.set(realKey, otp, { EX: otpExpiredTime });
  }

  public removeVerifiedOtp(key: string) {
    let realKey: string = `${REDIS_KEY.OTP_STORAGE}_${key}`;
    this.redisService.del(realKey);
  }
}
