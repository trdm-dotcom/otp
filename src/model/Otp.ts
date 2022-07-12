import { OtpTxtType } from './enum/OtpTxtType';
import { OtpIdType } from './enum/OtpIdType';

export class Otp {
    id: string;
    value: string;
    count: number;
    lastCall: Date;
    failCount: number;
    otpTxType: OtpTxtType;
    otpIdType: OtpIdType;
    email: string;

    constructor(id: string, value: string, otpTxType: OtpTxtType, otpId: OtpIdType) {
        this.id = id;
        this.value = value;
        this.otpTxType = otpTxType;
        this.otpIdType = this.otpIdType;
    }
}
