import {
    useState,
    useEffect,
    Dispatch,
    SetStateAction,
    useMemo,
    useContext,
} from "react";
import { useParams } from "react-router-dom";
import supabase from "@/supabase";
import { gamePlayerTable, gameSelectionTable } from "@/util/DatabaseTables";
import {
    Accordion,
    Button,
    Center,
    Checkbox,
    Divider,
    Grid,
    Group,
    Stack,
    Text,
    TextInput,
    Title,
} from "@mantine/core";
import classes from "@/App.module.css";
import { Pokemon } from "@/types";
import {
    BasicStatDisplay,
    CardOnClick,
    PokemonCard,
    PokemonPill,
    PokemonTooltip,
} from "@/components/PokeView/View";
import { Loading } from "../Loading/Loading";
import { useDebouncedState, useScrollIntoView } from "@mantine/hooks";
import { AppContext } from "@/App";
import { notifications } from "@mantine/notifications";
import { RulesetView } from "../Ruleset/Ruleset";
import getGenerationName from "@/util/GenerationName";
import { searchPokemon } from "@/util/Pokemon";
import {
    PlayerInfo,
    PointRulesetInfo,
    fetchGameInfo,
    fetchPlayerInfoByID,
    fetchPokemonByPlayerID,
} from "@/util/database";

type ValueByPokemonID = { [pokemonID: string]: number };
const getPointLabel = (
    pokemon: Pokemon,
    valueByPokemonID: ValueByPokemonID
): string => {
    let pointLabel = "1 Point";
    if (pokemon.data.id in valueByPokemonID) {
        const value = valueByPokemonID[pokemon.data.id];
        pointLabel = value === 0 ? "Banned" : `${value} Points`;
    }
    return pointLabel;
};

const getPointTotal = (
    playerID: string,
    selectionData: SelectionData,
    valueByPokemonID: ValueByPokemonID
): number => {
    const pokemons = selectionData[playerID] ?? [];
    return pokemons.reduce((acc, next) => {
        return acc + (valueByPokemonID[next.data.id] ?? 1);
    }, 0);
};

type SelectionData = { [id: string]: Pokemon[] };
export const SelectionAccordion = ({
    open,
    setOpen,
    isMinimal,
    selectionData,
    playerInfoByID,
    valueByPokemonID,
    cardOnClick,
}: {
    open: string[];
    setOpen: Dispatch<SetStateAction<string[]>>;
    isMinimal: boolean;
    selectionData: SelectionData;
    playerInfoByID: { [id: string]: PlayerInfo };
    valueByPokemonID: ValueByPokemonID;
    cardOnClick?: CardOnClick;
}) => {
    const PokemonDisplay = isMinimal ? PokemonPill : PokemonCard;
    return (
        <Accordion
            value={open}
            onChange={setOpen}
            multiple={true}
            variant={isMinimal ? "filled" : "separated"}
        >
            {Object.entries(playerInfoByID)
                .sort((a, b) => b[1].priority - a[1].priority)
                .map(([playerID, playerInfo]) => (
                    <Accordion.Item key={playerID} value={playerID}>
                        <Accordion.Control>
                            <Text>
                                {`${playerInfo.name} `}
                                {` - ${playerInfo.rules.maxPoints -
                                    getPointTotal(
                                        playerID,
                                        selectionData,
                                        valueByPokemonID
                                    )
                                    }/${playerInfo.rules.maxPoints} Points Left`}
                                {` - ${selectionData[playerID].length}/${playerInfo.rules.maxTeamSize} Pokemon Chosen`}
                            </Text>
                        </Accordion.Control>
                        <Accordion.Panel>
                            {open && open.includes(playerID) ? (
                                <Group justify="center" ta="center">
                                    {selectionData[playerID]?.map((pokemon) => (
                                        <PokemonTooltip
                                            pokemon={pokemon}
                                            key={pokemon.data.id}
                                        >
                                            <PokemonDisplay
                                                pokemon={pokemon}
                                                onClick={cardOnClick}
                                            />
                                            <Text>
                                                {getPointLabel(
                                                    pokemon,
                                                    valueByPokemonID
                                                )}
                                            </Text>
                                        </PokemonTooltip>
                                    )) || <Text>No Selections</Text>}
                                </Group>
                            ) : null}
                        </Accordion.Panel>
                    </Accordion.Item>
                ))}
        </Accordion>
    );
};

