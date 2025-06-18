import {CompilerConfig} from '@ton-community/func-js';
import fs_1 from "fs";
export const conf: CompilerConfig = {
    targets: [
        '../../../contracts/jetton/jetton-minter.func'
    ],
    sources: (path) => (0, fs_1.readFileSync)(path).toString(),
};
