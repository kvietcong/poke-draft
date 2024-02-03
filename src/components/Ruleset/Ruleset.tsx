import supabase from "../../supabase";
import classes from "./Rule.module.css";
import {
    useState,
    useEffect,
    useMemo,
    Dispatch,
    SetStateAction,
    ReactNode,
} from "react";
import { useParams } from "react-router-dom";
import { colorByType, getTypeColor } from "../../util/PokemonColors";
import { getStatColor } from "../../util/StatColors";

import { Sprites, PokemonSprite, Icons } from "@pkmn/img";
import { Dex, Species, toID } from "@pkmn/dex";

import {
    Card,
    Image,
    Text,
    Badge,
    Group,
    Center,
    Title,
    Stack,
    Accordion,
    TooltipFloating,
    Input,
    Button,
    Slider,
    Chip,
    Checkbox,
    Grid,
    Progress,
} from "@mantine/core";
import Fuse from "fuse.js";
import { Loading } from "../Loading/Loading";
import { useDebouncedState, useWindowScroll } from "@mantine/hooks";
import { pointRuleTable, pointRulesetTable } from "@/util/DatabaseTables";

type Pokemon = {
    data: Species;
    sprite: PokemonSprite;
};
type PointRule = [value: string, pokemonData: Pokemon[]];
type CardOnClick = (pokemon: Pokemon) => void;
const defaultCardOnClick = (pokemon: Pokemon) =>
    window.open(`https://dex.pokemonshowdown.com/pokemon/${pokemon.data.id}`);

const TypeToolTip = ({
    children,
    types,
}: {
    children: ReactNode;
    types: string[];
}) => (
    <TooltipFloating
        label={types.map((type) => (
            <Badge key={type} m={1} w={100} color={getTypeColor(type)}>
                {type}
            </Badge>
        ))}
    >
        {children}
    </TooltipFloating>
);

const PokemonCard = ({
    pokemon,
    showBaseStats,
    onClick,
}: {
    pokemon: Pokemon;
    showBaseStats: boolean;
    onClick?: CardOnClick;
}) => {
    const onCardClick = onClick || defaultCardOnClick;
    return (
        <TypeToolTip types={pokemon.data.types}>
            <Card
                radius="lg"
                withBorder
                w={150}
                mih={150}
                padding={20}
                onClick={(_) => onCardClick(pokemon)}
                className={classes.hoverPointer}
            >
                <Image
                    src={pokemon.sprite.url}
                    style={{
                        imageRendering: pokemon.sprite.pixelated
                            ? "pixelated"
                            : "auto",
                    }}
                    w="100%"
                    mah={100}
                    fit="contain"
                />
                <Text ta="center">{pokemon.data.name}</Text>
                {showBaseStats && <BaseStatDisplay pokemon={pokemon}></BaseStatDisplay>}
                
            </Card>
        </TypeToolTip>
    );
};

const BaseStatDisplay = ({ pokemon }: { pokemon: Pokemon }) => {
    const renderStatBar = (statName: string, statValue: number) => {
        const barWidth = (statValue / 255) * 100; // Assuming base stat max is 255
        return (<>
            <div style={{ marginBottom: '4px', position: 'relative' }}>
                <Progress
                    size={20}
                    value={barWidth}
                    color={getStatColor(statName)}
                />
                <Text
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 1,
                        fontSize: '12px',
                        paddingLeft: '5px',
                        width: '100%',
                        fontWeight: "bold",
                        textShadow: "1px 1px 2px #000",
                    }}
                >
                    {statName}: {statValue}
                </Text>
            </div>
        </>
        );
    };

    return (
        <Grid gutter="xl">
            <Grid.Col span={12}>
                {renderStatBar('HP', pokemon.data.baseStats.hp)}
                {renderStatBar('Attack', pokemon.data.baseStats.atk)}
                {renderStatBar('Defense', pokemon.data.baseStats.def)}
                {renderStatBar('Sp. Attack', pokemon.data.baseStats.spa)}
                {renderStatBar('Sp. Defense', pokemon.data.baseStats.spd)}
                {renderStatBar('Speed', pokemon.data.baseStats.spe)}
            </Grid.Col>
        </Grid>
    );
};

const PokemonPill = ({
    pokemon,
    onClick,
}: {
    pokemon: Pokemon;
    onClick?: CardOnClick;
}) => {
    const onCardClick = onClick || defaultCardOnClick;
    return (
        <TypeToolTip types={pokemon.data.types}>
            <Badge
                className={classes.hoverPointer}
                onClick={(_) => onCardClick(pokemon)}
            >
                {pokemon.data.name}
            </Badge>
        </TypeToolTip>
    );
};

