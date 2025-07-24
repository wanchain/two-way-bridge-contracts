import {CompilerConfig} from '@ton-community/func-js';
import fs_1 from "fs";

export const conf: CompilerConfig = {
    targets: [
        '../../../contracts/bigData.fc'
    ],
    sources: (path) => (0, fs_1.readFileSync)(path).toString(),
};
