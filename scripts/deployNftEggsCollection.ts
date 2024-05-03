import { toNano } from '@ton/core';
import { NftEggsCollection } from '../wrappers/NftEggsCollection';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const nftEggsCollection = provider.open(await NftEggsCollection.fromInit());

    await nftEggsCollection.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        }
    );

    await provider.waitForDeploy(nftEggsCollection.address);

    // run methods on `nftEggsCollection`
}
