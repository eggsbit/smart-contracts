import { toNano } from '@ton/core';
import { EggsHatchery } from '../wrappers/EggsHatchery';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const eggsHatchery = provider.open(await EggsHatchery.fromInit());

    await eggsHatchery.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        }
    );

    await provider.waitForDeploy(eggsHatchery.address);

    // run methods on `eggsHatchery`
}
