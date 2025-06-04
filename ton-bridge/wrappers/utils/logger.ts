import winston from "winston";
import DailyRotateFile from 'winston-daily-rotate-file';
import {bigIntReplacer} from "./utils";
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
        try {
            this.logger.debug(concatMsg(params));
        } catch (err) {
            this.error(err);
        }
    }

    info(...params) {
        try {
            this.logger.info(concatMsg(params));
        } catch (err) {
            this.error(err);
        }
    }

    warn(...params) {
        try {
            this.logger.warning(concatMsg(params));
        } catch (err) {
            this.error(err);
        }
    }

    error(...params) {
        try {
            this.logger.error(concatMsg(params));
        } catch (err) {
            logger.info(err);
        }
    }
}


function concatMsg(params: any[]): string {
    let msgFull = "";
    try {
        // Process each element safely
        const stringParts = params.map((elem) => {
            if (elem instanceof Array) {
                let stringObjects = elem.map(item => {
                    if(item instanceof Object) {
                        return JSON.stringify(item, (_, value) => {
                            if (typeof value === 'bigint') {
                                return value.toString(); // Convert BigInt to string
                            }
                            return value;
                        }, 2)
                    }else{
                        return String(elem);
                    }
                })
                return stringObjects.join(' ');
            } else {
                // Handle primitives (including BigInt, symbol, etc.)
                return String(elem);
            }
        });
        // Join processed parts with spaces
        msgFull = stringParts.join(' ');
    } catch (err) {
        // Fallback: join original elements with spaces
        msgFull = params.join(' ');
    }
    return msgFull;
}

const LOG_ROOT = path.join(__dirname,"../log/")
export const logger = new Logger("wan-ton-sdk", path.join(LOG_ROOT,'wan-ton-sdk.out'),path.join(LOG_ROOT,'wan-ton-sdk.err'), global.SDK_LOG_LEVEL);
