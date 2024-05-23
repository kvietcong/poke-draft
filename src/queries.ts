import { useQuery } from "@tanstack/react-query";
import {
    fetchAllPlayerInfo,
    fetchCurrentDrafter,
    fetchGameInfo,
    fetchGameTrades,
    fetchGames,
    fetchPointRulesetInfo,
    fetchProfile,
    fetchRulesets,
} from "./util/database";
import { PlayerInfo } from "./types";
import { Dex, ModdedDex } from "@pkmn/dex";
import { fetchMovesByPokemon } from "./util/pokemon";

export const useProfileQuery = (userID?: string) => {
    const query = useQuery({
        queryKey: ["profile", userID],
        queryFn: async () => {
            const profile = await fetchProfile(userID!);
            return profile;
        },
        enabled: !!userID,
    });
    return query;
};

export const useGameInfoQuery = (gameID?: string) => {
    const query = useQuery({
        queryKey: ["gameInfo", gameID],
        queryFn: async () => {
            const gameInfo = await fetchGameInfo(gameID!);
            return gameInfo;
        },
        enabled: !!gameID,
    });
    return query;
};

export const useCurrentDrafterQuery = (gameID?: string) => {
    const query = useQuery({
        queryKey: ["currentDrafter", gameID],
        queryFn: async () => {
            const currentDrafter = await fetchCurrentDrafter(gameID!);
            return currentDrafter;
        },
        enabled: !!gameID,
    });
    return query;
};

export const useGameTradesQuery = (gameID?: string) => {
    const query = useQuery({
        queryKey: ["gameTrades", gameID],
        queryFn: async () => {
            const gameTrades = await fetchGameTrades(gameID!);
            return gameTrades;
        },
        enabled: !!gameID,
    });
    return query;
};

export const useGamePlayersQuery = (gameID?: string) => {
    const query = useQuery({
        queryKey: ["gamePlayers", gameID],
        queryFn: async () => {
            const allPlayerInfo = await fetchAllPlayerInfo(gameID!);
            const playerInfoByID = allPlayerInfo.reduce<{
                [id: string]: PlayerInfo;
            }>((acc, next) => {
                acc[next.id] = next;
                return acc;
            }, {});
            return { allPlayerInfo, playerInfoByID };
        },
        enabled: !!gameID,
    });
    return query;
};

export const useGamesQuery = () => {
    const query = useQuery({
        queryKey: ["games"],
        queryFn: async () => {
            const games = await fetchGames();
            return games;
        },
        staleTime: 6 * 60 * 60 * 1000,
    });
    return query;
};

export const usePointRulesetsQuery = () => {
    const query = useQuery({
        queryKey: ["pointRulesets"],
        queryFn: async () => {
            const rulesets = await fetchRulesets();
            return rulesets;
        },
        staleTime: 6 * 60 * 60 * 1000,
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
        staleTime: 6 * 60 * 60 * 1000,
    });
    return query;
};

export const useMovesByPokemonQuery = (dex?: ModdedDex) => {
    const query = useQuery({
        queryKey: ["movesByPokemon", dex?.modid],
        queryFn: async () => {
            const movesByPokemon = await fetchMovesByPokemon(dex!);
            return movesByPokemon;
        },
        enabled: !!dex,
        initialData: {},
    });
    return query;
};
