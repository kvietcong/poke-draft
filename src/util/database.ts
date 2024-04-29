import { Session, SupabaseClient } from "@supabase/supabase-js";
import {
    GameInfo,
    PlayerInfo,
    PointRulesetInfo,
    Pokemon,
    Trade,
    Transaction,
} from "@/types";
import { searchPokemon } from "./Pokemon";
export const profileTable = "profile";
export const pointRulesetTable = "point_ruleset";
export const pointRuleTable = "point_rule";
export const gameTable = "game";
export const gamePlayerTable = "game_player";
export const gameSelectionTable = "game_selection";
export const tradeTable = "game_trade";
export const tradeConfirmationTable = "game_trade_confirmation";
export const tradeTransactionTable = "game_trade_transaction";

export const fetchGameInfo = async (supabase: SupabaseClient, game: string) => {
    let { data, error } = await supabase
        .from(gameTable)
        .select(
            `id, name, owner, pointRuleset:point_ruleset, createdAt:created_at, gameStage:game_stage`
        )
        .eq("id", game)
        .single();
    if (error) return console.error(error) as undefined;
    if (!data) return console.log("No data received!") as undefined;
    return data as GameInfo;
};

export const fetchCurrentDrafter = async (
    supabase: SupabaseClient,
    game: string
) => {
    const { data, error } = await supabase.rpc("get_current_drafter", {
        game_id: game,
    });
    if (error) return console.error(error) as undefined;
    if (!data) return console.log("No data received!") as undefined;
    return data as string;
};

export const fetchAllPlayerInfo = async (
    supabase: SupabaseClient,
    game: string
) => {
    let { data, error } = await supabase
        .from(gamePlayerTable)
        .select(
            `
            game:${gameTable}(ruleset:${pointRulesetTable}(generation)),
            player (
                id, display_name,
                selections:${gameSelectionTable}(id, pokemonID:pokemon_id)
            ), priority, max_points, max_team_size`
        )
        .eq("game", game)
        .eq("player.selections.game", game)
        .returns<
            {
                game: { ruleset: { generation: number } };
                player: {
                    id: string;
                    display_name: string;
                    selections: { id: string; pokemonID: string }[];
                };
                priority: number;
                max_points: number;
                max_team_size: number;
            }[]
        >();
    if (error) return console.error(error);
    if (!data) return console.log("No data received!");
    const playerInfoByID = data.map((info) => {
        return {
            id: info.player.id,
            name: info.player.display_name,
            priority: info.priority,
            rules: {
                maxPoints: info.max_points,
                maxTeamSize: info.max_team_size,
            },
            selections: info.player.selections.reduce<{
                [selectionID: string]: Pokemon;
            }>((acc, { id, pokemonID }) => {
                acc[id] = searchPokemon(
                    pokemonID,
                    info.game.ruleset.generation
                );
                return acc;
            }, {}),
        };
    }, {});

    return playerInfoByID as PlayerInfo[];
};

export const fetchPointRulesetInfo = async (
    supabase: SupabaseClient,
    ruleset: string
) => {
    let { data, error } = await supabase
        .from(pointRulesetTable)
        .select(
            `
            id, name, owner, generation,
            isPrivate:is_private, createdAt:created_at,
            pointRules:${pointRuleTable}(pokemonID:pokemon_id, value)`
        )
        .eq("id", ruleset)
        .single();
    if (error) return console.error(error);
    if (!data) return console.log("No data received!");
    const valueByPokemonID = {} as { [id: string]: number };
    for (const { pokemonID, value } of data.pointRules)
        valueByPokemonID[pokemonID] = value;
    return { ...data, valueByPokemonID } as PointRulesetInfo;
};

