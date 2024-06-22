import { useGameID, usePointRulesetID } from "@/Context";
import {
    useCurrentDrafterQuery,
    useGameInfoQuery,
    useGamePlayersQuery,
    usePointRulesetQuery,
} from "@/queries";
import { useSessionStore } from "@/stores";
import { Box, Button, Group, Pill, Text, Stack, Anchor } from "@mantine/core";
import { Link } from "react-router-dom";
import sanitize from "sanitize-html";
import supabase from "@/supabase";
import { GameStage } from "@/types";
import { gamePlayerTable, gameTable } from "@/util/database";
import { notifications } from "@mantine/notifications";

const joinGame = async (gameID: string, userID: string) => {
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

const leaveGame = async (gameID: string, userID: string) => {
    const { error } = await supabase
        .from(gamePlayerTable)
        .delete()
        .eq("game", gameID)
        .eq("player", userID);
    if (error)
        return notifications.show({
            color: "red",
            title: "Couldn't leave game",
            message: `${error.message}`,
        });
    notifications.show({
        title: "Game Left",
        message: "Left successfully",
    });
};

const beginDrafting = async (gameID: string) => {
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

const concludeDrafting = async (gameID: string) => {
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

export const GameInfoTab = () => {
    const gameID = useGameID();
    const gameInfo = useGameInfoQuery(gameID).data!;
    const currentDrafter = useCurrentDrafterQuery(gameID).data;
    const { playerInfoByID, allPlayerInfo } = useGamePlayersQuery(gameID).data!;
    const { pointRulesetInfo } =
        usePointRulesetQuery(usePointRulesetID()).data!;

    const session = useSessionStore((state) => state.session);

    const privilegedUsers = allPlayerInfo.filter(
        (info) => info.privileges > 0 || gameInfo.owner === info.id
    );

    const canUserJoin =
        gameInfo.gameStage === GameStage.Joining &&
        session &&
        !(session.user.id in playerInfoByID);
    const canUserLeave =
        gameInfo.gameStage === GameStage.Joining &&
        session &&
        session.user.id in playerInfoByID &&
        session.user.id !== gameInfo.owner;
    const canBeginDrafting =
        gameInfo.gameStage === GameStage.Joining &&
        session &&
        gameInfo.owner === session.user.id &&
        Object.keys(playerInfoByID).length > 1;
    const canConcudeDrafting =
        !currentDrafter &&
        gameInfo.owner === session?.user.id &&
        gameInfo.gameStage === GameStage.Drafting;

    return (
        <Stack>
            <Group>
                Players:{" "}
                {allPlayerInfo
                    .toSorted((a, b) =>
                        gameInfo.owner === a.id
                            ? -1
                            : gameInfo.owner === b.id
                              ? 1
                              : b.privileges - a.privileges
                    )
                    .map((user) => {
                        const isOwner = user.id === gameInfo.owner;
                        const isAdmin = privilegedUsers
                            .map((u) => u.id)
                            .includes(user.id);
                        const bg = isOwner
                            ? "violet"
                            : isAdmin
                              ? "indigo"
                              : "gray";
                        return (
                            <Pill bg={bg} key={user.id}>
                                {user.name}
                                {isOwner
                                    ? " (Owner)"
                                    : isAdmin
                                      ? " (Admin)"
                                      : ""}
                            </Pill>
                        );
                    })}
            </Group>
            <Text>
                Current Game Stage:{" "}
                <strong>{GameStage[gameInfo.gameStage]}</strong>
            </Text>
            <Text>
                Point Ruleset:{" "}
                <Anchor to={`/ruleset/${pointRulesetInfo.id}`} component={Link}>
                    {pointRulesetInfo.name}
                </Anchor>
            </Text>
            {canUserJoin && (
                <Button onClick={() => joinGame(gameInfo.id, session.user.id)}>
                    Join Game
                </Button>
            )}
            {canUserLeave && (
                <Button onClick={() => leaveGame(gameInfo.id, session.user.id)}>
                    Leave Game
                </Button>
            )}
            {canBeginDrafting && (
                <Button onClick={() => beginDrafting(gameInfo.id)}>
                    Begin Drafting
                </Button>
            )}
            {canConcudeDrafting && (
                <Button onClick={() => concludeDrafting(gameInfo.id)}>
                    Conclude Drafting
                </Button>
            )}
            {gameInfo.notes && (
                <Box
                    ta="left"
                    p="5px"
                    style={{
                        border: "1px solid",
                        borderRadius: "8px",
                    }}
                    dangerouslySetInnerHTML={{
                        __html: sanitize(gameInfo.notes, {
                            allowedAttributes: false,
                            allowVulnerableTags: true,
                        }),
                    }}
                />
            )}
            {session &&
                privilegedUsers.length > 0 &&
                privilegedUsers.map((u) => u.id).includes(session.user.id) && (
                    <Button component={Link} to="../edit/">
                        Edit Game
                    </Button>
                )}
        </Stack>
    );
};
