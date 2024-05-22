import { useQuery } from "@tanstack/react-query";
import {
    fetchAllPlayerInfo,
    fetchCurrentDrafter,
    fetchGameInfo,
    fetchGameTrades,
    fetchPointRulesetInfo,
} from "./util/database";
import { PlayerInfo } from "./types";
import { Dex } from "@pkmn/dex";

export const useGameInfoQuery = (gameID: string) => {
    const query = useQuery({
        queryKey: ["gameInfo", gameID],
        queryFn: async () => {
            const gameInfo = await fetchGameInfo(gameID);
            return gameInfo;
        },
    });
    return query;
};

export const useCurrentDrafterQuery = (gameID: string) => {
    const query = useQuery({
        queryKey: ["currentDrafter", gameID],
        queryFn: async () => {
            const currentDrafter = await fetchCurrentDrafter(gameID);
            return currentDrafter;
        },
    });
    return query;
};

export const useGameTradesQuery = (gameID: string) => {
    const query = useQuery({
        queryKey: ["gameTrades", gameID],
        queryFn: async () => {
            const gameTrades = await fetchGameTrades(gameID);
            return gameTrades;
        },
    });
    return query;
};

export const useGamePlayersQuery = (gameID: string) => {
    const query = useQuery({
        queryKey: ["gamePlayers", gameID],
        queryFn: async () => {
            const allPlayerInfo = await fetchAllPlayerInfo(gameID);
            const playerInfoByID = allPlayerInfo.reduce<{
                [id: string]: PlayerInfo;
            }>((acc, next) => {
                acc[next.id] = next;
                return acc;
            }, {});
            return { allPlayerInfo, playerInfoByID };
        },
    });
    return query;
};

export const usePointRulesetQuery = (pointRulesetID?: string) => {
    const query = useQuery({
        queryKey: ["pointRuleset", pointRulesetID],
        queryFn: async () => {
            const pointRulesetInfo = await fetchPointRulesetInfo(
                pointRulesetID!
            );
            const dex = Dex.forGen(pointRulesetInfo.generation);
            const valueByPokemonID = pointRulesetInfo.pointRules.reduce<{
                [id: string]: number;
            }>((acc, { pokemonID, value }) => {
                acc[pokemonID] = value;
                return acc;
            }, {});
            const pokemonIDsByValue = pointRulesetInfo.pointRules.reduce<{
                [value: string]: string[];
            }>((acc, { pokemonID, value }) => {
                const valueStr = value.toString();
                if (valueStr in acc) acc[valueStr].push(pokemonID);
                else acc[valueStr] = [pokemonID];
                return acc;
            }, {});

            return {
                pointRulesetInfo,
                dex,
                valueByPokemonID,
                pokemonIDsByValue,
            };
        },
        enabled: !!pointRulesetID,
    });
    return query;
};
