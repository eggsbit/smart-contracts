import { toNano, beginCell, Address } from '@ton/core';
import { NftEggsItem } from '../wrappers/NftEggsItem';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const nft_item_address = Address.parse('EQByrWdryfJQqlag3mMftL3zBIW8JfW8fHIUrPJwsqR-j2XI');

    const nftItem = provider.open(await NftEggsItem.fromAddress(nft_item_address));

    const nftDataBefore = await nftItem.getGetNftData();
    console.log(nftDataBefore);

    const ndivudial_content_string = 'QmWYbGmtrN72BQXsMKPfNgTWUWKac6zTzAdhrqNPcgPuYG';
    const indivudial_content = beginCell().storeStringRefTail(ndivudial_content_string).endCell();

    await nftItem.send(
        provider.sender(),
        {
            value: toNano('0.1'),
        },
        {
            $$type: 'UpdateIndividualContent',
            query_id: 0n,
            individual_content: indivudial_content,
        }
    );

    await provider.waitForDeploy(nft_item_address, 40);

    const nftDataAfter = await nftItem.getGetNftData();
    console.log(nftDataAfter);
}
