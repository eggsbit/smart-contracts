struct ParentHatcheryStatus {
    parent_address: Address;
    has_parent_paid: Bool;
}

struct EggsHatcheryData {
    parents_number: Int;
    builder_address: Address;
    index: Int;
    is_contract_fulfilled: Bool;
    birth_cost: Int;
}

struct EggsHatcheryBuilderData {
    owner_address: Address;
    collection_address: Address;
    next_item_index: Int as uint64;
    birth_cost: Int as coins;
}
