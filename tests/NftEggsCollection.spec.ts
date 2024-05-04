import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano, fromNano } from '@ton/core';
import { NftEggsCollection } from '../wrappers/NftEggsCollection';
import '@ton/test-utils';
import { NftEggsItem } from '../wrappers/NftEggsItem';

describe('NftEggsCollection', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let player1: SandboxContract<TreasuryContract>;
    let player2: SandboxContract<TreasuryContract>;
    let nftEggsCollection: SandboxContract<NftEggsCollection>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        nftEggsCollection = blockchain.openContract(await NftEggsCollection.fromInit());

        deployer = await blockchain.treasury('deployer');
        player1 = await blockchain.treasury('player1');
        player2 = await blockchain.treasury('player2');

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
        const nftCollecion: SandboxContract<NftEggsCollection> = blockchain.openContract(NftEggsCollection.fromAddress(nftEggsCollection.address));
        const beforeNftCollecionData = await nftCollecion.getCollectionData();

        const beforePlayerBalance = await player1.getBalance();
        const beforeDeployerBalance = await deployer.getBalance();

        await nftEggsCollection.send(player1.getSender(), { value: toNano("1") }, 'Mint');

        const afterNftCollecionData = await nftCollecion.getCollectionData();
        const afterPlayerBalance = await player1.getBalance();
        const afterDeployerBalance = await deployer.getBalance();

        const nftItemAddress = await nftEggsCollection.getNftAddressByIndex(0n);
        const nftItem: SandboxContract<NftEggsItem> = blockchain.openContract(NftEggsItem.fromAddress(nftItemAddress));

        const nftItemData = await nftItem.getItemData();

        // Did the player (sender) receive the NFT: he is not the owner / the value was greater than or equal to 1 TON / the limit was not reached 
        expect(nftItemData.owner_address).toEqualAddress(player1.address);
        // The player's balance became smaller than before
        expect(beforePlayerBalance).toBeGreaterThan(afterPlayerBalance);
        // The balance of the deployer is larger than it was before
        expect(beforeDeployerBalance).toBeLessThan(afterDeployerBalance);
        // The collection counter has been increased
        expect(beforeNftCollecionData.next_item_index + 1n).toStrictEqual(afterNftCollecionData.next_item_index);
    });

    it("shouldn't mint nft for owner", async () => {
        const result = await nftEggsCollection.send(deployer.getSender(), { value: toNano("1") }, 'Mint');

        // The wallet owner can't mint a new NFT
        expect(result.transactions).toHaveTransaction({
            from: deployer.address,
            to: nftEggsCollection.address,
            success: false,
        });
    });

    it('should transfer nft', async () => {
        const result = await nftEggsCollection.send(player1.getSender(), { value: toNano("1") }, 'Mint');

        const nftItemAddress = await nftEggsCollection.getNftAddressByIndex(0n);
        const nftItem: SandboxContract<NftEggsItem> = blockchain.openContract(NftEggsItem.fromAddress(nftItemAddress));

        const nftItemDataBeforeTransfer = await nftItem.getItemData();

        // Did the player (sender) receive the NFT
        expect(nftItemDataBeforeTransfer.owner_address).toEqualAddress(player1.address);
        
        await nftItem.send(
            player1.getSender(),
            { value: toNano("0.2") },
            { 
                $$type: 'Transfer',
                new_owner: player2.address,
                query_id: 0n,
            }
        );

        const nftItemDataAfterTransfer = await nftItem.getItemData();
        // Did the new player receive the NFT
        expect(nftItemDataAfterTransfer.owner_address).toEqualAddress(player2.address);
    });
});
