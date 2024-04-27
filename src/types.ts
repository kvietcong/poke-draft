import { Species } from "@pkmn/dex";
import { PokemonSprite } from "@pkmn/img";

export type Pokemon = {
    data: Species;
    sprite: PokemonSprite;
    icon: { [attr: string]: string };
};

export type PlayerRules = { maxPoints: number; maxTeamSize: number };
export type PlayerInfo = {
    id: string;
    name: string;
    priority: number;
    rules: PlayerRules;
    selections: { [selectionID: string]: Pokemon };
};

export type PointRulesetInfo = {
    id: string;
    name: string;
    owner: string;
    generation: number;
    isPrivate: boolean;
    createdAt: string;
    pointRules: { pokemonID: string; value: number }[];
};

export type GameInfo = {
    id: string;
    name: string;
    owner: string;
    createdAt: string;
    gameStage: number;
    pointRuleset: string;
};

export type ValueByPokemonID = { [pokemonID: string]: number };

export type Participant = { id: string; name: string };
export type Transaction = {
    selection: { id: string; pokemonID: string };
    oldOwner: Participant;
    newOwner: Participant;
};
export type Trade = {
    id: string;
    requester: Participant;
    confirmations: Participant[];
    transactions: Transaction[];
};
