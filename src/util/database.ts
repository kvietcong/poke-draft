import { SupabaseClient } from "@supabase/supabase-js";
import {
    GameInfo,
    PlayerInfo,
    PointRuleset,
    PointRulesetInfo,
    Pokemon,
    Profile,
    Trade,
    Transaction,
} from "@/types";
import { searchPokemon } from "./pokemon";
import supabase from "@/supabase";
export const profileTable = "profile";
export const pointRulesetTable = "point_ruleset";
export const pointRuleTable = "point_rule";
export const gameTable = "game";
export const gamePlayerTable = "game_player";
export const gameSelectionTable = "game_selection";
export const tradeTable = "game_trade";
export const tradeConfirmationTable = "game_trade_confirmation";
export const tradeTransactionTable = "game_trade_transaction";

export const fetchGameInfo = async (gameID: string) => {
    console.log("Fetching game info", gameID);
    let { data, error } = await supabase
        .from(gameTable)
        .select(
            `
            id, name,
            owner, pointRuleset:point_ruleset,
            createdAt:created_at, gameStage:game_stage,
            notes`
        )
        .eq("id", gameID)
        .single();
    if (error) throw error;
    if (!data) throw new Error("No data received!");
    const gameInfo = data as GameInfo;
    return gameInfo;
};

export const fetchCurrentDrafter = async (gameID: string) => {
    console.log("Fetching current drafter", gameID);
    const { data, error } = await supabase.rpc("get_current_drafter", {
        game_id: gameID,
    });
    if (error) throw error;
    return data as string | undefined;
};

export const fetchAllPlayerInfo = async (gameID: string) => {
    console.log("Fetching all player info", gameID);
    let { data, error } = await supabase
        .from(gamePlayerTable)
        .select(
            `
            id,
            game:${gameTable}(ruleset:${pointRulesetTable}(generation)),
            player(id, display_name),
            selections:${gameSelectionTable}(id, pokemonID:pokemon_id),
            priority, max_points, max_team_size, privileges`
        )
        .eq("game", gameID)
        .returns<
            {
                id: string;
                game: { ruleset: { generation: number } };
                player: {
                    id: string;
                    display_name: string;
                };
                selections: { id: string; pokemonID: string }[];
                priority: number;
                max_points: number;
                max_team_size: number;
                privileges: number;
            }[]
        >();
    if (error) throw error;
    if (!data) throw new Error("No data received!");
    const allPlayerInfo = data.map((info) => {
        return {
            id: info.player.id,
            gamePlayerID: info.id,
            name: info.player.display_name,
            priority: info.priority,
            privileges: info.privileges,
            rules: {
                maxPoints: info.max_points,
                maxTeamSize: info.max_team_size,
            },
            selections: info.selections.reduce<{
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

    return allPlayerInfo as PlayerInfo[];
};

export const fetchPointRulesetInfo = async (rulesetID: string) => {
    console.log("fetching point ruleset info", rulesetID);
    let { data, error } = await supabase
        .from(pointRulesetTable)
        .select(
            `
            id, name, owner, generation,
            isPrivate:is_private, createdAt:created_at,
            pointRules:${pointRuleTable}(pokemonID:pokemon_id, value)`
        )
        .eq("id", rulesetID)
        .single();
    if (error) throw error;
    if (!data) throw Error("No data received!");
    const valueByPokemonID = {} as { [id: string]: number };
    for (const { pokemonID, value } of data.pointRules)
        valueByPokemonID[pokemonID] = value;
    return { ...data, valueByPokemonID } as PointRulesetInfo;
};

export const fetchRulesets = async () => {
    console.log("fetching point rulesets");
    let { data, error } = await supabase
        .from(pointRulesetTable)
        .select(
            "id, name, owner, generation, isPrivate:is_private, createdAt:created_at"
        );
    if (error) throw error;
    if (!data) throw Error("No data received!");
    return data as PointRuleset[];
};

export const fetchGames = async () => {
    console.log("fetching games");
    let { data, error } = await supabase.from(gameTable).select(`id, name`);
    if (error) throw error;
    if (!data) throw Error("No data received!");
    const games = data.map<[string, string]>((x) => [x.id, x.name]);
    return games;
};

export const fetchProfile = async (userID: string) => {
    console.log("fetching user profile", userID);
    const { data, error } = await supabase
        .from(profileTable)
        .select("id, name:display_name")
        .eq("id", userID)
        .single();
    if (error) throw error;
    if (!data) throw Error("No data received!");
    return data as Profile;
};

export const changeUsername = async (userID: string, newUsername: string) => {
    const { error } = await supabase
        .from(profileTable)
        .update({ display_name: newUsername })
        .eq("id", userID);
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

export const fetchGameTrades = async (gameID: string) => {
    const query = supabase
        .from(tradeTable)
        .select(tradeSelectQuery)
        .eq("game", gameID);
    const { data, error } = await query.returns<RawTrade[]>();
    if (error) throw error;
    if (!data) throw new Error("No game trade data received!");
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
