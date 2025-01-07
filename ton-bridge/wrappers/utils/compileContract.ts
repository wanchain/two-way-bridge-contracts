import {compileFunc, compilerVersion, CompilerConfig, CompilerVersion} from '@ton-community/func-js';
import {Cell} from '@ton/core';
import fs_1 from "fs";

import {logger} from '../utils/logger'
const formatUtil = require('util');

export interface CR {
    version:CompilerVersion,
    hashHex:string,
    codeBase64:string,
}
export async function compileContract(conf: CompilerConfig) {
    // You can get compiler version
    let version = await compilerVersion();

    let result = await compileFunc(conf);

    if (result.status === 'error') {
        console.error(result.message)
        return;
    }

    let codeCell = Cell.fromBoc(Buffer.from(result.codeBoc, "base64"))[0];
    logger.info(formatUtil.format("hash=>",codeCell.hash().toString('hex')));
    let cr:CR = {
        version,
        hashHex:codeCell.hash().toString('hex'),
        codeBase64: result.codeBoc,
    }
    return cr;
}

export function writeCR(filePath:string,cr:CR){
    return fs_1.writeFileSync(filePath,JSON.stringify(cr));
}

export async function doCompile(conf:CompilerConfig,resultFilePath:string){
    let ret = await compileContract(conf);
    //logger.info(formatUtil.format(ret?.toBoc().toString('base64'));

    logger.info(formatUtil.format(resultFilePath));
    writeCR(resultFilePath,ret);
    let cr:CR = JSON.parse(fs_1.readFileSync(resultFilePath,'utf-8'));
    let codeCell = Cell.fromBoc(Buffer.from(cr.codeBase64, "base64"))[0];
    return codeCell.hash().toString('hex') == cr.hashHex && cr.hashHex == ret?.hashHex;
}