import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano, beginCell } from '@ton/core';
import { EggsHatcheryBuilder } from '../wrappers/EggsHatcheryBuilder';
import { NftEggsCollection } from '../wrappers/NftEggsCollection';
import { EggsHatchery } from '../wrappers/EggsHatchery';
import '@ton/test-utils';
import { NftEggsItem } from '../wrappers/NftEggsItem';

describe('EggsHatcheryBuilder', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let bank: SandboxContract<TreasuryContract>;
    let nftEggsCollection: SandboxContract<NftEggsCollection>;
    let eggsHatcheryBuilder: SandboxContract<EggsHatcheryBuilder>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        bank = await blockchain.treasury('bank');

        // ------------- Deploy Collection -------------\\
        const OFFCHAIN_CONTENT_PREFIX = 0x01;
        const collection_content_string = 'https://meta.test.eggsbit.io/meta/eggsbit/';
        const collection_content = beginCell().storeInt(OFFCHAIN_CONTENT_PREFIX, 8).storeStringRefTail(collection_content_string).endCell();

        nftEggsCollection = blockchain.openContract(await NftEggsCollection.fromInit(
            10n,
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

        const nftEggsCollectionDeployResult = await nftEggsCollection.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            }
        );

        expect(nftEggsCollectionDeployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: nftEggsCollection.address,
            deploy: true,
            success: true,
        });


        // ------------- Deploy Hatchery Builder  -------------\\
        const hatcheryBuilderDeployResult = await nftEggsCollection.send(
            deployer.getSender(),
            {
                value: toNano('0.1'),
            },
            'CreateHatcherBuilder'
        );

        eggsHatcheryBuilder = blockchain.openContract(
            EggsHatcheryBuilder.fromAddress(await nftEggsCollection.getGetHatcheryBuilderAddress())
        );

        expect(hatcheryBuilderDeployResult.transactions).toHaveTransaction({
            from: nftEggsCollection.address,
            to: eggsHatcheryBuilder.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and eggsHatcheryBuilder are ready to use
    });

    it('should hatchery builder address is correct', async () => {
        const hatcheryBuilderAddress = await nftEggsCollection.getGetHatcheryBuilderAddress()
        expect(hatcheryBuilderAddress).toEqualAddress(eggsHatcheryBuilder.address);
    });

    it('should create hatchery', async () => {
        const parent1: SandboxContract<TreasuryContract> = await blockchain.treasury('parent1');
        const parent2: SandboxContract<TreasuryContract> = await blockchain.treasury('parent2');
        const beforeHatcheryBuilderData = await eggsHatcheryBuilder.getGetHatcheryBuilderData();

        // The index counter is now 0. We have no hatcheries.
        expect(beforeHatcheryBuilderData.next_item_index).toEqual(0n);

        await eggsHatcheryBuilder.send(
            deployer.getSender(),
            { value: toNano('0.1') },
            {
                $$type: 'CreateEggsHatchery',
                query_id: 0n,
                parent_one: parent1.address,
                parent_two: parent2.address,
                birth_cost: null
            }
        );

        const hatcheryAddress = await eggsHatcheryBuilder.getGetHatcheryAddressByIndex(beforeHatcheryBuilderData.next_item_index);
        const hatcheryItem: SandboxContract<EggsHatchery> = blockchain.openContract(EggsHatchery.fromAddress(hatcheryAddress));

        const hatcheryData = await hatcheryItem.getGetHatcheryData();
        // Hatchery was created and is not finished
        expect(hatcheryData.is_contract_fulfilled).toEqual(false);

        // Hatchery was created and it has the same parent list
        expect(hatcheryData.parent_one).toEqualAddress(parent1.address);
        expect(hatcheryData.parent_two).toEqualAddress(parent2.address);
    });

    it('should hatchery mint new nft item', async () => {
        const parent1: SandboxContract<TreasuryContract> = await blockchain.treasury('parent1');
        const parent2: SandboxContract<TreasuryContract> = await blockchain.treasury('parent2');
        const parent3: SandboxContract<TreasuryContract> = await blockchain.treasury('parent3');

        const beforeNftCollecionData = await nftEggsCollection.getGetCollectionData();
        const beforeHatcheryBuilderData = await eggsHatcheryBuilder.getGetHatcheryBuilderData();

        // Nft collection is empty
        expect(beforeNftCollecionData.next_item_index).toEqual(0n);
        expect(beforeHatcheryBuilderData.next_item_index).toEqual(0n);

        await eggsHatcheryBuilder.send(
            deployer.getSender(),
            { value: toNano('0.2') },
            {
                $$type: 'CreateEggsHatchery',
                query_id: 0n,
                parent_one: parent1.address,
                parent_two: parent2.address,
                birth_cost: null
            }
        );

        const afterHatcheryBuilderData = await eggsHatcheryBuilder.getGetHatcheryBuilderData();
        expect(afterHatcheryBuilderData.next_item_index).toStrictEqual(1n);

        const hatcheryAddress = await eggsHatcheryBuilder.getGetHatcheryAddressByIndex(beforeHatcheryBuilderData.next_item_index);
        const hatcheryItem: SandboxContract<EggsHatchery> = blockchain.openContract(EggsHatchery.fromAddress(hatcheryAddress));       
        
        const beforeHatcheryData = await hatcheryItem.getGetHatcheryData();
        expect(beforeHatcheryData.is_contract_fulfilled).toStrictEqual(false);

        // Only parents can send messages to hatchery contract
        let eggsBirthResult = await hatcheryItem.send(parent3.getSender(), { value: toNano('1') }, 'EggsBirth');
        expect(eggsBirthResult.transactions).toHaveTransaction({
            from: parent3.address,
            to: hatcheryItem.address,
            success: false,
        });

        await hatcheryItem.send(parent1.getSender(), { value: toNano('1') }, 'EggsBirth');
        await hatcheryItem.send(parent2.getSender(), { value: toNano('1') }, 'EggsBirth');
        const afterHatcheryData = await hatcheryItem.getGetHatcheryData();

        // The contract must be closed and all parents must be marked as paid up
        expect(afterHatcheryData.is_contract_fulfilled).toStrictEqual(true);
        expect(afterHatcheryData.parent_payment_status_list.get(parent1.address)).toStrictEqual(true);
        expect(afterHatcheryData.parent_payment_status_list.get(parent2.address)).toStrictEqual(true);

        // Nft collection contains two new NFTs
        const afterNftCollecionData = await nftEggsCollection.getGetCollectionData();
        expect(afterNftCollecionData.next_item_index).toStrictEqual(2n);

        // The first NFT belongs to player1
        const nftItemOneAddress = await nftEggsCollection.getGetNftAddressByIndex(0n);
        const nftItemOne: SandboxContract<NftEggsItem> = blockchain.openContract(NftEggsItem.fromAddress(nftItemOneAddress));
        const nftItemOneData = await nftItemOne.getGetNftData();
        expect(nftItemOneData.owner_address).toEqualAddress(parent1.address);

        // The second NFT belongs to player2
        const nftItemTwoAddress = await nftEggsCollection.getGetNftAddressByIndex(1n);
        const nftItemTwo: SandboxContract<NftEggsItem> = blockchain.openContract(NftEggsItem.fromAddress(nftItemTwoAddress));
        const nftItemTwoData = await nftItemTwo.getGetNftData();
        expect(nftItemTwoData.owner_address).toEqualAddress(parent2.address);
    });

    it('should owner address be changable', async () => {
        let hatcheryBuilderOwnerAddress = await eggsHatcheryBuilder.getOwner();

        // The owner address equal to original owner address
        expect(hatcheryBuilderOwnerAddress).toEqualAddress(deployer.address);

        const newDeployer: SandboxContract<TreasuryContract> = await blockchain.treasury('newDeployer');

        await eggsHatcheryBuilder.send(
            newDeployer.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'OwnerAddressUpdate',
                query_id: 0n,
                owner_address: newDeployer.address
            }
        );

        hatcheryBuilderOwnerAddress = await eggsHatcheryBuilder.getOwner();
        // The owner address wasn't changed
        expect(hatcheryBuilderOwnerAddress).toEqualAddress(deployer.address);

        await eggsHatcheryBuilder.send(
            deployer.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'OwnerAddressUpdate',
                query_id: 0n,
                owner_address: newDeployer.address
            }
        );

        hatcheryBuilderOwnerAddress = await eggsHatcheryBuilder.getOwner();
        // The owner address has been changed successfully
        expect(hatcheryBuilderOwnerAddress).toEqualAddress(newDeployer.address);
    });
});