const smogonOnClick = (pokemon: Pokemon, generation?: number) =>
    window.open(
        `https://www.smogon.com/dex/${getGenerationName(generation)}/pokemon/${pokemon.data.name}/`
    );

const PokemonSelector = ({
    pointRuleset,
    onSelect,
    search,
    setSearch,
}: {
    pointRuleset: PointRulesetInfo;
    onSelect?: (pokemon: Pokemon) => any;
    search: string;
    setSearch: (newValue: string) => void;
}) => {
    const pokemon = useMemo(() => {
        return searchPokemon(search.trim(), pointRuleset.generation);
    }, [search]);

    const PokemonInfo = (
        <>
            {onSelect && (
                <Button onClick={() => onSelect(pokemon)}>
                    Select Pokemon
                </Button>
            )}
            <Title>
                {getPointLabel(pokemon, pointRuleset.valueByPokemonID)}
            </Title>
            <Center>
                <PokemonCard
                    pokemon={pokemon}
                    onClick={() =>
                        smogonOnClick(pokemon, pointRuleset.generation)
                    }
                />
            </Center>
            <Title>Stats</Title>
            <BasicStatDisplay pokemon={pokemon} />
        </>
    );

    let error_msg = null;
    if (!pokemon.data.exists) error_msg = `Couldn't find ${search}`
    else if (pokemon.data.gen > pointRuleset.generation) error_msg = `${pokemon.data.name} isn't in generation ${pointRuleset.generation}`

    const SearchError = error_msg && <Title order={2}>{error_msg}</Title>;

    return (
        <>
            <TextInput
                label="Search for a Pokemon"
                placeholder="Pokemon Name"
                defaultValue={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
            />
            {search.trim() && (SearchError || PokemonInfo)}
        </>
    );
};

const Game = ({ game }: { game: string }) => {
    const { session } = useContext(AppContext);

    const [trigger, setTrigger] = useState(0);

    const [gameName, setGameName] = useState<string>("");

    const [playerInfoByID, setPlayerInfoByID] = useState<{
        [id: string]: PlayerInfo;
    }>();

    const [pokemonByPlayerID, setPokemonByPlayerID] = useState<{
        [id: string]: Pokemon[];
    }>();

    const [pointRuleset, setPointRuleset] = useState<PointRulesetInfo>();

    const [open, setOpen] = useState<string[]>([]);
    const [isMinimal, setIsMinimal] = useState(false);

    const { scrollIntoView: scrollToSelector, targetRef: selectionRef } =
        useScrollIntoView<HTMLHeadingElement>();
    const [search, setSearch] = useDebouncedState("", 150);
    const rulesetCardOnClick: CardOnClick = (pokemon) => {
        setSearch(pokemon.data.id);
        scrollToSelector();
    };

    const { scrollIntoView: scrollToRuleset, targetRef: rulesetRef } =
        useScrollIntoView<HTMLDivElement>();

    useEffect(() => {
        const select = supabase
            .channel("game-selections")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: gameSelectionTable,
                    filter: `game=eq.${game}`,
                },
                (payload) => {
                    console.log("Change received for selections!", payload);
                    setTrigger((last) => last + 1); // Trigger mechanism, b/c putting function here captures stale values. Def a better way to do this so TODO
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
                    filter: `game=eq.${game}`,
                },
                (payload) => {
                    console.log("Change received for players!", payload);
                    setTrigger((last) => last + 1);
                    notifications.show({
                        title: "Update",
                        message: "A player update was triggered",
                    });
                }
            )
            .subscribe();
        return () => {
            supabase.removeChannel(select);
            supabase.removeChannel(join);
        };
    }, [game]);

    useEffect(() => {
        if (!game) return;
        (async () => {
            const gameInfo = await fetchGameInfo(supabase, game);
            if (gameInfo) {
                setGameName(gameInfo.name);
                setPointRuleset(gameInfo.pointRuleset);
            }
            const playerInfoByID = await fetchPlayerInfoByID(supabase, game);
            if (playerInfoByID) setPlayerInfoByID(playerInfoByID);
        })();
    }, [game, trigger]);

    useEffect(() => {
        if (!game || !pointRuleset) return;
        (async () => {
            const pokemonByPlayerID = await fetchPokemonByPlayerID(
                supabase,
                game,
                pointRuleset
            );
            if (pokemonByPlayerID) {
                setPokemonByPlayerID(pokemonByPlayerID);
                setOpen(Object.keys(pokemonByPlayerID));
            }
        })();
    }, [game, pointRuleset, trigger]);

    if (!pointRuleset || !playerInfoByID || !pokemonByPlayerID || false)
        return <Loading />;

    const getCurrentTurnPlayerID = () => {
        const ids = Object.keys(playerInfoByID);
        if (ids.length < 2) return;
        const totalByID = Object.keys(playerInfoByID).reduce<{
            [id: string]: number;
        }>((acc, next) => {
            acc[next] = getPointTotal(
                next,
                pokemonByPlayerID,
                pointRuleset.valueByPokemonID
            );
            return acc;
        }, {});

        const filteredForLimits = ids.filter((id) => {
            const rulesetForPlayer = playerInfoByID[id].rules;
            const hasPoints = totalByID[id] < rulesetForPlayer.maxPoints;
            const enoughRoom =
                (pokemonByPlayerID[id] ?? []).length <
                rulesetForPlayer.maxTeamSize;
            return hasPoints && enoughRoom;
        });

        const lowestCount = Math.min(
            ...filteredForLimits.map((id) => pokemonByPlayerID[id]?.length ?? 0)
        );
        const filteredForRound = filteredForLimits.filter((id) => {
            const hasNotPickedThisRound =
                (pokemonByPlayerID[id]?.length ?? 0) == lowestCount;
            return hasNotPickedThisRound;
        });

        filteredForRound.sort(
            (a, b) =>
                (playerInfoByID[b].priority ?? 0) -
                (playerInfoByID[a].priority ?? 0)
        );
        if (lowestCount % 2 == 1) filteredForRound.reverse();

        return filteredForRound?.[0];
    };
    const currentTurnPlayerID = getCurrentTurnPlayerID();

    const getIsMyTurn = (): boolean => {
        if (!session) return false;
        return currentTurnPlayerID === session.user.id;
    };

    const getIsJoinable = () => {
        const counts = Object.keys(playerInfoByID).map(
            (id) => pokemonByPlayerID[id]?.length ?? 0
        );
        const lowestCount = counts.length ? Math.min(...counts) : 0;
        return (
            lowestCount === 0 && session && !(session.user.id in playerInfoByID)
        );
    };

    const joinGame = async () => {
        const { error } = await supabase.from(gamePlayerTable).insert([
            {
                game,
                player: session?.user.id,
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
            message: `Welcome to ${gameName}!`,
        });
    };

    const alreadyChosenPokemon = (pokemon: Pokemon): boolean => {
        for (const id in pokemonByPlayerID) {
            const pokemons = pokemonByPlayerID[id];
            if (pokemons.map((p) => p.data.id).includes(pokemon.data.id))
                return false;
        }
        return true;
    };

    const selectPokemon = getIsMyTurn()
        ? async (pokemon: Pokemon) => {
            if (!session)
                return notifications.show({
                    color: "red",
                    title: "Not Logged In",
                    message: "You need to be logged in! How did you do this?",
                });
            if (!(session.user.id in playerInfoByID))
                return notifications.show({
                    color: "red",
                    title: "Not in the Game",
                    message:
                        "You need to be in the game! How did you do this?",
                });

            const value = pointRuleset.valueByPokemonID[pokemon.data.id];
            if (value === 0)
                return notifications.show({
                    color: "red",
                    title: "Banned Pokemon",
                    message: `${pokemon.data.name} is a banned Pokemon!`,
                });

            const currentPointTotal = getPointTotal(
                session.user.id,
                pokemonByPlayerID,
                pointRuleset.valueByPokemonID
            );

            const rulesetForPlayer = playerInfoByID[session.user.id].rules;
            if (currentPointTotal + value > rulesetForPlayer.maxPoints)
                return notifications.show({
                    color: "red",
                    title: "You don't have enough points",
                    message: `${pokemon.data.name} is worth too many points!`,
                });

            const { error } = await supabase.from(gameSelectionTable).insert([
                {
                    game,
                    pokemon_id: pokemon.data.id,
                    player: session.user.id,
                },
            ]);
            if (error)
                return notifications.show({
                    color: "red",
                    title: "Couldn't Select Pokemon",
                    message: `${error.message}`,
                });
            notifications.show({
                title: "Added your selection",
                message: `You have added ${pokemon.data.name} to your team`,
            });
        }
        : undefined;

    return (
        <Center>
            <Stack justify="center" ta="center" w="80%">
                <Title className={classes.title} ta="center">
                    Game:{" "}
                    <Text
                        inherit
                        variant="gradient"
                        component="span"
                        gradient={{ from: "pink", to: "yellow" }}
                    >
                        {gameName}
                    </Text>
                </Title>
                {getIsJoinable() ? (
                    <Button onClick={joinGame}>Join Game</Button>
                ) : (
                    session &&
                    !(session.user.id in playerInfoByID) && (
                        <Text>Game isn't accepting anymore players</Text>
                    )
                )}
                <Title order={3}>
                    Point Ruleset:{" "}
                    <Text
                        inherit
                        variant="gradient"
                        component="span"
                        gradient={{ from: "pink", to: "yellow" }}
                        onClick={() => scrollToRuleset()}
                        className={classes.pointer}
                    >
                        {pointRuleset.name}
                    </Text>
                </Title>
                {currentTurnPlayerID ? (
                    <Title order={3}>
                        {playerInfoByID[currentTurnPlayerID].name}'s Turn To
                        Pick
                    </Title>
                ) : Object.keys(playerInfoByID).length < 2 ? (
                    <Title>Game hasn't started</Title>
                ) : (
                    <Title>Drafting is Complete</Title>
                )}
                <Grid mih="100vh">
                    <Grid.Col span={3}>
                        <Stack align="left" ta="left">
                            <Title ref={selectionRef}>Make a selection</Title>
                            <PokemonSelector
                                pointRuleset={pointRuleset}
                                onSelect={selectPokemon}
                                search={search}
                                setSearch={setSearch}
                            />
                        </Stack>
                    </Grid.Col>
                    <Grid.Col ta="right" span={9}>
                        <Stack>
                            <Title>Player Selections</Title>
                            <Group justify="right">
                                <Text>Display Options:</Text>
                                <Checkbox
                                    checked={isMinimal}
                                    onChange={(e) =>
                                        setIsMinimal(e.currentTarget.checked)
                                    }
                                    label="Minimal View?"
                                />
                            </Group>
                            <SelectionAccordion
                                playerInfoByID={playerInfoByID}
                                open={open}
                                setOpen={setOpen}
                                selectionData={pokemonByPlayerID}
                                isMinimal={isMinimal}
                                valueByPokemonID={pointRuleset.valueByPokemonID}
                                cardOnClick={smogonOnClick}
                            />
                        </Stack>
                    </Grid.Col>
                </Grid>
                <Divider ref={rulesetRef} />
                <RulesetView
                    ruleset={pointRuleset.id}
                    cardOnClick={rulesetCardOnClick}
                    extraRulePredicates={[alreadyChosenPokemon]}
                />
            </Stack>
        </Center>
    );
};

export const GamePage = () => {
    const { id } = useParams();
    return id && <Game game={id} />;
};
