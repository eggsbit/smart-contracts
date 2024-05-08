struct EggsHatcheryData {

    builder_address: Address;
    index: Int;
    is_contract_fulfilled: Bool;
    birth_cost: Int;
    parent_one: Address?;
    parent_two: Address?;
    parent_payment_status_list: map<Address, Bool>;
    balance: Int as coins;
}

struct EggsHatcheryBuilderData {
    owner_address: Address;
    collection_address: Address;
    next_item_index: Int as uint64;
    birth_cost: Int as coins;
    balance: Int as coins;
}
