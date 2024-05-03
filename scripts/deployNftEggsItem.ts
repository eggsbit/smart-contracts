import { toNano } from '@ton/core';
import { NftEggsItem } from '../wrappers/NftEggsItem';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const nftEggsItem = provider.open(await NftEggsItem.fromInit());

    await nftEggsItem.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        }
    );

    await provider.waitForDeploy(nftEggsItem.address);

    // run methods on `nftEggsItem`
}
