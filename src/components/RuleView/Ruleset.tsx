import supabase from "../../supabase";
import classes from "./Rule.module.css";
import {
    useState,
    useEffect,
    useMemo,
    memo,
    Dispatch,
    SetStateAction,
} from "react";
import { useParams } from "react-router-dom";
import { colorByType, getTypeColor } from "../../util/PokemonColors";

import { Sprites, PokemonSprite } from "@pkmn/img";
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
} from "@mantine/core";
import Fuse from "fuse.js";
import { useDebouncedState, useWindowScroll } from "@mantine/hooks";
import { Loading } from "../Loading/Loading";

type Pokemon = {
    data: Species;
    sprite: PokemonSprite;
};
type PointRule = [value: string, pokemonData: Pokemon[]];
type CardOnClick = (pokemon: Pokemon) => void;

const defaultCardOnClick = (pokemon: Pokemon) =>
    window.open(`https://dex.pokemonshowdown.com/pokemon/${pokemon.data.id}`);
const PokemonCard = ({
    pokemon,
    onClick,
}: {
    pokemon: Pokemon;
    onClick?: CardOnClick;
}) => {
    return (
        <TooltipFloating
            label={pokemon.data.types.map((type) => (
                <Badge key={type} m={1} w={100} color={getTypeColor(type)}>
                    {type}
                </Badge>
            ))}
        >
            <Card
                radius="lg"
                withBorder
                w={150}
                mih={150}
                padding={20}
                onClick={(_) => (onClick || defaultCardOnClick)(pokemon)}
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
            </Card>
        </TooltipFloating>
    );
};

export const RulesetAccordion = memo(
    ({
        rules,
        open,
        setOpen,
    }: {
        rules: PointRule[];
        open?: string[];
        setOpen?: Dispatch<SetStateAction<string[]>>;
    }) => {
        return (
            <>
                <Accordion
                    multiple={true}
                    variant="separated"
                    transitionDuration={500}
                    value={open}
                    onChange={setOpen}
                >
                    {rules.map(([value, pokemonData]) => (
                        <Accordion.Item key={value} value={value}>
                            <Accordion.Control>
                                {value === "0" ? "Banned" : `${value} Points`}
                            </Accordion.Control>
                            <Accordion.Panel>
                                <Group justify="center">
                                    {pokemonData.map((pokemon) => (
                                        <PokemonCard
                                            key={pokemon.data.id}
                                            pokemon={pokemon}
                                        />
                                    ))}
                                </Group>
                            </Accordion.Panel>
                        </Accordion.Item>
                    ))}
                </Accordion>
            </>
        );
    }
);

export const RulesetView = ({ ruleset }: { ruleset: number | string }) => {
    const [rules, setRules] = useState<PointRule[]>([]);
    const [rulesetName, setRulesetName] = useState<string>("");

    const [name, setName] = useDebouncedState("", 300);
    const [fuzzyLevel, setFuzzyLevel] = useDebouncedState(0.3, 300);

    const [types, setTypes] = useState<string[]>([]);
    const [willAndTypes, setWillAndTypes] = useState(true);

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
                const fn = willAndTypes ? types.every : types.some;
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
    }, [name, rules, types, willAndTypes, nameFuzzySearcher]);

    const fetchName = async (ruleset: number | string) => {
        let { data, error } = await supabase
            .from("point_rule_set")
            .select("name")
            .eq("id", ruleset)
            .limit(1);
        if (error) return console.error(error);
        if (!data) return console.log("No data received!");
        setRulesetName(data[0].name);
    };

    const fetchRules = async (ruleset: number | string) => {
        let { data, error } = await supabase
            .from("point_rule")
            .select("value, pokemon_id")
            .eq("point_rule_set", ruleset);
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
            accumulated[key].push({
                data: Dex.species.getByID(pokemonID),
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
                <Input
                    defaultValue={name}
                    placeholder="Search for Pokemon"
                    onChange={(e) => setName(e.target.value)}
                />
                <Group>
                    Name Fuzzing (0 perfect match, 1 super fuzz):{" "}
                    <Slider
                        min={0}
                        max={1}
                        step={0.05}
                        w="100%"
                        defaultValue={fuzzyLevel}
                        onChange={setFuzzyLevel}
                    />
                </Group>
                <Group justify="center">
                    <Chip.Group multiple value={types} onChange={setTypes}>
                        {Object.entries(colorByType).map(([type, color]) => (
                            <Chip color={color} key={type} value={type}>
                                {type}
                            </Chip>
                        ))}
                        <Checkbox
                            checked={willAndTypes}
                            onChange={(e) =>
                                setWillAndTypes(e.currentTarget.checked)
                            }
                            label="Match All Types"
                        />
                    </Chip.Group>
                </Group>
                <RulesetAccordion
                    open={open}
                    setOpen={setOpen}
                    rules={filteredRules}
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
