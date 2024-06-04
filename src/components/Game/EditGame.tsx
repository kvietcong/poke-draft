import classes from "@/App.module.css";
import { GameIDContext, PointRulesetIDContext, useGameID } from "@/Context";
import {
    useGameInfoQuery,
    useGamePlayersQuery,
    usePointRulesetQuery,
    usePointRulesetsQuery,
} from "@/queries";
import {
    Button,
    Center,
    Group,
    Modal,
    NumberInput,
    Select,
    Stack,
    Text,
    TextInput,
    Title,
} from "@mantine/core";
import { useNavigate, useParams } from "react-router-dom";
import { Loading } from "../Loading/Loading";
import { useCallback, useMemo } from "react";
import { GameStage, PointRuleset } from "@/types";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { RulesetView } from "../Ruleset/Ruleset";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import supabase from "@/supabase";
import { gamePlayerTable, gameTable } from "@/util/database";
import { TextEditor } from "../TextEditor";
import { Link } from "@mantine/tiptap";
import { useEditor } from "@tiptap/react";
import Highlight from "@tiptap/extension-highlight";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Superscript from "@tiptap/extension-superscript";
import SubScript from "@tiptap/extension-subscript";
import { notifications } from "@mantine/notifications";
import { useSessionStore } from "@/stores";

type GamePlayerInfo = {
    name: string;
    playerID: string;
    gamePlayerID: string;
    priority: number;
    privileges: number;
    rules: {
        maxPoints: number;
        maxTeamSize: number;
    };
};
type GameFormData = {
    name: string;
    notes: string;
    pointRulesetID: string;
    gamePlayers: GamePlayerInfo[];
};

export const updateGame = async (gameID: string, data: GameFormData) => {
    const gameResponse = await supabase
        .from(gameTable)
        .update({
            name: data.name,
            point_ruleset: data.pointRulesetID,
            notes: data.notes,
        })
        .eq("id", gameID);
    if (gameResponse.error) throw gameResponse.error;

    for (const gamePlayer of data.gamePlayers) {
        const payload = {
            priority: gamePlayer.priority,
            max_points: gamePlayer.rules.maxPoints,
            max_team_size: gamePlayer.rules.maxTeamSize,
            privileges: gamePlayer.privileges,
        };
        const ruleResponse = await supabase
            .from(gamePlayerTable)
            .update(payload)
            .eq("id", gamePlayer.gamePlayerID);
        if (ruleResponse.error) throw ruleResponse.error;
    }

    const gamePlayerIDs = `(${data.gamePlayers.map((p) => `"${p.gamePlayerID}"`).join(",")})`;
    const deleteResponse = await supabase
        .from(gamePlayerTable)
        .delete()
        .not("id", "in", gamePlayerIDs)
        .eq("game", gameID);
    if (deleteResponse.error) throw deleteResponse.error;
};

