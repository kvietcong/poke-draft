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
    privileges: number;
    rules: PlayerRules;
    gamePlayerID: string;
    selections: { [selectionID: string]: Pokemon };
};

export type PointRuleset = {
    id: string;
    name: string;
    owner: string;
    generation: number;
    isPrivate: boolean;
    createdAt: string;
};
export type PointRulesetInfo = PointRuleset & {
    pointRules: { pokemonID: string; value: number }[];
};

export enum GameStage {
    Joining = 0,
    Drafting,
    Battling,
    Finished,
}
export type GameInfo = {
    id: string;
    name: string;
    owner: string;
    notes: string;
    createdAt: string;
    gameStage: GameStage;
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

export type Profile = {
    id: string;
    name: string;
};
