import { toNano, beginCell, Address, internal, storeMessageRelaxed } from '@ton/core';
import { NftEggsCollection } from '../wrappers/NftEggsCollection';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const collection_address = Address.parse('EQDKWGjRnS_wGsJzBnwfJ24YWX-_V4zYc-ch5_ZmPiMAgdX6');
    const nftEggsCollection = provider.open(await NftEggsCollection.fromAddress(collection_address));

    const collectionDataBefore = await nftEggsCollection.getGetCollectionData();
    console.log(collectionDataBefore);

    // const collection_content_string = 'https://zervan.xyz/nft/';
    // const collection_content = beginCell().storeUint(1, 8).storeStringRefTail(collection_content_string).endCell();

    // const collection_indivudial_content_string = 'collection.json';
    // const collection_indivudial_content = beginCell().storeStringRefTail(collection_indivudial_content_string).endCell();

    const OFFCHAIN_CONTENT_PREFIX = 0x01;
    const collection_content_string = 'https://zervan.xyz/nft/';
    const collection_content = beginCell().storeInt(OFFCHAIN_CONTENT_PREFIX, 8).storeStringRefTail(collection_content_string).endCell();
    const collection_indivudial_content_string = 'collection.json';
    const collection_indivudial_content = beginCell().storeStringRefTail(collection_indivudial_content_string).endCell();

    await nftEggsCollection.send(
        provider.sender(),
        {
            value: toNano('0.2'),
        },
        {
            $$type: 'UpdateContent',
            query_id: 0n,
            content: collection_content,
        }
    );

    // await nftEggsCollection.send(
    //     provider.sender(),
    //     {
    //         value: toNano('0.1'),
    //     },
    //     {
    //         $$type: 'UpdateIndividualContent',
    //         query_id: 0n,
    //         individual_content: collection_indivudial_content,
    //     }
    // );

    // await provider.waitForDeploy(collection_address, 40);

    // const collectionDataAfter = await nftEggsCollection.getGetCollectionData();
    // console.log(collectionDataAfter);

    // const collectionAddress = Address.parse('EQDKWGjRnS_wGsJzBnwfJ24YWX-_V4zYc-ch5_ZmPiMAgdX6');
    // const newCollectionMeta = 'https://zervan.xyz/nft/collection.json';
    // const newNftCommonMeta = '/collection.json';
    // const royaltyAddress = Address.parse('kQBYb8LrKa9YlDjZ7gqaY9px9wjACsDXW1e3rNu9wLGT3OOw');

    // const collectionMetaCell = beginCell()
    //     .storeUint(1, 8) // we have offchain metadata
    //     .storeStringTail(newCollectionMeta)
    //     .endCell();
    // const nftCommonMetaCell = beginCell()
    //     .storeUint(1, 8) // we have offchain metadata
    //     .storeStringTail(newNftCommonMeta)
    //     .endCell();

    // const contentCell = beginCell()
    //     .storeRef(collectionMetaCell)
    //     .storeRef(nftCommonMetaCell)
    //     .endCell();

    // const royaltyCell = beginCell()
    //     .storeUint(5, 16) // factor
    //     .storeUint(100, 16) // base
    //     .storeAddress(royaltyAddress) // this address will receive 5% of each sale
    //     .endCell();

    // const messageBody = beginCell()
    //     .storeUint(4, 32) // opcode for changing content
    //     .storeUint(0, 64) // query id
    //     .storeRef(contentCell)
    //     .storeRef(royaltyCell)
    //     .endCell();

    // const internalMessage = internal({
    //     to: collectionAddress,
    //     value: toNano('0.05'),
    //     bounce: true,
    //     body: messageBody
    // });

    // const internalMessageCell = beginCell()
    //     .store(storeMessageRelaxed(internalMessage))
    //     .endCell();
}
