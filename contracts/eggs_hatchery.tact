import "@stdlib/deploy";
import "./common/eggs_hatchery_messages.tact";
import "./common/eggs_hatchery_structures.tact";

contract EggsHatchery with Deployable {

    // TON coins that we will keep on contract to pay storage fees
    const min_ton_for_storage: Int = ton("0.03");
    // The amount of TON we will pay for the running code in TWM
    const gas_consumtion: Int = ton("0.03");

    // Parent contract address. Only the builder can create this kind of contract.
    builder_address: Address;
    // Unique identifier of the hatchery
    item_index: Int as uint64;
    // Shows if new eggs have been born or not yet
    is_contract_fulfilled: Bool = false;
    // Addresses from which we are waiting for transactions 
    // to be accepted to perform the birth of a new egg
    parent_one: Address?;
    parent_two: Address?;
    // List of payment statuses for each parent
    parent_payment_status_list: map<Address, Bool>;
    // The amount needed for each parent to give birth to new eggs
    birth_cost: Int as coins = ton("1");

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

        self.parent_one = msg.parent_one;
        self.parent_two = msg.parent_two;
        if (msg.birth_cost != null) {
            self.birth_cost = msg.birth_cost!!;
        }
    }

    receive("EggsBirth") {
        require(self.is_sender_parent(), "Only parent can send message EggsBirth");

        let ctx: Context = context();
        require(ctx.value >= self.birth_cost, "Not enough coins transferred");
        require(self.is_contract_fulfilled == false, "Сontract must be valid");

        self.set_parent_payment_status(sender(), true);
        if (self.have_all_parents_paid()) {
            self.create_new_eggs((self.parent_one!!));
            self.create_new_eggs((self.parent_two!!));
            self.is_contract_fulfilled = true;

            send(SendParameters{
                to: self.builder_address,
                value: 0,
                mode: SendIgnoreErrors + SendRemainingBalance
            });
        }
    }

    fun create_new_eggs(reciever: Address) {
        let parent_status: Bool? = self.parent_payment_status_list.get(reciever);

        if(parent_status == true) {
            send(SendParameters{
                to: self.builder_address,
                value: self.transaction_amount() / 2,
                mode: SendIgnoreErrors,
                body: MintFromHatchery{
                    query_id: 0,
                    hatchery_index: self.item_index,
                    receiver: reciever
                }.toCell()
            });
        }
    }

    fun is_sender_parent(): Bool
    {
        return sender() == self.parent_one || sender() == self.parent_two;
    }

    fun set_parent_payment_status(parent_address: Address, status: Bool) {
        require(self.is_sender_parent(), "Only parent can send message EggsBirth");
        self.parent_payment_status_list.set(parent_address, status);
    }

    fun have_all_parents_paid(): Bool
    {
        if (self.parent_one == null || self.parent_two == null) {
            return false;
        }

        return self.parent_payment_status_list.get((self.parent_one!!)) == true 
            && self.parent_payment_status_list.get((self.parent_two!!)) == true;
    }


    // ------------------ Get Function  ------------------ //
    get fun get_hatchery_data(): EggsHatcheryData {
        return EggsHatcheryData{
            builder_address:            self.builder_address,
            index:                      self.item_index,
            is_contract_fulfilled:      self.is_contract_fulfilled,
            birth_cost:                 self.birth_cost,
            parent_one:                 self.parent_one,
            parent_two:                 self.parent_two,
            parent_payment_status_list: self.parent_payment_status_list
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