export const RulesetAccordion = ({
    open,
    rules,
    setOpen,
    isMinimal,
    showBaseStats
}: {
    open?: string[];
    rules: PointRule[];
    setOpen?: Dispatch<SetStateAction<string[]>>;
    isMinimal?: boolean;
    showBaseStats?: boolean;
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
                                        <PokemonDisplay
                                            key={pokemon.data.id}
                                            pokemon={pokemon}
                                            showBaseStats={showBaseStats ?? false}
                                        />
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

export const RulesetView = ({ ruleset }: { ruleset: number | string }) => {
    const [rules, setRules] = useState<PointRule[]>([]);
    const [rulesetName, setRulesetName] = useState<string>("");

    const [name, setName] = useDebouncedState("", 300);
    const [fuzzyLevel, setFuzzyLevel] = useState(0.2);

    const [types, setTypes] = useState<string[]>([]);
    const [willMatchAllTypes, setWillMatchAllTypes] = useState(true);

    const [isMinimal, setIsMinimal] = useState(false);
    const [showBaseStats, setShowBaseStats] = useState(false);

    const [showFilters, setShowFilters] = useState(false);
    const [showTypeFilter, setShowTypeFilter] = useState(false);
    const [showFuzzyLevelFilter, setShowFuzzyLevelFilter] = useState(false);

    const [scroll, scrollTo] = useWindowScroll();
    const [open, setOpen] = useState<string[]>([]);

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
        const doesPokemonMatch = (pokemon: Pokemon) =>
            predicates.every((predicate) => predicate(pokemon));
        const result = rules.reduce<PointRule[]>((acc, next) => {
            const filteredPokemon = next[1].filter(doesPokemonMatch);
            if (filteredPokemon.length) acc.push([next[0], filteredPokemon]);
            return acc;
        }, []);
        return result;
    }, [name, rules, types, willMatchAllTypes, nameFuzzySearcher]);

    const fetchName = async (ruleset: number | string) => {
        let { data, error } = await supabase
            .from(pointRulesetTable)
            .select("name")
            .eq("id", ruleset)
            .limit(1);
        if (error) return console.error(error);
        if (!data) return console.log("No data received!");
        setRulesetName(data[0].name);
    };

    const fetchRules = async (ruleset: number | string) => {
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
            const {
                value,
                pokemon_id: rawPokemonID,
            }: { value: number; pokemon_id: string } = next;
            const key = value.toString();
            const pokemonID = toID(rawPokemonID);
            if (!accumulated[key]) accumulated[value] = [];
            const data = Dex.species.getByID(pokemonID);
            accumulated[key].push({
                data: data,
                sprite: Sprites.getDexPokemon(pokemonID, {
                    gen: "gen5ani",
                }) as PokemonSprite,
            });
            return accumulated;
        };
        const pointRules: PointRule[] = Object.entries(
            data.reduce<{ [id: string]: Pokemon[] }>(getPokemonFromData, {})
        ).sort(zeroThenHiToLo);
        setRules(pointRules);
    };

    useEffect(() => {
        fetchRules(ruleset);
        fetchName(ruleset);
    }, [ruleset]);

    if (!rulesetName || !rules) return <Loading />;

    return (
        <Center>
            <Stack w="50%">
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
                    <Checkbox
                        checked={showBaseStats}
                        onChange={(e) => setShowBaseStats(e.currentTarget.checked)}
                        label="Show Base Stats?"
                    />
                </Group>
                <Group>
                    <Checkbox
                        checked={showFilters}
                        onChange={(e) => setShowFilters(e.currentTarget.checked)}
                        label="Show Filters"
                    />
                </Group>
                {showFilters && <Group>
                    <Checkbox
                        checked={showTypeFilter}
                        onChange={(e) => setShowTypeFilter(e.currentTarget.checked)}
                        label="Type"
                    />
                    <Checkbox
                        checked={showFuzzyLevelFilter}
                        onChange={(e) => setShowFuzzyLevelFilter(e.currentTarget.checked)}
                        label="Fuzzy Search Multiplier"
                    />
                </Group>}
                {showTypeFilter && <Group justify="left">
                    <Chip.Group multiple value={types} onChange={setTypes}>
                        {Object.entries(colorByType).map(([type, color]) => (
                            <Chip color={color} key={type} value={type}>
                                {type}
                            </Chip>
                        ))}
                        <Checkbox
                            checked={willMatchAllTypes}
                            onChange={(e) =>
                                setWillMatchAllTypes(e.currentTarget.checked)
                            }
                            label="Match All Types"
                        />
                    </Chip.Group>
                </Group>}
                {showFuzzyLevelFilter && <Group>
                    <Text>Fuzzy search multiplier: </Text>
                    <Slider
                        min={0}
                        max={0.5}
                        step={0.05}
                        style={{ flexGrow: 1 }}
                        defaultValue={fuzzyLevel}
                        onChangeEnd={setFuzzyLevel}
                    />
                </Group>}
                <RulesetAccordion
                    open={open}
                    setOpen={setOpen}
                    isMinimal={isMinimal}
                    rules={filteredRules}
                    showBaseStats={showBaseStats}
                />
                <Group
                    pos="fixed"
                    left={25}
                    bottom={20}
                    style={{ zIndex: 500 }}
                >
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
            </Stack>
        </Center>
    );
};

export const RulesetPage = () => {
    const { id } = useParams();
    return id && <RulesetView ruleset={id} />;
};
