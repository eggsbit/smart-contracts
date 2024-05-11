struct CollectionData{
    next_item_index: Int;
    collection_content: Cell;
    owner_address: Address;
}

struct RoyaltyParams {
    numerator: Int;
    denominator: Int;
    destination: Address;
}

struct NftData {
    is_initialized: Bool;
    index: Int;
    collection_address: Address;
    owner_address: Address;
    individual_content: Cell;
}
