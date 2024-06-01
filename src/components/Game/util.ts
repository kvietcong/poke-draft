import supabase from "@/supabase";
import { GameStage, PlayerInfo, ValueByPokemonID } from "@/types";
import { gamePlayerTable, gameTable } from "@/util/database";
import { getPointTotal } from "@/util/pokemon";
import { notifications } from "@mantine/notifications";

export const joinGame = async (gameID: string, userID: string) => {
    const { error } = await supabase.from(gamePlayerTable).insert([
        {
            game: gameID,
            player: userID,
        },
    ]);
    if (error)
        return notifications.show({
            color: "red",
            title: "Couldn't join game",
            message: `${error.message}`,
        });
    notifications.show({
        title: "Game Joined",
        message: "Joined successfully",
    });
};

export const beginDrafting = async (gameID: string) => {
    const { error } = await supabase
        .from(gameTable)
        .update([
            {
                game_stage: GameStage.Drafting,
            },
        ])
        .eq("id", gameID);
    if (error)
        return notifications.show({
            color: "red",
            title: "Couldn't begin drafting",
            message: `${error.message}`,
        });
    notifications.show({
        title: "Drafting begins",
        message: "Drafting has commenced",
    });
};

export const concludeDrafting = async (gameID: string) => {
    const { error } = await supabase
        .from(gameTable)
        .update([
            {
                game_stage: GameStage.Battling,
            },
        ])
        .eq("id", gameID);
    if (error)
        return notifications.show({
            color: "red",
            title: "Couldn't conclude drafting",
            message: `${error.message}`,
        });
    notifications.show({
        title: "Drafting concluded",
        message: "Battling has commenced",
    });
};

export const getPlayerIDToLabel =
    (
        playerInfoByID: { [id: string]: PlayerInfo },
        valueByPokemonID: ValueByPokemonID,
        willShowPointInfo: boolean
    ) =>
    (playerID: string) => {
        const playerInfo = playerInfoByID[playerID];
        const playerPokemon = Object.values(playerInfo.selections);
        let label = playerInfo.name;
        if (willShowPointInfo) {
            const { maxPoints, maxTeamSize } = playerInfo.rules;
            const pointsLeft =
                maxPoints - getPointTotal(playerPokemon, valueByPokemonID);
            const teamSize = playerPokemon.length;
            label += ` - ${pointsLeft}/${maxPoints} Points Left - ${teamSize}/${maxTeamSize} Pokemon Chosen`;
        }
        return label;
    };
