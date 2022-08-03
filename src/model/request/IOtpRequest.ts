import { IDataRequest } from "common/build/src/modules/models";
import { OtpIdType } from "../enum/OtpIdType";
import { OtpTxtType } from "../enum/OtpTxtType";

export default interface IOtpRequest extends IDataRequest{
    id?: string;
    idType?: OtpIdType;
    txtType?: OtpTxtType;
}