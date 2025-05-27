import winston from "winston";
import DailyRotateFile from 'winston-daily-rotate-file';
const moment = require('moment');
const path = require('path');


const customFormat = winston.format.printf(({ level, message, timestamp}) => {
    return `${timestamp} [${level}]: ${message}`;
});

export class Logger {
    private filePath: any;
    private errorFilePath: string;
    private level: string;
    private errorFile: any;
    private file: any;
    private name: any;
    private logger: any;

    constructor(name, file, errorFile, level = 'info') {
        this.name = name;
        this.file = file;
        this.errorFile = errorFile;
        this.level = level ? level : 'info';
        if (global.pkg) {
            this.filePath = path.join(process.cwd(), file);
            this.errorFilePath = path.join(process.cwd(), errorFile);
        } else {
            this.filePath = file;
            this.errorFilePath = errorFile;
        }

        this.init(this.name, this.file, this.errorFile, this.level);
    }

    init(name, file, errorFile, level) {
        this.logger = winston.createLogger({
            levels: winston.config.syslog.levels,
            level: level,
            format: winston.format.combine(
                winston.format.timestamp(),
                customFormat
            ),
            transports: [
                //
                // - Write to all logs with level `level` and below to file
                // - Write all logs error (and below) to errorFile.
                //


                // new winston.transports.Console({
                //     handleExceptions: true
                // }),

                new (DailyRotateFile)({
                    filename: this.filePath,
                    level: level,
                    datePattern: 'YYYY-MM-DD',
                    zippedArchive: true,
                    maxSize: '50m',
                    maxFiles: (global.testnet || global.isLeader) ? '30d' : '10d'
                })
            ],
            exitOnError: false
        });
    }

    debug(...params) {
        let msgFull = params.join(" ")
        try {
            this.logger.debug(msgFull);
        } catch (err) {
            this.error(err);
        }
    }

    info(...params) {
        let msgFull = params.join(" ")
        try {
            this.logger.info(msgFull);
        } catch (err) {
            this.error(err);
        }
    }

    warn(...params) {
        let msgFull = params.join(" ")
        try {
            this.logger.warning(msgFull);
        } catch (err) {
            this.error(err);
        }
    }

    error(...params) {
        let msgFull = params.join(" ")
        try {
            this.logger.error(msgFull);
        } catch (err) {
            console.log(err);
        }
    }
}

const LOG_ROOT = path.join(__dirname,"../log/")
export const logger = new Logger("wan-ton-sdk", path.join(LOG_ROOT,'wan-ton-sdk.out'),path.join(LOG_ROOT,'wan-ton-sdk.err'), global.SDK_LOG_LEVEL);
