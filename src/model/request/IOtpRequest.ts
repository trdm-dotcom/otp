import { OtpIdType } from "../enum/OtpIdType";
import { OtpTxtType } from "../enum/OtpTxtType";

export default interface IOtpRequest{
    id?: string;
    idType?: OtpIdType;
    txtType?: OtpTxtType;
}