const EditGame = () => {
    const gameID = useGameID();
    const gameInfoQuery = useGameInfoQuery(gameID);
    const pointRulesetsQuery = usePointRulesetsQuery();
    const gamePlayersQuery = useGamePlayersQuery(gameID);
    const userID = useSessionStore((state) => state.session?.user?.id)!;

    const gameInfo = gameInfoQuery.data!;
    const pointRulesetsByID = pointRulesetsQuery.data!.reduce<{
        [gamePlayerID: string]: PointRuleset;
    }>((acc, next) => {
        acc[next.id] = next;
        return acc;
    }, {});

    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const gameMutation = useMutation({
        mutationFn: ({
            gameID,
            data,
        }: {
            gameID: string;
            data: GameFormData;
        }) => updateGame(gameID, data),
        onSuccess: async (_, { gameID }) => {
            queryClient.invalidateQueries({ queryKey: ["gameInfo", gameID] });
            queryClient.invalidateQueries({
                queryKey: ["gamePlayers", gameID],
            });
            navigate("..", { relative: "path" });
        },
        onError: async (error, context) => {
            console.error({ error, context });
            notifications.show({
                color: "red",
                title: `Couldn't update game (${error.name})`,
                message: error.message,
            });
        },
    });

    const [isRulesetModal, rulesetModalHandlers] = useDisclosure(false);

    const form = useForm<GameFormData>({
        mode: "uncontrolled",
        initialValues: {
            name: gameInfo.name,
            notes: gameInfo.notes,
            pointRulesetID: gameInfo.pointRuleset,
            gamePlayers: gamePlayersQuery
                .data!.allPlayerInfo.map((playerInfo) => {
                    return {
                        name: playerInfo.name,
                        playerID: playerInfo.id,
                        gamePlayerID: playerInfo.gamePlayerID,
                        priority: playerInfo.priority,
                        rules: playerInfo.rules,
                        privileges: playerInfo.privileges,
                    };
                })
                .toSorted((a, b) => b.priority - a.priority),
        },
    });

    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Link,
            Superscript,
            SubScript,
            Highlight,
            TextAlign.configure({ types: ["heading", "paragraph"] }),
        ],
        content: gameInfo.notes,
        onUpdate: ({ editor }) => {
            form.setFieldValue("notes", editor.getHTML());
        },
    })!;

    const pointRulesetQuery = usePointRulesetQuery(
        form.getValues().pointRulesetID
    );

    if (pointRulesetQuery.isError)
        throw new Error("Couldn't get point ruleset info");

    const onSubmit = useCallback(
        (data: GameFormData) => {
            gameMutation.mutate({ gameID, data });
        },
        [gameMutation]
    );

    const rulesetID = form.getValues().pointRulesetID;

    const Ruleset = useMemo(
        () => (
            <PointRulesetIDContext.Provider value={rulesetID}>
                {<RulesetView />}
            </PointRulesetIDContext.Provider>
        ),
        [rulesetID]
    );

    const RulesetModal = (
        <Modal
            opened={isRulesetModal}
            onClose={rulesetModalHandlers.close}
            title="Point Ruleset"
            radius="md"
            size="85%"
            keepMounted={true}
            centered
        >
            {pointRulesetQuery.isPending ? <Loading /> : Ruleset}
        </Modal>
    );

    const isOwnerEditing = userID === gameInfo.owner;
    const isJoining = gameInfo.gameStage < GameStage.Battling;

    const PlayerRule = useCallback(
        ({
            gamePlayer,
            index,
        }: {
            gamePlayer: GamePlayerInfo;
            index: number;
        }) => {
            const isOwner = gamePlayer.playerID === gameInfo.owner;
            return (
                <Stack>
                    <Title order={4}>{gamePlayer.name}</Title>
                    <Button
                        onClick={() =>
                            form.removeListItem("gamePlayers", index)
                        }
                        disabled={!(!isOwner && isJoining)}
                    >
                        Kick
                    </Button>
                    <Group grow>
                        <Text>
                            Privilege Level (
                            {isOwner ? "No effect on owner" : "> 0 is an admin"}
                            )
                        </Text>
                        <NumberInput
                            value={gamePlayer.privileges}
                            onChange={(value) => {
                                form.setFieldValue(
                                    `gamePlayers.${index}.privileges`,
                                    value
                                );
                            }}
                            disabled={!isOwnerEditing}
                        />
                    </Group>
                    <Group grow>
                        <Text>Priority Level</Text>
                        <NumberInput
                            value={gamePlayer.priority}
                            onChange={(value) => {
                                form.setFieldValue(
                                    `gamePlayers.${index}.priority`,
                                    value
                                );
                            }}
                            disabled={!isJoining}
                        />
                    </Group>
                    <Group grow>
                        <Text>Max Points</Text>
                        <NumberInput
                            value={gamePlayer.rules.maxPoints}
                            onChange={(value) =>
                                form.setFieldValue(
                                    `gamePlayers.${index}.rules.maxPoints`,
                                    value
                                )
                            }
                            disabled={!isJoining}
                        />
                    </Group>
                    <Group grow>
                        <Text>Max Team Size</Text>
                        <NumberInput
                            value={gamePlayer.rules.maxTeamSize}
                            onChange={(value) =>
                                form.setFieldValue(
                                    `gamePlayers.${index}.rules.maxTeamSize`,
                                    value
                                )
                            }
                            disabled={!isJoining}
                        />
                    </Group>
                    <hr style={{ width: "100%" }} />
                </Stack>
            );
        },
        []
    );

    return (
        <>
            {RulesetModal}
            <Center>
                <Stack w="80%">
                    <Title className={classes.title} ta="center">
                        Editing Game:{" "}
                        <Text
                            inherit
                            variant="gradient"
                            component="span"
                            gradient={{ from: "pink", to: "yellow" }}
                        >
                            {gameInfo.name}
                        </Text>
                    </Title>
                    <form onSubmit={form.onSubmit(onSubmit)}>
                        <Stack>
                            <Text>Name</Text>
                            <TextInput {...form.getInputProps("name")} />
                            <Text>Point Ruleset</Text>
                            <Select
                                searchable
                                allowDeselect={false}
                                data={Object.entries(
                                    pointRulesetsByID
                                ).map(([id, info]) => ({
                                    label: info.name,
                                    value: id,
                                }))}
                                disabled={!isJoining}
                                {...form.getInputProps(
                                    "pointRulesetID"
                                )}
                            />
                            <Button
                                onClick={() =>
                                    rulesetModalHandlers.open()
                                }
                            >
                                Show Ruleset
                            </Button>
                            <Title>Player Rules</Title>
                            <Stack>
                                {form
                                    .getValues()
                                    .gamePlayers.map((gamePlayer, i) => {
                                        return (
                                            <PlayerRule
                                                key={gamePlayer.playerID}
                                                gamePlayer={gamePlayer}
                                                index={i}
                                            />
                                        );
                                    })}
                            </Stack>
                            <Button onClick={() => form.reset()}>Reset</Button>
                            <TextEditor editor={editor} />
                            <input type="submit" />
                        </Stack>
                    </form>
                </Stack>
            </Center>
        </>
    );
};

export const EditGamePage = () => {
    const { id } = useParams();
    if (!id) throw new Error("No Game ID Given!");

    const gameInfoQuery = useGameInfoQuery(id);
    const pointRulesets = usePointRulesetsQuery();
    const gamePlayersQuery = useGamePlayersQuery(id);
    const userID = useSessionStore((state) => state.session?.user?.id);

    if (
        gameInfoQuery.isError ||
        pointRulesets.isError ||
        gamePlayersQuery.isError
    )
        throw new Error("Couldn't fetch game info");

    if (
        gameInfoQuery.isPending ||
        pointRulesets.isPending ||
        gamePlayersQuery.isPending
    )
        return <Loading />;

    if (
        !userID ||
        (!gamePlayersQuery.data.playerInfoByID[userID].privileges &&
            gamePlayersQuery.data.playerInfoByID[userID].id !==
            gameInfoQuery.data.owner)
    )
        throw new Error("You don't have the permissions to view this page");

    return (
        <GameIDContext.Provider value={id}>
            <EditGame />
        </GameIDContext.Provider>
    );
};
