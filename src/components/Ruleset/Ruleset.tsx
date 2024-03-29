import supabase from "@/supabase";
import classes from "@/App.module.css";
import { useState, useEffect, useMemo, Dispatch, SetStateAction } from "react";
import { useParams } from "react-router-dom";
import { colorByType } from "@/util/PokemonColors";

import { Sprites, PokemonSprite } from "@pkmn/img";
import { Dex, StatID, toID } from "@pkmn/dex";

import {
    Text,
    Group,
    Center,
    Title,
    Stack,
    Accordion,
    Input,
    Button,
    Slider,
    Chip,
    Checkbox,
    Collapse,
    Autocomplete,
    MultiSelect,
    Grid,
} from "@mantine/core";
import Fuse from "fuse.js";
import { Loading } from "@/components/Loading/Loading";
import {
    useDebouncedState,
    useDisclosure,
    useWindowScroll,
} from "@mantine/hooks";
import { pointRuleTable, pointRulesetTable } from "@/util/DatabaseTables";
import { Pokemon } from "@/types";
import {
    CardOnClick,
    PokemonCard,
    PokemonPill,
    PokemonTooltip,
} from "@/components/PokeView/View";
import getGenerationName from "@/util/GenerationName";
import getStatColor from "@/util/StatColors";
import { getPokemon } from "@/util/Pokemon";

type PointRule = [value: string, pokemonData: Pokemon[]];

export const RulesetAccordion = ({
    open,
    rules,
    setOpen,
    isMinimal,
    cardOnClick,
}: {
    open?: string[];
    rules: PointRule[];
    setOpen?: Dispatch<SetStateAction<string[]>>;
    isMinimal?: boolean;
    cardOnClick?: CardOnClick;
}) => {
    const PokemonDisplay = isMinimal ? PokemonPill : PokemonCard;
    return (
        <>
            <Accordion
                value={open}
                multiple={true}
                onChange={setOpen}
                variant={isMinimal ? "filled" : "separated"}
            >
                {rules.map(([value, pokemonData]) => (
                    <Accordion.Item key={value} value={value}>
                        <Accordion.Control>
                            {value === "0" ? "Banned" : `${value} Points`}
                        </Accordion.Control>
                        <Accordion.Panel>
                            {open && open.includes(value) ? (
                                <Group justify="center">
                                    {pokemonData.map((pokemon) => (
                                        <PokemonTooltip
                                            key={pokemon.data.id}
                                            pokemon={pokemon}
                                        >
                                            <PokemonDisplay
                                                pokemon={pokemon}
                                                onClick={cardOnClick}
                                            />
                                        </PokemonTooltip>
                                    ))}
                                </Group>
                            ) : null}
                        </Accordion.Panel>
                    </Accordion.Item>
                ))}
            </Accordion>
        </>
    );
};

