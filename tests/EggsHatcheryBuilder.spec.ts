import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano, beginCell, Dictionary, fromNano, Address } from '@ton/core';
import { EggsHatcheryBuilder } from '../wrappers/EggsHatcheryBuilder';
import { NftEggsCollection } from '../wrappers/NftEggsCollection';
import { EggsHatchery } from '../wrappers/EggsHatchery';
import '@ton/test-utils';

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
        eggsHatcheryBuilder = blockchain.openContract(await EggsHatcheryBuilder.fromInit(deployer.address, nftEggsCollection.address));

        const hatcheryBuilderDeployResult = await eggsHatcheryBuilder.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            }
        );

        expect(hatcheryBuilderDeployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: eggsHatcheryBuilder.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and eggsHatcheryBuilder are ready to use
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

        // // Nft collection is empty
        expect(beforeNftCollecionData.next_item_index).toEqual(0n);
        expect(beforeHatcheryBuilderData.next_item_index).toEqual(0n);
        // console.log('beforeNftCollecionData.balance: ');
        // console.log(fromNano(beforeNftCollecionData.balance));

        // console.log('beforeHatcheryBuilderData.balance: ');
        // console.log(fromNano(beforeHatcheryBuilderData.balance));

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
        // //console.log(respCreate);

        const afterHatcheryBuilderData = await eggsHatcheryBuilder.getGetHatcheryBuilderData();
        expect(afterHatcheryBuilderData.next_item_index).toStrictEqual(1n);

        // console.log('afterHatcheryBuilderData.balance: ');
        // console.log(fromNano(afterHatcheryBuilderData.balance));

        const hatcheryAddress = await eggsHatcheryBuilder.getGetHatcheryAddressByIndex(beforeHatcheryBuilderData.next_item_index);
        const hatcheryItem: SandboxContract<EggsHatchery> = blockchain.openContract(EggsHatchery.fromAddress(hatcheryAddress));       
        
        // const beforeHatcheryData = await hatcheryItem.getGetHatcheryData();
        // console.log('beforeHatcheryData.balance: ');
        // console.log(fromNano(beforeHatcheryData.balance));
        // expect(beforeHatcheryData.is_contract_fulfilled).toStrictEqual(false);

        // // only parents can send messages to hatchery contract
        // // let eggsBirthResult = await hatcheryItem.send(parent3.getSender(), { value: toNano('0.5') }, 'EggsBirth');
        // // expect(eggsBirthResult.transactions).toHaveTransaction({
        // //     from: parent3.address,
        // //     to: hatcheryItem.address,
        // //     success: false,
        // // });

        const res1 = await hatcheryItem.send(parent1.getSender(), { value: toNano('0.5') }, 'EggsBirth');
        const res2 = await hatcheryItem.send(parent2.getSender(), { value: toNano('0.5') }, 'EggsBirth');
        // console.log(res1);
        // console.log(res2);
        const afterHatcheryData = await hatcheryItem.getGetHatcheryData();

        console.log(afterHatcheryData);
        // console.log(hatcheryParentList);

        // Nft collection contains two new NFTs
        const afterNftCollecionData = await nftEggsCollection.getGetCollectionData();
        console.log(afterNftCollecionData);

        console.log(hatcheryItem.address);
        console.log(eggsHatcheryBuilder.address);
        console.log(await nftEggsCollection.getGetHatcheryBuilderAddress());
        // console.log(await nftEggsCollection.getOwner());
        // console.log(await eggsHatcheryBuilder.getOwner());
        //expect(afterNftCollecionData.next_item_index).toStrictEqual(2n);
    });

    it('should owner address be changable', async () => {
        const hatcheryBuilder: SandboxContract<EggsHatcheryBuilder> = blockchain.openContract(EggsHatcheryBuilder.fromAddress(eggsHatcheryBuilder.address));
        let hatcheryBuilderOwnerAddress = await hatcheryBuilder.getOwner();

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

        hatcheryBuilderOwnerAddress = await hatcheryBuilder.getOwner();
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

        hatcheryBuilderOwnerAddress = await hatcheryBuilder.getOwner();
        // The owner address has been changed successfully
        expect(hatcheryBuilderOwnerAddress).toEqualAddress(newDeployer.address);
    });

    it('should birth cost be changable', async () => {
        const newBirthCost = 5n;

        const hatcheryBuilder: SandboxContract<EggsHatcheryBuilder> = blockchain.openContract(EggsHatcheryBuilder.fromAddress(eggsHatcheryBuilder.address));
        const beforeHatcheryBuilderData = await hatcheryBuilder.getGetHatcheryBuilderData();

        const newDeployer: SandboxContract<TreasuryContract> = await blockchain.treasury('newDeployer');

        await eggsHatcheryBuilder.send(
            newDeployer.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'BirthCostUpdate',
                query_id: 0n,
                birth_cost: newBirthCost
            }
        );

        let hatcheryBuilderData = await hatcheryBuilder.getGetHatcheryBuilderData();
        // The nft cost wasn't changed
        expect(hatcheryBuilderData.birth_cost).toEqual(beforeHatcheryBuilderData.birth_cost);

        await eggsHatcheryBuilder.send(
            deployer.getSender(),
            { value: toNano('0.05') },
            {
                $$type: 'BirthCostUpdate',
                query_id: 0n,
                birth_cost: newBirthCost
            }
        );

        hatcheryBuilderData = await hatcheryBuilder.getGetHatcheryBuilderData();
        // The owner address has been changed successfully
        expect(hatcheryBuilderData.birth_cost).toEqual(newBirthCost);        
    });
});
