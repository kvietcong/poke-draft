import supabase from "../../supabase";
import classes from "./Rule.module.css";
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getTypeColor } from "../../util/PokemonColors";

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
} from "@mantine/core";
import Fuse from "fuse.js";
import { useDebouncedValue, useWindowScroll } from "@mantine/hooks";
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

export const RulesetAccordion = ({
    rules,
    onClick,
}: {
    rules: PointRule[];
    onClick?: CardOnClick;
}) => {
    const [fuses, setFuses] = useState<{ [id: string]: Fuse<Pokemon> }>({});

    const [search, setSearch] = useState("");
    const [debouncedSearch] = useDebouncedValue(search, 500);
    const [scroll, scrollTo] = useWindowScroll();

    const [open, setOpen] = useState<string[]>([]);

    const getTypesFrontAndBack = (pokemon: Pokemon) =>
        pokemon.data.types.join(" ") +
        " " +
        pokemon.data.types.toReversed().join(" ");

    useEffect(() => {
        const newFuses = rules.reduce<{ [id: string]: Fuse<Pokemon> }>(
            (acc, next) => {
                const [value, pokemonData] = next;
                acc[value] = new Fuse(pokemonData, {
                    keys: [
                        "data.id",
                        "data.name",
                        {
                            name: "types",
                            getFn: getTypesFrontAndBack,
                        },
                    ],
                    useExtendedSearch: true,
                    threshold: 0.4,
                });
                return acc;
            },
            {}
        );
        setFuses(newFuses);
    }, [rules]);

    return (
        <>
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
            <Input
                placeholder="Search for Pokemon"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
            <Accordion
                multiple={true}
                variant="separated"
                transitionDuration={500}
                value={open}
                onChange={setOpen}
            >
                {rules.map(([value, pokemonData]) => {
                    const fuse = fuses[value];
                    const results = debouncedSearch
                        ? fuse
                              .search(debouncedSearch.trim())
                              .map((match) => match.item)
                        : pokemonData;
                    if (!results.length) return <></>;

                    return (
                        <Accordion.Item key={value} value={value}>
                            <Accordion.Control>
                                {value === "0" ? "Banned" : `${value} Points`}
                            </Accordion.Control>
                            <Accordion.Panel>
                                <Group justify="center">
                                    {results.map((pokemon) => (
                                        <PokemonCard
                                            key={pokemon.data.id}
                                            pokemon={pokemon}
                                            onClick={onClick}
                                        />
                                    ))}
                                </Group>
                            </Accordion.Panel>
                        </Accordion.Item>
                    );
                })}
            </Accordion>
        </>
    );
};

export const RulesetView = ({ ruleset }: { ruleset: number | string }) => {
    const [rules, setRules] = useState<PointRule[]>([]);
    const [rulesetName, setRulesetName] = useState<string>("");

    const fetchName = async (ruleset: number | string) => {
        let { data, error } = await supabase
            .from("point_rule_set")
            .select("id, name")
            .eq("id", ruleset);
        if (error) return console.error(error);
        if (!data) return console.log("No data received!");
        setRulesetName(data[0].name);
    };

    const fetchRules = async (ruleset: number | string) => {
        let { data, error } = await supabase
            .from("point_rule")
            .select("value, pokemon_id, point_rule_set")
            .eq("point_rule_set", ruleset);
        if (error) return console.error(error);
        if (!data) return console.log("No data received!");
        const pointRules: PointRule[] = Object.entries(
            data.reduce<{
                [id: string]: Pokemon[];
            }>((acc, next: { value: number; pokemon_id: string }) => {
                const {
                    value,
                    pokemon_id: rawPokemonID,
                }: { value: number; pokemon_id: string } = next;
                const key = value.toString();
                const pokemonID = toID(rawPokemonID);
                if (!acc[key]) acc[value] = [];
                acc[key].push({
                    data: Dex.species.getByID(pokemonID),
                    sprite: Sprites.getDexPokemon(pokemonID, {
                        gen: "gen5ani",
                    }) as PokemonSprite,
                });
                return acc;
            }, {})
        ).sort((a, b) => {
            const valA = parseInt(a[0]);
            const valB = parseInt(b[0]);
            if (valA === 0) return -1;
            else if (valB === 0) return 1;
            else return valB - valA;
        });
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
                <RulesetAccordion rules={rules} />
            </Stack>
        </Center>
    );
};

export const RulesetPage = () => {
    const { id } = useParams();
    return id && <RulesetView ruleset={id} />;
};