export const RulesetView = ({
    ruleset,
    cardOnClick,
    extraRulePredicates,
}: {
    ruleset: string;
    cardOnClick?: CardOnClick;
    extraRulePredicates?: ((p: Pokemon) => boolean)[];
}) => {
    const [rules, setRules] = useState<PointRule[]>([]);
    const [rulesetName, setRulesetName] = useState<string>("");
    const [rulesetGeneration, setRulesetGeneration] = useState(1);

    const [name, setName] = useDebouncedState("", 300);
    const [fuzzyLevel, setFuzzyLevel] = useState(0.2);

    const [types, setTypes] = useState<string[]>([]);
    const [willMatchAllTypes, setWillMatchAllTypes] = useState(true);

    const [isMinimal, setIsMinimal] = useState(false);

    const [showFilters, filterHandlers] = useDisclosure(false);
    const [abilityFilterText, setAbilityFilterText] = useState("");

    const [scroll, scrollTo] = useWindowScroll();
    const [open, setOpen] = useState<string[]>([]);

    const [movesFilter, setMovesFilter] = useState<string[]>([]);

    const baseStatsLabels = [
        "HP",
        "Attack",
        "Defense",
        "Sp. Attack",
        "Sp. Defense",
        "Speed",
    ];
    const [baseStatsFilter, setBaseStatsFilter] = useState(
        Object.fromEntries(baseStatsLabels.map((label) => [label, 0]))
    );

    const defaultCardOnClick = (pokemon: Pokemon) =>
        window.open(
            `https://www.smogon.com/dex/${getGenerationName(rulesetGeneration)}/pokemon/${pokemon.data.name}/`
        );

    const dex = useMemo(() => {
        return Dex.forGen(rulesetGeneration);
    }, [rulesetGeneration]);

    const [movesByPokemon, setMovesByPokemon] = useState<{
        [id: string]: string[];
    }>({});
    const fetchMovesByPokemon = async () => {
        const newMovesByPokemon: { [id: string]: string[] } = {};
        for (const p of dex.species.all()) {
            newMovesByPokemon[p.id] = Object.keys(
                (await dex.learnsets.getByID(p.id)).learnset ?? {}
            );
        }
        setMovesByPokemon(newMovesByPokemon);
    };

    useEffect(() => {
        fetchMovesByPokemon();
    }, [dex]);
    const handleBaseStatsFilterChange =
        (label: string) => (newValue: number) => {
            setBaseStatsFilter((prevValues) => ({
                ...prevValues,
                [label]: newValue,
            }));
        };

    const nameFuzzySearcher = useMemo(() => {
        const names = rules.reduce<{ name: string; id: string }[]>(
            (acc, next) => {
                const namesAndIDs = next[1].map((pokemon) => ({
                    name: pokemon.data.name as string,
                    id: pokemon.data.id as string,
                }));
                acc.push(...namesAndIDs);
                return acc;
            },
            []
        );
        const result = new Fuse(names, {
            keys: ["name"],
            threshold: fuzzyLevel,
        });
        return result;
    }, [rules, fuzzyLevel]);

    const filteredRules = useMemo(() => {
        const predicates = [(_: Pokemon) => true];
        if (name) {
            const matchedIDs = nameFuzzySearcher
                .search(name)
                .map((result) => result.item.id);
            const namePredicate = (pokemon: Pokemon) =>
                matchedIDs.includes(pokemon.data.id);
            predicates.push(namePredicate);
        }
        if (types.length) {
            const typePredicate = (pokemon: Pokemon) => {
                const fn = willMatchAllTypes ? types.every : types.some;
                return fn.bind(types)((type: string) =>
                    pokemon.data.types
                        .map((type) => type.toLowerCase())
                        .includes(type)
                );
            };
            predicates.push(typePredicate);
        }
        if (abilityFilterText != "") {
            const abilityPredicate = (pokemon: Pokemon) => {
                return Object.values(pokemon.data.abilities as object).includes(
                    abilityFilterText
                );
            };
            predicates.push(abilityPredicate);
        }
        if (movesFilter.length) {
            const movesPredicate = (pokemon: Pokemon) => {
                return movesFilter.every((move: string) =>
                    movesByPokemon[pokemon.data.id]
                        .map((move) => move.toLowerCase())
                        .includes(move)
                );
            };
            predicates.push(movesPredicate);
        }
        if (Object.values(baseStatsFilter).some((value) => value > 0)) {
            const statAbbreviations: Map<string, StatID> = new Map([
                ["hp", "hp"],
                ["attack", "atk"],
                ["defense", "def"],
                ["sp. attack", "spa"],
                ["sp. defense", "spd"],
                ["speed", "spe"],
            ]);
            const baseStatsPredicate = (pokemon: Pokemon) => {
                return Object.entries(baseStatsFilter).every(
                    ([label, value]) =>
                        value <=
                        pokemon.data.baseStats[
                            statAbbreviations.get(label.toLowerCase()) ?? "hp"
                        ]
                );
            };
            predicates.push(baseStatsPredicate);
        }
        if (extraRulePredicates) predicates.push(...extraRulePredicates);
        const doesPokemonMatch = (pokemon: Pokemon) =>
            predicates.every((predicate) => predicate(pokemon));
        const result = rules.reduce<PointRule[]>((acc, next) => {
            const filteredPokemon = next[1].filter(doesPokemonMatch);
            if (filteredPokemon.length) acc.push([next[0], filteredPokemon]);
            return acc;
        }, []);
        return result;
    }, [
        name,
        rules,
        types,
        movesFilter,
        willMatchAllTypes,
        nameFuzzySearcher,
        abilityFilterText,
        extraRulePredicates,
        baseStatsFilter,
    ]);

    const fetchRuleset = async (ruleset: number | string) => {
        let { data, error } = await supabase
            .from(pointRulesetTable)
            .select("name, generation")
            .eq("id", ruleset)
            .limit(1);
        if (error) return console.error(error);
        if (!data) return console.log("No data received!");
        setRulesetName(data[0].name);
        setRulesetGeneration(data[0].generation);
    };

    const fetchRules = async (ruleset: string) => {
        let { data, error } = await supabase
            .from(pointRuleTable)
            .select("value, pokemon_id")
            .eq("point_ruleset", ruleset);
        if (error) return console.error(error);
        if (!data) return console.log("No data received!");

        const zeroThenHiToLo = (
            a: [string, Pokemon[]],
            b: [string, Pokemon[]]
        ) => {
            const valA = parseInt(a[0]);
            const valB = parseInt(b[0]);
            if (valA === 0) return -1;
            else if (valB === 0) return 1;
            else return valB - valA;
        };
        const getPokemonFromData = (
            accumulated: { [value: string]: Pokemon[] },
            next: { value: number; pokemon_id: string }
        ) => {
            const { value, pokemon_id }: { value: number; pokemon_id: string } =
                next;
            const key = value.toString();
            if (!accumulated[key]) accumulated[value] = [];
            accumulated[key].push(getPokemon(pokemon_id));
            return accumulated;
        };
        const pointRules: PointRule[] = Object.entries(
            data.reduce<{ [id: string]: Pokemon[] }>(getPokemonFromData, {})
        ).sort(zeroThenHiToLo);
        setRules(pointRules);
    };

    useEffect(() => {
        fetchRuleset(ruleset);
        fetchRules(ruleset);
    }, [ruleset, dex]);

    if (!rulesetName || !rules) return <Loading />;
    const theMoves = Object.values(
        dex.moves.all().reduce<{
            [id: string]: { value: string; label: string };
        }>((acc, move) => {
            acc[move.id] = {
                value: move.id,
                label: move.name,
            };
            return acc;
        }, {})
    );

    return (
        <>
            <Title className={classes.title} ta="center">
                Ruleset:{" "}
                <Text
                    inherit
                    variant="gradient"
                    component="span"
                    gradient={{ from: "pink", to: "yellow" }}
                >
                    {rulesetName}
                </Text>
            </Title>
            <Group>
                <Input
                    defaultValue={name}
                    style={{ flexGrow: 1 }}
                    placeholder="Search for Pokemon"
                    onChange={(e) => setName(e.target.value)}
                />
            </Group>
            <Group>
                <Text>Display Options:</Text>
                <Checkbox
                    checked={isMinimal}
                    onChange={(e) => setIsMinimal(e.currentTarget.checked)}
                    label="Minimal View?"
                />
            </Group>
            <Button onClick={filterHandlers.toggle}>Toggle Filters</Button>
            <Collapse in={showFilters}>
                <Stack>
                    <Group justify="left">
                        <Chip.Group multiple value={types} onChange={setTypes}>
                            {Object.entries(colorByType).map(
                                ([type, color]) => (
                                    <Chip color={color} key={type} value={type}>
                                        {type}
                                    </Chip>
                                )
                            )}
                            <Checkbox
                                checked={willMatchAllTypes}
                                onChange={(e) =>
                                    setWillMatchAllTypes(
                                        e.currentTarget.checked
                                    )
                                }
                                label="Match All Types"
                            />
                        </Chip.Group>
                    </Group>
                    <Group>
                        <Autocomplete
                            label="Ability"
                            limit={5}
                            data={dex.abilities
                                .all()
                                .map((ability) => ability.name)}
                            value={abilityFilterText}
                            onChange={setAbilityFilterText}
                        />
                    </Group>
                    <MultiSelect
                        searchable
                        data={theMoves}
                        value={movesFilter}
                        onChange={setMovesFilter}
                        label="Moves"
                        placeholder="Filter for a move (latest gen)"
                    />

                    <Stack>
                        {baseStatsLabels.map((label) => (
                            <Grid key={label}>
                                <Grid.Col span={2}>
                                    <Text>{label}</Text>
                                </Grid.Col>
                                <Grid.Col span={1}>
                                    <Text>{baseStatsFilter[label]}</Text>
                                </Grid.Col>
                                <Grid.Col span={9}>
                                    <Slider
                                        color={getStatColor(label)}
                                        min={0}
                                        max={255}
                                        defaultValue={0}
                                        value={baseStatsFilter[label]}
                                        onChange={handleBaseStatsFilterChange(
                                            label
                                        )}
                                        size="xl"
                                    />
                                </Grid.Col>
                            </Grid>
                        ))}
                    </Stack>
                    <Group>
                        <Text>Fuzzy search multiplier: </Text>
                        <Slider
                            min={0}
                            max={0.5}
                            step={0.05}
                            style={{ flexGrow: 1 }}
                            defaultValue={fuzzyLevel}
                            onChangeEnd={setFuzzyLevel}
                        />
                    </Group>
                </Stack>
            </Collapse>
            <RulesetAccordion
                open={open}
                setOpen={setOpen}
                isMinimal={isMinimal}
                rules={filteredRules}
                cardOnClick={cardOnClick ?? defaultCardOnClick}
            />
            <Group pos="fixed" left={25} bottom={20} style={{ zIndex: 500 }}>
                <Button
                    onClick={() =>
                        setOpen(
                            open.length
                                ? []
                                : Object.values(rules)
                                      .map((x) => x[0])
                                      .filter((x) => x != "0")
                        )
                    }
                >
                    {open.length ? "Close All" : "Open All"}
                </Button>
                <Button
                    onClick={() => {
                        if (scroll.y > 100) scrollTo({ y: 0 });
                        else
                            scrollTo({
                                y: window.document.body.scrollHeight,
                            });
                    }}
                >
                    Go {scroll.y > 100 ? "Up" : "Down"}
                </Button>
            </Group>
        </>
    );
};

const RulesetCentered = ({ ruleset }: { ruleset: string }) => (
    <Center>
        <Stack w="50%">
            <RulesetView ruleset={ruleset} />
        </Stack>
    </Center>
);

export const RulesetPage = () => {
    const { id } = useParams();
    return id && <RulesetCentered ruleset={id} />;
};
