import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano, fromNano, beginCell } from '@ton/core';
import { NftEggsCollection } from '../wrappers/NftEggsCollection';
import '@ton/test-utils';
import { NftEggsItem } from '../wrappers/NftEggsItem';

describe('NftEggsCollection', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let bank: SandboxContract<TreasuryContract>;
    let player1: SandboxContract<TreasuryContract>;
    let player2: SandboxContract<TreasuryContract>;
    let nftEggsCollection: SandboxContract<NftEggsCollection>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        bank = await blockchain.treasury('bank');
        player1 = await blockchain.treasury('player1');
        player2 = await blockchain.treasury('player2');

        const OFFCHAIN_CONTENT_PREFIX = 0x01;
        const string_first = "https://s.getgems.io/nft-staging/c/628f6ab8077060a7a8d52d63/";
        const collection_content = beginCell().storeInt(OFFCHAIN_CONTENT_PREFIX, 8).storeStringRefTail(string_first).endCell();

        nftEggsCollection = blockchain.openContract(await NftEggsCollection.fromInit(
            deployer.address,
            bank.address,
            collection_content,
            {
                $$type: "RoyaltyParams",
                numerator: 350n, // 350n = 35%
                denominator: 1000n,
                destination: bank.address,
            }
        ));

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
        const beforeNftCollecionData = await nftCollecion.getGetCollectionData();

        const beforePlayerBalance = await player1.getBalance();
        const beforeDeployerBalance = await deployer.getBalance();
        const beforeBankBalance = await bank.getBalance();

        await nftEggsCollection.send(player1.getSender(), { value: toNano("1") }, 'Mint');

        const afterNftCollecionData = await nftCollecion.getGetCollectionData();
        const afterPlayerBalance = await player1.getBalance();
        const afterDeployerBalance = await deployer.getBalance();
        const afterBankBalance = await bank.getBalance();

        const nftItemAddress = await nftEggsCollection.getGetNftAddressByIndex(0n);
        const nftItem: SandboxContract<NftEggsItem> = blockchain.openContract(NftEggsItem.fromAddress(nftItemAddress));

        const nftItemData = await nftItem.getGetNftData();

        // Did the player (sender) receive the NFT: he is not the owner / the value was greater than or equal to 1 TON / the limit was not reached 
        expect(nftItemData.owner_address).toEqualAddress(player1.address);
        // The player's balance became smaller than before
        expect(beforePlayerBalance).toBeGreaterThan(afterPlayerBalance);
        // The balance of the deployer is larger than it was before
        expect(beforeDeployerBalance).toBeLessThan(afterDeployerBalance);
        // The balance of the bank is larger than it was before
        expect(beforeBankBalance).toBeLessThan(afterBankBalance);
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

        const nftItemAddress = await nftEggsCollection.getGetNftAddressByIndex(0n);
        const nftItem: SandboxContract<NftEggsItem> = blockchain.openContract(NftEggsItem.fromAddress(nftItemAddress));

        const nftItemDataBeforeTransfer = await nftItem.getGetNftData();

        // Did the player (sender) receive the NFT
        expect(nftItemDataBeforeTransfer.owner_address).toEqualAddress(player1.address);
        
        await nftItem.send(
            player1.getSender(),
            { value: toNano("0.2") },
            { 
                $$type: 'Transfer',
                new_owner: player2.address,
                query_id: 0n,
                response_destination: null,             
                custom_payload: null,                  
                forward_amount: 0n,        
                forward_payload: beginCell().endCell()
            }
        );

        const nftItemDataAfterTransfer = await nftItem.getGetNftData();
        // Did the new player receive the NFT
        expect(nftItemDataAfterTransfer.owner_address).toEqualAddress(player2.address);
    });

    it.skip('should nft limit be reached', async () => {
        const max_nft_number = 10000n;
        const beforeDeployerBalance = await deployer.getBalance();
        const beforeBankBalance = await deployer.getBalance();

        const nftCollecion: SandboxContract<NftEggsCollection> = blockchain.openContract(NftEggsCollection.fromAddress(nftEggsCollection.address));
        let nftCollecionData = await nftCollecion.getGetCollectionData();

        // At the beginning the counter is 0. 
        expect(nftCollecionData.next_item_index).toStrictEqual(0n);

        for (let i = 0n; i <= max_nft_number; i++) {
            console.log('step number:' + i + '/' + max_nft_number);
            const player: SandboxContract<TreasuryContract> = await blockchain.treasury('player' + i);
            await nftEggsCollection.send(player.getSender(), { value: toNano("1") }, 'Mint');

            const nftItemAddress = await nftEggsCollection.getGetNftAddressByIndex(i);
            const nftItem: SandboxContract<NftEggsItem> = blockchain.openContract(NftEggsItem.fromAddress(nftItemAddress));

            const nftItemData = await nftItem.getGetNftData();

            // Did the player (sender) receive the NFT
            expect(nftItemData.owner_address).toEqualAddress(player.address);
        }

        const lastPlayer: SandboxContract<TreasuryContract> = await blockchain.treasury('lastPlayer');
        const result = await nftEggsCollection.send(lastPlayer.getSender(), { value: toNano("1") }, 'Mint');

        // The last user can't get nft because collection limit is exceeded.
        expect(result.transactions).toHaveTransaction({
            from: lastPlayer.address,
            to: nftEggsCollection.address,
            success: false,
        });

        nftCollecionData = await nftCollecion.getGetCollectionData();
        expect(nftCollecionData.next_item_index).toStrictEqual(max_nft_number + 1n);

        const afterDeployerBalance = await deployer.getBalance();
        const afterBankBalance = await bank.getBalance();

        expect(afterDeployerBalance).toBeGreaterThan(beforeDeployerBalance);

        console.log(fromNano(beforeDeployerBalance).toString() + ' -> ' + fromNano(afterDeployerBalance).toString());
        console.log(fromNano(beforeBankBalance).toString() + ' -> ' + fromNano(afterBankBalance).toString());
    });
});
