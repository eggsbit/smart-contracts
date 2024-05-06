import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import { EggsHatchery } from '../wrappers/EggsHatchery';
import '@ton/test-utils';

describe('EggsHatchery', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let eggsHatchery: SandboxContract<EggsHatchery>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        eggsHatchery = blockchain.openContract(await EggsHatchery.fromInit());

        deployer = await blockchain.treasury('deployer');

        const deployResult = await eggsHatchery.send(
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
            to: eggsHatchery.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and eggsHatchery are ready to use
    });
});
