import { toNano, beginCell, Address } from '@ton/core';
import { NftEggsCollection } from '../wrappers/NftEggsCollection';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const OFFCHAIN_CONTENT_PREFIX = 0x01;
    const collection_content_string = 'https://meta.test.eggsbit.io/meta/eggsbit/';
    const collection_content = beginCell().storeInt(OFFCHAIN_CONTENT_PREFIX, 8).storeStringRefTail(collection_content_string).endCell();

    const owner_address = Address.parse('kQAmXkUg7MUNbrHm3dpVqV8BTeD-mZpph_-LPf9ezhqeEl1k');
    const bank_address = Address.parse('kQBYb8LrKa9YlDjZ7gqaY9px9wjACsDXW1e3rNu9wLGT3OOw');

    const nftEggsCollection = provider.open(await NftEggsCollection.fromInit(
        101n,
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

    // run methods on `nftEggsCollection`
    console.log('NftEggsCollection address: ' + nftEggsCollection.address.toString());

    // Deploy Hatchery Builder
    await nftEggsCollection.send(
        provider.sender(),
        {
            value: toNano('0.2'),
        },
        'CreateHatcherBuilder'
    );

    await provider.waitForDeploy(await nftEggsCollection.getGetHatcheryBuilderAddress(), 40);

    console.log('Hatcgery buider address: ' + (await nftEggsCollection.getGetHatcheryBuilderAddress()).toString());
}
