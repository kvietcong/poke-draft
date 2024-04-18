import { Session, SupabaseClient } from "@supabase/supabase-js";
import {
    gamePlayerTable,
    gameSelectionTable,
    gameTable,
    pointRuleTable,
    pointRulesetTable,
    profileTable,
} from "./DatabaseTables";
import { Dex, ModdedDex } from "@pkmn/dex";
import { Pokemon } from "@/types";
import { getPokemon } from "./Pokemon";

export type PlayerRules = { maxPoints: number; maxTeamSize: number };
export type PlayerInfo = {
    name: string;
    rules: PlayerRules;
    priority: number;
};

export type PointRulesetInfo = {
    id: string;
    generation: number;
    name: string;
    valueByPokemonID: { [pokemonID: string]: number };
};

export type PointRule = [value: string, pokemonData: Pokemon[]];

export const fetchGameInfo = async (supabase: SupabaseClient, game: string) => {
    let { data, error } = await supabase
        .from(gameTable)
        .select(
            `name,
            ${pointRulesetTable} (id, name, generation,
                ${pointRuleTable} (pokemon_id, value))`
        )
        .eq("id", game)
        .returns<
            {
                name: string;
                [pointRulesetTable]: {
                    id: string;
                    name: string;
                    generation: number;
                    [pointRuleTable]: {
                        pokemon_id: string;
                        value: number;
                    }[];
                };
            }[]
        >()
        .single();
    if (error) return console.error(error);
    if (!data) return console.log("No data received!");
    const valueByPokemonID = data[pointRulesetTable][pointRuleTable].reduce<{
        [pokemonID: string]: number;
    }>((acc, next) => {
        acc[next.pokemon_id] = next.value;
        return acc;
    }, {});

    const pointRuleset = {
        id: data[pointRulesetTable].id,
        name: data[pointRulesetTable].name,
        generation: data[pointRulesetTable].generation,
        valueByPokemonID,
    };
    const name = data.name;
    return { name, pointRuleset };
};

export const fetchPlayerInfoByID = async (
    supabase: SupabaseClient,
    game: string
) => {
    let { data, error } = await supabase
        .from(gamePlayerTable)
        .select(
            "player (id, display_name), priority, max_points, max_team_size"
        )
        .eq("game", game)
        .returns<
            {
                player: { id: string; display_name: string };
                priority: number;
                max_points: number;
                max_team_size: number;
            }[]
        >();
    if (error) return console.error(error);
    if (!data) return console.log("No data received!");
    const playerInfoByID = data.reduce<{ [id: string]: PlayerInfo }>(
        (acc, next) => {
            acc[next.player.id] = {
                name: next.player.display_name,
                priority: next.priority,
                rules: {
                    maxPoints: next.max_points,
                    maxTeamSize: next.max_team_size,
                },
            };
            return acc;
        },
        {}
    );

    return playerInfoByID;
};

export const fetchPokemonByPlayerID = async (
    supabase: SupabaseClient,
    game: string,
    pointRuleset: PointRulesetInfo
) => {
    let { data, error } = await supabase
        .from(gameSelectionTable)
        .select("player, pokemon_id")
        .eq("game", game);
    if (error) return console.error(error);
    if (!data) return console.log("No data received!");
    const dex = Dex.forGen(pointRuleset.generation);
    const pokemonByPlayerID = data.reduce<{ [id: string]: Pokemon[] }>(
        (acc, next) => {
            const player = next.player;
            const pokemon = getPokemon(next.pokemon_id, dex);
            if (player in acc) acc[player].push(pokemon);
            else acc[player] = [pokemon];
            return acc;
        },
        {}
    );
    return pokemonByPlayerID;
};

export const fetchRulesets = async (supabase: SupabaseClient) => {
    let { data, error } = await supabase
        .from(pointRulesetTable)
        .select("id, name");
    if (error) return console.error(error);
    if (!data) return console.log("No data received!");
    const rulesets = data.map<[string, string]>((val) => [val.id, val.name]);
    return rulesets;
};

export const fetchMovesByPokemon = async (dex: ModdedDex) => {
    const movesByPokemon: { [id: string]: string[] } = {};
    for (const p of dex.species.all()) {
        movesByPokemon[p.id] = Object.keys(
            (await dex.learnsets.getByID(p.id)).learnset ?? {}
        );
    }
    return movesByPokemon;
};

export const fetchRulesetInfo = async (
    supabase: SupabaseClient,
    ruleset: string
) => {
    let { data, error } = await supabase
        .from(pointRulesetTable)
        .select("name, generation")
        .eq("id", ruleset)
        .single();
    if (error) return console.error(error);
    if (!data) return console.log("No data received!");
    return data;
};

export const fetchPointRules = async (
    supabase: SupabaseClient,
    ruleset: string
) => {
    let { data, error } = await supabase
        .from(pointRuleTable)
        .select("value, pokemon_id")
        .eq("point_ruleset", ruleset);
    if (error) return console.error(error);
    if (!data) return console.log("No data received!");

    const zeroThenHiToLo = (a: [string, Pokemon[]], b: [string, Pokemon[]]) => {
        const valA = parseInt(a[0]);
        const valB = parseInt(b[0]);
        if (valA === 0) return -1;
        else if (valB === 0) return 1;
        else return valB - valA;
    };
    const getPokemonFromData = (
        accumulated: { [value: string]: Pokemon[] },
        next: { value: number; pokemon_id: string }
    ) => {
        const { value, pokemon_id }: { value: number; pokemon_id: string } =
            next;
        const key = value.toString();
        if (!accumulated[key]) accumulated[value] = [];
        accumulated[key].push(getPokemon(pokemon_id));
        return accumulated;
    };
    const pointRules: PointRule[] = Object.entries(
        data.reduce<{ [id: string]: Pokemon[] }>(getPokemonFromData, {})
    ).sort(zeroThenHiToLo);
    return pointRules;
};

export const fetchUsername = async (
    supabase: SupabaseClient,
    session: Session
) => {
    const { data, error } = await supabase
        .from(profileTable)
        .select("display_name")
        .eq("id", session.user.id)
        .single();
    if (error) return console.error(error);
    if (!data) return console.log("No data received!");
    return data.display_name;
};

export const changeUsername = async (
    supabase: SupabaseClient,
    session: Session,
    newUsername: string
) => {
    const { error } = await supabase
        .from(profileTable)
        .update({ display_name: newUsername })
        .eq("id", session.user.id);
    return error;
};
