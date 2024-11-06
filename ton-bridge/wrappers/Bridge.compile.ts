import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    lang: 'func',
    targets: [
        'contracts/bridge.fc',
        'contracts/tokenManager.fc',
        'contracts/extend.fc',
        'contracts/fee.fc',
        'contracts/oracle.fc'
    ],
};