export const fetchPointRulesetInfoFromGameID = async (
    supabase: SupabaseClient,
    game: string
) => {
    let { data, error } = await supabase
        .from(gameTable)
        .select(
            `
            pointRuleset:point_ruleset(
                id, name, owner, generation,
                isPrivate:is_private, createdAt:created_at,
                pointRules:${pointRuleTable}(pokemonID:pokemon_id, value)
            )
        `
        )
        .eq("id", game)
        .returns<
            {
                pointRuleset: {
                    id: string;
                    name: string;
                    owner: string;
                    generation: number;
                    isPrivate: boolean;
                    createdAt: string;
                    pointRules: { pokemonID: string; value: number }[];
                };
            }[]
        >()
        .single();
    if (error) return console.error(error);
    if (!data) return console.log("No data received!");
    const valueByPokemonID = {} as { [id: string]: number };
    for (const { pokemonID, value } of data.pointRuleset.pointRules)
        valueByPokemonID[pokemonID] = value;
    return { ...data.pointRuleset, valueByPokemonID } as PointRulesetInfo;
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

const tradeSelectQuery = `
        id,
        requester:${profileTable}(id, name:display_name),
        transactions:${tradeTransactionTable}(
            newOwner:${profileTable}(id, name:display_name),
            selection:${gameSelectionTable}(
                id,
                pokemonID:pokemon_id,
                oldOwner:${profileTable}(id, name:display_name)
            )
        ),
        confirmations:${tradeConfirmationTable}(confirmer:${profileTable}(id, name:display_name))
    `;

type RawTrade = {
    id: string;
    requester: { id: string; name: string };
    transactions: {
        newOwner: { id: string; name: string };
        selection: {
            id: string;
            pokemonID: string;
            oldOwner: { id: string; name: string };
        };
    }[];
    confirmations: {
        confirmer: { id: string; name: string };
    }[];
};

export const fetchGameTrades = async (
    supabase: SupabaseClient,
    gameID: string
) => {
    const query = supabase
        .from(tradeTable)
        .select(tradeSelectQuery)
        .eq("game", gameID);
    const { data, error } = await query.returns<RawTrade[]>();
    if (error) return console.error(error);
    if (!data) return console.log("No data received!");
    const trades = data.map<Trade>((rawTrade) => {
        return {
            id: rawTrade.id,
            requester: rawTrade.requester,
            confirmations: rawTrade.confirmations.map((x) => x.confirmer),
            transactions: rawTrade.transactions.map((rawTransaction) => {
                return {
                    selection: {
                        id: rawTransaction.selection.id,
                        pokemonID: rawTransaction.selection.pokemonID,
                    },
                    oldOwner: rawTransaction.selection.oldOwner,
                    newOwner: rawTransaction.newOwner,
                } as Transaction;
            }),
        };
    });
    return trades;
};

export const executeTrade = async (
    supabase: SupabaseClient,
    tradeID: string
) => {
    const { error } = await supabase.rpc("execute_trade", {
        trade_id: tradeID,
    });
    if (!error) return;
    console.error(error);
    return error;
};

export const acceptTrade = async (
    supabase: SupabaseClient,
    tradeID: string,
    accepter: string
) => {
    const { error } = await supabase
        .from(tradeConfirmationTable)
        .insert({ participant: accepter, trade: tradeID });
    if (!error) return;
    console.error(error);
    return error;
};

export const removeTrade = async (
    supabase: SupabaseClient,
    tradeID: string
) => {
    const { error } = await supabase
        .from(tradeTable)
        .delete()
        .eq("id", tradeID);
    if (!error) return;
    return error;
};

export const submitTrade = async (
    supabase: SupabaseClient,
    gameID: string,
    requester: string,
    newOwnerByselectionID: { [id: string]: string }
) => {
    const { data, error } = await supabase
        .from(tradeTable)
        .insert({ game: gameID, requester })
        .select("id")
        .single();
    if (error) return error;
    if (!data) return "Couldn't create trade";
    const transactions = Object.entries(newOwnerByselectionID).map(
        ([selectionID, newOwnerID]) => {
            return {
                trade: data.id,
                new_owner: newOwnerID,
                selection: selectionID,
            };
        }
    );

    const { error: transactionError } = await supabase
        .from(tradeTransactionTable)
        .insert(transactions);
    if (transactionError) {
        console.error(transactionError);
        return transactionError;
    }
};
