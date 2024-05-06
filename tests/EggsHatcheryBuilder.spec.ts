import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import { EggsHatcheryBuilder } from '../wrappers/EggsHatcheryBuilder';
import '@ton/test-utils';

describe('EggsHatcheryBuilder', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let eggsHatcheryBuilder: SandboxContract<EggsHatcheryBuilder>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        eggsHatcheryBuilder = blockchain.openContract(await EggsHatcheryBuilder.fromInit());

        deployer = await blockchain.treasury('deployer');

        const deployResult = await eggsHatcheryBuilder.send(
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
            to: eggsHatcheryBuilder.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and eggsHatcheryBuilder are ready to use
    });
});
