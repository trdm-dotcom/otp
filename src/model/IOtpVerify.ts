export default interface IOtpVerify {
    username?: string;
    otpId?: string;
    otpValue?: string;
    action?: string;
    expiredInMinute?: number;
    count?: number;
    failCount?: number;
    latestRequest?: Date;
    template?: string;
    otp?: string;
}
