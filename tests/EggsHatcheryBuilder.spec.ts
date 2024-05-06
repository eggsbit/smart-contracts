import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano, beginCell, Dictionary } from '@ton/core';
import { EggsHatcheryBuilder, ParentHatcheryStatus } from '../wrappers/EggsHatcheryBuilder';
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

        const hatcheryBuilder: SandboxContract<EggsHatcheryBuilder> = blockchain.openContract(EggsHatcheryBuilder.fromAddress(eggsHatcheryBuilder.address));
        const beforeHatcheryBuilderData = await hatcheryBuilder.getGetHatcheryBuilderData();

        // The index counter is now 0. We have no hatcheries.
        expect(beforeHatcheryBuilderData.next_item_index).toEqual(0n);

        // Create parent list before sending
        const parent_list = Dictionary.empty<number, ParentHatcheryStatus>();
        parent_list.set(0, {$$type: 'ParentHatcheryStatus', parent_address: parent1.address, has_parent_paid: false});
        parent_list.set(1, {$$type: 'ParentHatcheryStatus', parent_address: parent2.address, has_parent_paid: false});

        const createEggsHatcheryResult = await eggsHatcheryBuilder.send(
            deployer.getSender(),
            { value: toNano('0.1') },
            {
                $$type: 'CreateEggsHatchery',
                query_id: 0n,
                parent_list: parent_list,
                birth_cost: null
            }
        );

        const hatcheryAddress = await eggsHatcheryBuilder.getGetHatcheryAddressByIndex(beforeHatcheryBuilderData.next_item_index);
        const hatcheryItem: SandboxContract<EggsHatchery> = blockchain.openContract(EggsHatchery.fromAddress(hatcheryAddress));

        const hatcheryData = await hatcheryItem.getGetHatcheryData();
        // Hatchery was created and is not finished
        expect(hatcheryData.is_contract_fulfilled).toEqual(false);

        // Hatchery was created and it has the same parent list
        const hatcheryParentList = await hatcheryItem.getGetParentList();
        const hatcheryParent1 = hatcheryParentList.get(0);
        const hatcheryParent2 = hatcheryParentList.get(1);
        expect(hatcheryParent1?.parent_address).toEqualAddress(parent1.address);
        expect(hatcheryParent2?.parent_address).toEqualAddress(parent2.address);
    });

    it('should hatchery mint new nft item', async () => {
        
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
