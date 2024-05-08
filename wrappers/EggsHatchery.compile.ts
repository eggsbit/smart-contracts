import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    lang: 'tact',
    target: 'contracts/eggs_hatchery.tact',
    options: {
        debug: true
    }
};
