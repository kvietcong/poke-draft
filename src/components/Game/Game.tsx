import {
    ReactNode,
    memo,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import supabase from "@/supabase";
import classes from "@/App.module.css";
import { GameStage, PlayerInfo, Pokemon } from "@/types";
import { notifications } from "@mantine/notifications";
import {
    gamePlayerTable,
    gameSelectionTable,
    tradeConfirmationTable,
    tradeTable,
    gameTable,
} from "@/util/database";
import { GameIDContext, PointRulesetIDContext, useGameID } from "@/Context";
import {
    useCurrentDrafterQuery,
    useGameInfoQuery,
    useGamePlayersQuery,
    useGameTradesQuery,
    usePointRulesetQuery,
} from "@/queries";
import { useSessionStore } from "@/stores";
import { Loading } from "../Loading/Loading";
import {
    Button,
    Group,
    Tabs,
    Text,
    Title,
    Stack,
    Modal,
    Burger,
    Collapse,
} from "@mantine/core";
import { RulesetView } from "../Ruleset/Ruleset";
import { TradesTab } from "./TradesTab";
import { useDisclosure, useViewportSize } from "@mantine/hooks";
import { SelectionsTab } from "./SelectionsTab";
import { GameInfoTab } from "./GameInfoTab";
import { createPortal } from "react-dom";
import { PokemonSelector } from "./PokemonSelector";

const GameTitle = () => {
    const gameID = useGameID();
    const gameInfo = useGameInfoQuery(gameID).data!;

    return (
        <Title className={classes.title} ta="center">
            Game:{" "}
            <Text
                inherit
                variant="gradient"
                component="span"
                gradient={{ from: "pink", to: "yellow" }}
            >
                {gameInfo.name}
            </Text>
        </Title>
    );
};

export const InsertIntoGameToolBar = ({
    children,
}: {
    children?: ReactNode;
}) => {
    const toolbarElement = document.getElementById("game-toolbar");
    if (!toolbarElement) return;
    return createPortal(children, toolbarElement);
};

const getChosenPokemonPredicate =
    (allPlayerInfo: PlayerInfo[]) =>
    (pokemon: Pokemon): boolean => {
        for (const info of allPlayerInfo) {
            if (
                Object.values(info.selections)
                    .map((p) => p.data.id)
                    .includes(pokemon.data.id)
            )
                return false;
        }
        return true;
    };

const GameTabsMemo = memo(() => {
    const { tab } = useParams();
    const gameID = useGameID();
    const gameInfo = useGameInfoQuery(gameID).data!;
    const canTrade = gameInfo.gameStage === GameStage.Battling;
    const navigate = useNavigate();

    return (
        <Tabs
            value={tab}
            styles={{ panel: { paddingTop: "15px" } }}
            onChange={(value) => navigate(`../${value}`, { relative: "path" })}
        >
            <Tabs.List grow>
                <Tabs.Tab value="info">Info</Tabs.Tab>
                <Tabs.Tab value="selections">Selections</Tabs.Tab>
                <Tabs.Tab disabled={!canTrade} value="trades">
                    Trades
                </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="info">
                <GameInfoTab />
            </Tabs.Panel>
            <Tabs.Panel value="selections">
                <SelectionsTab />
            </Tabs.Panel>
            <Tabs.Panel value="trades">
                {canTrade ? <TradesTab /> : "Not allowed atm"}
            </Tabs.Panel>
        </Tabs>
    );
});

const RulesetViewMemo = memo((props: Parameters<typeof RulesetView>[0]) => {
    return <RulesetView {...props} />;
});

const Game = () => {
    const { tab } = useParams();
    if (!["info", "selections", "trades"].includes(tab!))
        throw new Error("Not a valid game tab");

    const gameID = useGameID();
    const gameInfo = useGameInfoQuery(gameID).data!;
    const { allPlayerInfo, playerInfoByID } = useGamePlayersQuery(gameID).data!;
    const currentDrafter = useCurrentDrafterQuery(gameID).data;

    const session = useSessionStore((state) => state.session);

    const [isRulesetModal, rulesetModalHandlers] = useDisclosure(false);
    const [isSelectModal, selectModalHandlers] = useDisclosure(false);
    const [isNavOpen, navHandlers] = useDisclosure(false);
    const [search, setSearch] = useState("");

    const { width } = useViewportSize();
    const isThinScreen = width < 800;

    const extraRulePredicates = useMemo(() => {
        return [getChosenPokemonPredicate(allPlayerInfo)];
    }, [allPlayerInfo]);

    const sendPokemonToSelector = useCallback(
        (pokemon: Pokemon) => {
            rulesetModalHandlers.close();
            selectModalHandlers.open();
            setSearch(pokemon.data.id);
        },
        [rulesetModalHandlers.close, selectModalHandlers.open]
    );

    const isUserInGame = session && session.user.id in playerInfoByID;
    const willLoadSelector =
        gameInfo.gameStage === GameStage.Drafting && isUserInGame;

    return (
        <Stack w="80%" m="auto">
            <Modal
                opened={isRulesetModal}
                onClose={rulesetModalHandlers.close}
                title="Point Ruleset"
                radius="md"
                size="85%"
                keepMounted={true}
                centered
            >
                <RulesetViewMemo
                    extraRulePredicates={extraRulePredicates}
                    cardOnClick={
                        willLoadSelector ? sendPokemonToSelector : undefined
                    }
                />
            </Modal>
            {willLoadSelector && (
                <Modal
                    opened={isSelectModal}
                    onClose={selectModalHandlers.close}
                    title="Choose a Pokemon"
                    radius="md"
                    size="85%"
                    keepMounted={true}
                    centered
                >
                    <PokemonSelector search={search} setSearch={setSearch}>
                        <Button
                            onClick={() => {
                                selectModalHandlers.close();
                                rulesetModalHandlers.open();
                            }}
                        >
                            See Other Pokemon
                        </Button>
                    </PokemonSelector>
                </Modal>
            )}
            <GameTitle />
            <GameTabsMemo />
            <Group pos="sticky" bottom={15} justify="flex-end">
                <Collapse in={isNavOpen || !isThinScreen}>
                    <Group id="game-toolbar" justify="flex-end">
                        {willLoadSelector && (
                            <Button onClick={selectModalHandlers.open}>
                                Choose Pokemon
                                {currentDrafter &&
                                    currentDrafter === session.user.id &&
                                    " (Your Turn)"}
                            </Button>
                        )}
                        <Button onClick={rulesetModalHandlers.open}>
                            See Pokemon
                        </Button>
                    </Group>
                </Collapse>
                <Burger
                    opened={isNavOpen}
                    onClick={navHandlers.toggle}
                    display={isThinScreen ? undefined : "none"}
                />
            </Group>
        </Stack>
    );
};

export const GamePage = () => {
    const { id } = useParams();
    if (!id) throw new Error("No Game ID Given!");

    const gameInfoQuery = useGameInfoQuery(id);
    const currentDrafterQuery = useCurrentDrafterQuery(id);
    const gameTradesQuery = useGameTradesQuery(id);
    const gamePlayersQuery = useGamePlayersQuery(id);
    const pointRulesetQuery = usePointRulesetQuery(
        gameInfoQuery.data?.pointRuleset
    );

    useEffect(() => {
        const update = supabase
            .channel("game-update")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: gameTable,
                    filter: `id=eq.${id}`,
                },
                (payload) => {
                    console.log("Change received for game!", payload);
                    gameInfoQuery.refetch();
                    currentDrafterQuery.refetch();
                    notifications.show({
                        title: "Update",
                        message: "A game update was triggered",
                    });
                }
            )
            .subscribe();
        const select = supabase
            .channel("game-selections")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: gameSelectionTable,
                    filter: `game=eq.${id}`,
                },
                (payload) => {
                    console.log("Change received for selections!", payload);
                    gamePlayersQuery.refetch();
                    currentDrafterQuery.refetch();
                    notifications.show({
                        title: "Update",
                        message: "A team update was triggered",
                    });
                }
            )
            .subscribe();
        const join = supabase
            .channel("game-joining")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: gamePlayerTable,
                    filter: `game=eq.${id}`,
                },
                (payload) => {
                    console.log("Change received for players!", payload);
                    gamePlayersQuery.refetch();
                    currentDrafterQuery.refetch();
                    notifications.show({
                        title: "Update",
                        message: "A player update was triggered",
                    });
                }
            )
            .subscribe();
        return () => {
            supabase.removeChannel(select);
            supabase.removeChannel(update);
            supabase.removeChannel(join);
        };
    }, [id]);

    const gameTrades = gameTradesQuery.data;
    const playerInfoByID = gamePlayersQuery.data?.playerInfoByID;
    useEffect(() => {
        if (!gameTrades || !playerInfoByID) return;

        const trades = supabase
            .channel("new-game-trade-confirmations")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: tradeConfirmationTable,
                    filter: `trade=in.(${gameTrades.map((t) => t.id).join(",")})`,
                },
                (payload) => {
                    console.log("New Trade Confirmation Received!", payload);
                    gameTradesQuery.refetch();
                    const playerID = (payload.new as any).participant as string;
                    const playerName = playerInfoByID[playerID].name;
                    notifications.show({
                        title: "Trade Update",
                        message: `${playerName} confirmed trade ${(payload.new as any).trade}`,
                    });
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: tradeTable,
                    filter: `game=eq.${id}`,
                },
                (payload) => {
                    console.log("Trade Update Received!", payload);
                    gameTradesQuery.refetch();
                    const action =
                        payload.eventType === "INSERT"
                            ? "created"
                            : "executed/rejcted";
                    notifications.show({
                        title: "Trade Update",
                        message: `Someone ${action} a trade!`,
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(trades);
        };
    }, [gameTrades, playerInfoByID]);

    if (
        pointRulesetQuery.isPending ||
        gamePlayersQuery.isPending ||
        gameInfoQuery.isPending ||
        currentDrafterQuery.isLoading ||
        gameTradesQuery.isLoading
    )
        return <Loading />;

    if (
        gameInfoQuery.isError ||
        currentDrafterQuery.isError ||
        gameTradesQuery.isError ||
        gamePlayersQuery.isError ||
        pointRulesetQuery.isError
    )
        throw new Error("Failed to fetch data");

    return (
        <GameIDContext.Provider value={id}>
            <PointRulesetIDContext.Provider
                value={gameInfoQuery.data.pointRuleset}
            >
                <Game />
            </PointRulesetIDContext.Provider>
        </GameIDContext.Provider>
    );
};
