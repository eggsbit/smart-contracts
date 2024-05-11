import { toNano, beginCell, Address } from '@ton/core';
import { EggsHatcheryBuilder } from '../wrappers/EggsHatcheryBuilder';
import { EggsHatchery } from '../wrappers/EggsHatchery';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const hatchery_builder_address = Address.parse('kQBDmyhU3-kkXYA5JwEndWMJcsn_OD0DNxS6dPrqrH6I5X5E');
    const parent_one_address = Address.parse('0QAiwxhOieDnJLV0Vrm6iazmb82WMuuBhOPBPqz36YSMFjVH');
    const parent_two_address = Address.parse('0QD6r_4u_LuCcz2Xo7tzzcJUTWLMsxd8e6QWHden46aMECBf');

    const hatcheryBuilder = provider.open(await EggsHatcheryBuilder.fromAddress(hatchery_builder_address));

    const hatcheryData = await hatcheryBuilder.getGetHatcheryBuilderData();

    await hatcheryBuilder.send(
        provider.sender(),
        {
            value: toNano('0.1'),
        },
        {
            $$type: 'CreateEggsHatchery',
            query_id: 0n,
            parent_one: parent_one_address,
            parent_two: parent_two_address,
            birth_cost: null
        }
    );

    const hatcheryItemAddress = await hatcheryBuilder.getGetHatcheryAddressByIndex(hatcheryData.next_item_index);
    await provider.waitForDeploy(hatcheryItemAddress, 40);

    const hatcheryItem = provider.open(await EggsHatchery.fromAddress(hatcheryItemAddress));
    const hatcheryItemData = await hatcheryItem.getGetHatcheryData();

    console.log('New hatchery item address: ' + hatcheryItemAddress.toString());
    console.log(hatcheryItemData);
}
