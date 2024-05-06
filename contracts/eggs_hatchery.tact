import "@stdlib/deploy";
import "./common/eggs_hatchery_messages.tact";
import "./common/eggs_hatchery_structures.tact";

contract EggsHatchery with Deployable {

    // Number of parents for the birth of new eggs
    const parents_number: Int = 2;
    // TON coins that we will keep on contract to pay storage fees
    const min_ton_for_storage: Int = ton("0.02");
    // The amount of TON we will pay for the running code in TWM
    const gas_consumtion: Int = ton("0.03");

    // Parent contract address. Only the builder can create this kind of contract.
    builder_address: Address;
    // Unique identifier of the hatchery
    item_index: Int as uint64;
    // Shows if new eggs have been born or not yet
    is_contract_fulfilled: Bool = false;
    // List of addresses from which we are waiting for transactions 
    // to be accepted to perform the birth of a new egg
    parent_list: map<Int, ParentHatcheryStatus>;
    // The amount needed for each parent to give birth to new eggs
    birth_cost: Int as coins = ton("0.5");

    init(
        builder_address: Address,
        item_index: Int
    ) {
        require(sender() == builder_address, "Only builder can create hatchery");

        self.builder_address = builder_address;
        self.item_index = item_index;
    }

    receive(msg: CreateEggsHatchery) {
        require(sender() == self.builder_address, "Only builder can create hatchery");

        self.parent_list = msg.parent_list;
        if (msg.birth_cost != null) {
            self.birth_cost = msg.birth_cost!!;
        }
    }

    receive("EggsBirth") {
        require(self.is_sender_parent(), "Only parent can send message EggsBirth");

        let ctx: Context = context();
        require(ctx.value >= self.birth_cost, "Not enough coins transferred");
        require(self.is_contract_fulfilled == false, "Сontract must be valid");

        self.set_parent_paid_status(sender(), true);
        if (self.have_all_parents_paid()) {
            self.create_new_eggs();
            self.is_contract_fulfilled = true;
        }
    }

    fun create_new_eggs() {
        let index: Int = 0;

        repeat(self.parents_number) {
            let parent_info: ParentHatcheryStatus? = self.parent_list.get(index);

            if(parent_info != null) {
                send(SendParameters{
                to: self.builder_address,
                value: self.transaction_amount() / self.parents_number,
                mode: SendIgnoreErrors,
                body: MintFromHatchery{
                    query_id: 0,
                    hatchery_index: self.item_index,
                    receiver: (parent_info!!).parent_address
                }.toCell()
            });

            index = index + 1;
            }
        }
    }

    fun is_sender_parent(): Bool
    {
        return self.parent_list_key_by_address(sender()) != null;
    }

    fun set_parent_paid_status(parent_address: Address, status: Bool) {
        let key: Int? = self.parent_list_key_by_address(parent_address);
        if (key != null) {
            let parent_info: ParentHatcheryStatus? = self.parent_list.get(key!!);
            if (parent_info != null) {
                let updated_parent_info: ParentHatcheryStatus = (parent_info!!);
                updated_parent_info.has_parent_paid = status;
                self.parent_list.set(key!!, updated_parent_info);
            }
        }
    }

    fun parent_list_key_by_address(parent_address: Address): Int? {
        let parent_list_key: Int? = null;

        let index: Int = 0;
        while(index < self.parents_number && parent_list_key == null) {
            let parent_info: ParentHatcheryStatus? = self.parent_list.get(index);
            if (parent_info != null && (parent_info!!).parent_address == parent_address) {
                parent_list_key = index;
            }
        }

        return parent_list_key;
    }

    fun have_all_parents_paid(): Bool
    {
        let have_all_parents_paid: Bool = true;

        let index: Int = 0;
        while(index < self.parents_number && have_all_parents_paid == true) {
            let parent_info: ParentHatcheryStatus? = self.parent_list.get(index);
            if (parent_info != null && (parent_info!!).has_parent_paid == false) {
                have_all_parents_paid = false;
            }
        }

        return have_all_parents_paid;
    }


    // ------------------ Get Function  ------------------ //
    get fun get_parent_list(): map<Int, ParentHatcheryStatus> {
        return self.parent_list;
    }

    get fun get_hatchery_data(): EggsHatcheryData {
        return EggsHatcheryData{
            parents_number:        self.parents_number,
            builder_address:       self.builder_address,
            index:                 self.item_index,
            is_contract_fulfilled: self.is_contract_fulfilled,
            birth_cost:            self.birth_cost
        };
    }


    // ------------------ Fees Calculation Functions  ------------------ //
    fun storage_fee(): Int {
        return self.min_ton_for_storage;
    }

    fun consumtion_fee(): Int {
        return self.gas_consumtion;
    }

    fun transaction_amount(): Int {
        return myBalance() - (self.storage_fee() + self.consumtion_fee());
    }
}
