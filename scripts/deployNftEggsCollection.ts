import { toNano, beginCell, Address } from '@ton/core';
import { NftEggsCollection } from '../wrappers/NftEggsCollection';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const OFFCHAIN_CONTENT_PREFIX = 0x01;
    const string_first = 'https://gateway.pinata.cloud/ipfs/QmVWMeEni343TqrNRCkn6nNgKtnpx3HoAJkW7UGVm3G6aE/';
    const collection_content = beginCell().storeInt(OFFCHAIN_CONTENT_PREFIX, 8).storeStringRefTail(string_first).endCell();

    const owner_address = Address.parse('0QAmXkUg7MUNbrHm3dpVqV8BTeD-mZpph_-LPf9ezhqeEgCh');
    const bank_address = Address.parse('0QBYb8LrKa9YlDjZ7gqaY9px9wjACsDXW1e3rNu9wLGT3L51');

    const nftEggsCollection = provider.open(await NftEggsCollection.fromInit(
        owner_address,
        bank_address,
        collection_content,
        {
            $$type: "RoyaltyParams",
            numerator: 200n, // 20%
            denominator: 1000n,
            destination: bank_address
        }
    ));

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
    console.log('nftEggsCollection address: ' + nftEggsCollection.address.toString());

    // Deploy Hatchery Builder
    await nftEggsCollection.send(
        provider.sender(),
        {
            value: toNano('0.1'),
        },
        'CreateHatcherBuilder'
    );

    await provider.waitForDeploy(await nftEggsCollection.getGetHatcheryBuilderAddress());

    console.log('hatcgery buider address: ' + (await nftEggsCollection.getGetHatcheryBuilderAddress()).toString());
}
