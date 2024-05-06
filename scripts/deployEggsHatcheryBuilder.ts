import { toNano } from '@ton/core';
import { EggsHatcheryBuilder } from '../wrappers/EggsHatcheryBuilder';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const eggsHatcheryBuilder = provider.open(await EggsHatcheryBuilder.fromInit());

    await eggsHatcheryBuilder.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        }
    );

    await provider.waitForDeploy(eggsHatcheryBuilder.address);

    // run methods on `eggsHatcheryBuilder`
}
