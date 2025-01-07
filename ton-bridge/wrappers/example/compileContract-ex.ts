import {conf } from "../testData/bridge.compile.func"
let filePath = "../testData/bridge.compiled.json";
import {doCompile} from "../utils/compileContract";

(async function main() {
    let ret = await doCompile(conf,filePath);
    if(ret){
        console.log(ret);
    }
})()