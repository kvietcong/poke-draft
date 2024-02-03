import { useState, useEffect, Dispatch, SetStateAction, useMemo } from "react";
import { useParams } from "react-router-dom";
import supabase from "@/supabase";
import {
    gamePlayerTable,
    gameRulesetTable,
    gameSelectionTable,
    gameTable,
    pointRulesetTable,
} from "@/util/DatabaseTables";
import {
    Accordion,
    Center,
    Checkbox,
    Grid,
    Group,
    Stack,
    Text,
    TextInput,
    Title,
} from "@mantine/core";
import classes from "@/App.module.css";
import { Pokemon } from "@/types";
import { BasicStatDisplay, PokemonCard, PokemonPill, PokemonTooltip } from "@/components/PokeView/View";
import { Dex, toID } from "@pkmn/dex";
import { PokemonSprite, Sprites } from "@pkmn/img";
import { Loading } from "../Loading/Loading";
import { useDebouncedState } from "@mantine/hooks";

type SelectionData = { [player: string]: Pokemon[] };
export const SelectionAccordion = ({
    open,
    setOpen,
    isMinimal,
    generation,
    selectionData,
    players,
}: {
    open: string[];
    setOpen: Dispatch<SetStateAction<string[]>>;
    isMinimal: boolean;
    generation?: number;
    selectionData: SelectionData;
    players: string[];
}) => {
    const PokemonDisplay = isMinimal ? PokemonPill : PokemonCard;
    return (
        <Accordion
            value={open}
            onChange={setOpen}
            multiple={true}
            variant={isMinimal ? "filled" : "separated"}
        >
            {players.map((player) => (
                <Accordion.Item key={player} value={player}>
                    <Accordion.Control>{player}</Accordion.Control>
                    <Accordion.Panel>
                        {open && open.includes(player) ? (
                            <Group justify="center">
                                {selectionData[player]?.map((pokemon) => (
                                    <PokemonTooltip pokemon={pokemon}>
                                        <PokemonDisplay
                                            key={pokemon.data.id}
                                            pokemon={pokemon}
                                            generation={generation ?? 9}
                                        />
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

const SelectPokemon = ({ generation }: { generation: number }) => {
    const [search, setSearch] = useDebouncedState("", 500);
    const pokemon = useMemo(() => {
        const data = Dex.species.get(search);
        const pokemon = {
            data: data,
            sprite: Sprites.getDexPokemon(data.id, {
                gen: "gen5ani",
            }) as PokemonSprite,
        };
        return pokemon;
    }, [search]);

    const PokemonInfo = <>
        <PokemonCard pokemon={pokemon} generation={generation} />
        <Title>Stats</Title>
        <BasicStatDisplay pokemon={pokemon}/>
    </>

    return (
        <Stack align="center">
            <TextInput
                label="Search for a Pokemon"
                placeholder="Pokemon Name"
                defaultValue={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
            />
            {search && PokemonInfo}
        </Stack>
    );
};

const Game = ({ game }: { game: string }) => {
    const [gameName, setGameName] = useState<string>("");
    const [gameRuleset, setGameRuleset] = useState<{
        name: string;
        rules: {};
    } | null>(null);

    const [players, setPlayers] = useState<string[]>([]);
    const [pokemonByPlayer, setPokemonByPlayer] = useState<{
        [player: string]: Pokemon[];
    }>({});

    type RulesetInfo = { id: string; generation: number; name: string };
    const [pointRuleset, setPointRuleset] = useState<RulesetInfo | null>(null);

    const [open, setOpen] = useState<string[]>([]);
    const [isMinimal, setIsMinimal] = useState(false);

    const fetchGame = async (game: string) => {
        let { data, error } = await supabase
            .from(gameTable)
            .select(
                `name, ${gameRulesetTable} (name, rules), ${pointRulesetTable} (id, name, generation)`
            )
            .eq("id", game)
            .limit(1)
            .single();
        if (error) return console.error(error);
        if (!data) return console.log("No data received!");
        setGameName(data.name);
        setGameRuleset(data.game_ruleset as any);
        setPointRuleset(data.point_ruleset as unknown as RulesetInfo);
    };

    const fetchPlayers = async (game: string) => {
        let { data, error } = await supabase
            .from(gamePlayerTable)
            .select("player (display_name)")
            .eq("game", game)
            .returns<{ player: { display_name: string } }[]>();
        if (error) return console.error(error);
        if (!data) return console.log("No data received!");
        setPlayers(data.map((x) => x.player.display_name));
    };

    const fetchSelections = async (game: string, pointRuleset: RulesetInfo) => {
        let { data, error } = await supabase
            .from(gameSelectionTable)
            .select("player (display_name), pokemon_id")
            .eq("game", game)
            .returns<
                { player: { display_name: string }; pokemon_id: string }[]
            >();
        if (error) return console.error(error);
        if (!data) return console.log("No data received!");
        const newPokemonByPlayer = data.reduce<{ [player: string]: Pokemon[] }>(
            (acc, next) => {
                const player = next.player.display_name;
                const pokemonID = toID(next.pokemon_id);
                const data = Dex.forGen(
                    pointRuleset.generation
                ).species.getByID(pokemonID);
                const pokemon = {
                    data: data,
                    sprite: Sprites.getDexPokemon(pokemonID, {
                        gen: "gen5ani",
                    }) as PokemonSprite,
                };
                if (player in acc) acc[player].push(pokemon);
                else acc[player] = [pokemon];
                return acc;
            },
            {}
        );
        setPokemonByPlayer(newPokemonByPlayer);
        setOpen(Object.keys(newPokemonByPlayer));
    };

    useEffect(() => {
        const channels = supabase
            .channel("game-selections")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "game_selection",
                    filter: `game=eq.${game}`,
                },
                (payload) => {
                    console.log("Change received for selections!", payload);
                    if (pointRuleset) fetchSelections(game, pointRuleset);
                }
            )
            .subscribe();
        return () => {
            supabase.removeChannel(channels);
        };
    }, [game]);

    useEffect(() => {
        if (!game) return;
        fetchGame(game);
        fetchPlayers(game);
    }, [game]);

    useEffect(() => {
        if (!game || !pointRuleset) return;
        fetchSelections(game, pointRuleset);
    }, [game, pointRuleset]);

    if (!gameRuleset || !pointRuleset) return <Loading />;

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
                <Title>
                    Game Ruleset:{" "}
                    <Text
                        inherit
                        variant="gradient"
                        component="span"
                        gradient={{ from: "pink", to: "yellow" }}
                    >
                        {gameRuleset.name}
                    </Text>
                </Title>
                <Stack>
                    {Object.entries(gameRuleset.rules).map(([k, v]) => (
                        <Text key={k}>
                            {k}: {JSON.stringify(v)}
                        </Text>
                    ))}
                </Stack>
                <Grid>
                    <Grid.Col span={9}>
                        <Stack>
                            <Title>Player Selections</Title>
                            <Group justify="center">
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
                                open={open}
                                setOpen={setOpen}
                                selectionData={pokemonByPlayer}
                                isMinimal={isMinimal}
                                players={players}
                            />
                        </Stack>
                    </Grid.Col>
                    <Grid.Col span={3}>
                        <Stack>
                            <Title>Make a selection</Title>
                            <SelectPokemon
                                generation={pointRuleset.generation}
                            />
                        </Stack>
                    </Grid.Col>
                </Grid>
            </Stack>
        </Center>
    );
};

export const GamePage = () => {
    const { id } = useParams();
    return id && <Game game={id} />;
};
