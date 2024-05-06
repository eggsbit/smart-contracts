import "@stdlib/deploy";
import "@stdlib/ownable";
import "./eggs_hatchery.tact";
import "./common/common_messages.tact";
import "./common/eggs_hatchery_messages.tact";
import "./common/eggs_hatchery_structures.tact";

contract EggsHatcheryBuilder with Deployable, Ownable {

    // Smart contract version for development
    const contract_version: String = "dev1.0.0";
    // TON coins that we will keep on contract to pay storage fees
    const min_ton_for_storage: Int = ton("0.03");
    // The amount of TON we will pay for the running code in TWM
    const gas_consumtion: Int = ton("0.03");

    // Contract owner. He has the right to make changes. Master wallet.
    owner: Address;
    // Collection address for transmitting messages
    collection_address: Address;
    // Index of next hatchery item
    next_item_index: Int as uint64 = 0;
    // The amount needed for each parent to give birth to new eggs
    birth_cost: Int as coins = ton("0.5");

    init(
        owner_address: Address,
        collection_address: Address
    ) {
        self.owner = owner_address;
        self.collection_address = collection_address;
    }

    // Create new hatchery when players are ready to create new eggs
    receive(msg: CreateEggsHatchery) {
        require(self.owner == sender(), "Only owner can create a ne hatchery");

        let hatchery_init: StateInit = self.get_hatchery_item_state_init(self.next_item_index);
        if(msg.birth_cost == null) {
            msg.birth_cost = self.birth_cost;
        }

        send(SendParameters{
            to: contractAddress(hatchery_init),
            value: self.init_transaction_amount(),
            mode: SendIgnoreErrors,
            body: CreateEggsHatchery{
                query_id: msg.query_id,
                parent_list: msg.parent_list,
                birth_cost: msg.birth_cost
            }.toCell(),
            code: hatchery_init.code,
            data: hatchery_init.data
        });

        self.next_item_index = self.next_item_index + 1;
    }

    // Transfer message from hatchery to collection. It's easier to validate sender here.
    receive(msg: MintFromHatchery) {
        let hatchery_init: StateInit = self.get_hatchery_item_state_init(msg.hatchery_index);
        require(contractAddress(hatchery_init) == sender(), "Only hatchery can send a message to mint");

        send(SendParameters{
            to: self.collection_address,
            value: self.init_transaction_amount(),
            mode: SendIgnoreErrors,
            body: MintFromHatchery{
                query_id: msg.query_id,
                hatchery_index: msg.hatchery_index,
                receiver: msg.receiver
            }.toCell()
        });
    }

    receive(msg: BirthCostUpdate) {   
        require(self.owner == sender(), "Only owner can set new birth cost value");
        self.birth_cost = msg.birth_cost;
    }

    receive(msg: OwnerAddressUpdate) {   
        require(self.owner == sender(), "Only owner can set new owner address");
        self.owner = msg.owner_address;
    }

    // ------------------ Get Function  ------------------ //
    get fun get_hatchery_builder_data(): EggsHatcheryBuilderData {
        return EggsHatcheryBuilderData{
            owner_address:      self.owner,
            collection_address: self.collection_address,
            next_item_index:    self.next_item_index,
            birth_cost:         self.birth_cost
        };
    }

    get fun get_hatchery_address_by_index(item_index: Int): Address {
        let hatchery_init: StateInit = self.get_hatchery_item_state_init(item_index); 
        return contractAddress(hatchery_init);
    }

    get fun get_hatchery_item_state_init(item_index: Int): StateInit {
        return initOf EggsHatchery(myAddress(), item_index);
    }


    // ------------------ Fees Calculation Functions  ------------------ //
    fun storage_fee(): Int {
        let ctx: Context = context();
        let balanceBeforeMsg: Int = myBalance() - ctx.value;
        return self.min_ton_for_storage - min(balanceBeforeMsg, self.min_ton_for_storage);
    }

    fun consumtion_fee(): Int {
        return self.gas_consumtion;
    }

    fun init_transaction_amount(): Int {
        let ctx: Context = context();
        return ctx.value - (self.storage_fee() + self.consumtion_fee());
    }
}
