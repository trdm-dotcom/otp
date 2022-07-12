import { createLogger, transports, format } from 'winston';
// import DailyRotateFile from 'winston-daily-rotate-file';

export const logger = createLogger({
    transports: [
        new transports.Console({
            format: format.combine(
                format.colorize(),
                format.timestamp(),
                format.printf(({ timestamp, level, message, service }) => {
                    return `[${timestamp}] ${service} ${level}: ${message}}`;
                })
            ),
        }),
        // new DailyRotateFile({
        //     dirname: '../log/otp',
        //     filename: 'application-otp-%DATE%.log',
        //     datePattern: 'YYYY-MM-DD',
        //     zippedArchive: true,
        //     maxSize: '20m',
        //     maxFiles: '14d',
        // }),
    ],
});
