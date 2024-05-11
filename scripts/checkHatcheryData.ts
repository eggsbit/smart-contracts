import { toNano, beginCell, Address } from '@ton/core';
import { EggsHatcheryBuilder } from '../wrappers/EggsHatcheryBuilder';
import { EggsHatchery } from '../wrappers/EggsHatchery';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const hatchery_builder_address = Address.parse('kQBDmyhU3-kkXYA5JwEndWMJcsn_OD0DNxS6dPrqrH6I5X5E');
    const hatcheryBuilder = provider.open(await EggsHatcheryBuilder.fromAddress(hatchery_builder_address));
    const hatcheryData = await hatcheryBuilder.getGetHatcheryBuilderData();

    const hatcheryItemAddress = await hatcheryBuilder.getGetHatcheryAddressByIndex(hatcheryData.next_item_index - 2n);
    await provider.waitForDeploy(hatcheryItemAddress, 40);

    const hatcheryItem = provider.open(await EggsHatchery.fromAddress(hatcheryItemAddress));
    const hatcheryItemData = await hatcheryItem.getGetHatcheryData();

    console.log('Last hatchery item address: ' + hatcheryItemAddress.toString());
    console.log(hatcheryItemData);
}
