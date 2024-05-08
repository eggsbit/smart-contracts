import "./eggs_hatchery_structures.tact";

message CreateEggsHatchery {
    query_id: Int as uint64;
    parent_one: Address;
    parent_two: Address;
    birth_cost: Int? as coins;
}

message MintFromHatchery {
    query_id: Int as uint64;
    hatchery_index: Int as uint64;
    receiver: Address;
}

message BirthCostUpdate {
    query_id: Int as uint64;
    birth_cost: Int as coins;
}
