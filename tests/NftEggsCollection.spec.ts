import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import { NftEggsCollection } from '../wrappers/NftEggsCollection';
import '@ton/test-utils';
import { NftEggsItem } from '../wrappers/NftEggsItem';

describe('NftEggsCollection', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let player: SandboxContract<TreasuryContract>;
    let nftEggsCollection: SandboxContract<NftEggsCollection>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        nftEggsCollection = blockchain.openContract(await NftEggsCollection.fromInit());

        deployer = await blockchain.treasury('deployer');
        player = await blockchain.treasury('player');

        const deployResult = await nftEggsCollection.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            }
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: nftEggsCollection.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and nftEggsCollection are ready to use
    });

    it('should mint nft', async () => {
        await nftEggsCollection.send(player.getSender(), { value: toNano("1") }, 'Mint');

        const nftItemAddress = await nftEggsCollection.getNftAddressByIndex(0n);
        const nftItem: SandboxContract<NftEggsItem> = blockchain.openContract(NftEggsItem.fromAddress(nftItemAddress));

        const nftItemData = await nftItem.getItemData();
        console.log(nftItemData);
    });
});
