import supabase from "@/supabase";
import classes from "@/App.module.css";
import { useState, useEffect, useMemo, useContext } from "react";
import { useParams } from "react-router-dom";
import { colorByType } from "@/util/PokemonColors";
import { StatID } from "@pkmn/dex";
import {
    Text,
    Group,
    Center,
    Title,
    Stack,
    Button,
    Slider,
    Chip,
    Checkbox,
    Autocomplete,
    MultiSelect,
    Grid,
    Modal,
    RangeSlider,
} from "@mantine/core";
import Fuse from "fuse.js";
import { Loading } from "@/components/Loading/Loading";
import { useDebouncedState, useDisclosure } from "@mantine/hooks";
import { Pokemon } from "@/types";
import {
    AccordionSectionData,
    CardOnClick,
    PokemonAccordion,
} from "@/components/PokeView/View";
import getStatColor from "@/util/StatColors";
import { getFirstScrollableParent } from "@/util/helpers";
import { fetchPointRulesetInfo } from "@/util/database";
import { fetchMovesByPokemon, getPokemon, smogonOnClick } from "@/util/Pokemon";
import { PointRulesetContext, PointRulesetProvider } from "@/Context";
import { AppContext } from "@/App";

export const RulesetView = ({
    cardOnClick,
    extraRulePredicates,
}: {
    cardOnClick?: CardOnClick;
    extraRulePredicates?: ((p: Pokemon) => boolean)[];
}) => {
    const { dex, pointRulesetInfo, pokemonIDsByValue } =
        useContext(PointRulesetContext);
    if (!pointRulesetInfo || !dex || !pokemonIDsByValue) return;

    const { prefersMinimal } = useContext(AppContext);

    const pointRules = useMemo(() => {
        const pointRules = Object.entries(
            pokemonIDsByValue
        ).map<AccordionSectionData>(([value, ids]) => [
            value,
            ids.map((id) => getPokemon(id, dex)),
        ]);
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
        pointRules.sort(zeroThenHiToLo);
        return pointRules;
    }, [pointRulesetInfo, dex]);

    const [name, setName] = useDebouncedState("", 300);
    const [fuzzyLevel, setFuzzyLevel] = useState(0.2);

    const [types, setTypes] = useState<string[]>([]);
    const [willMatchAllTypes, setWillMatchAllTypes] = useState(true);

    const [showFilters, filterHandlers] = useDisclosure(false);
    const [abilityFilterText, setAbilityFilterText] = useState("");

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
    const [baseStatsFilter, setBaseStatsFilter] = useDebouncedState(
        Object.fromEntries(
            baseStatsLabels.map((label) => [
                label,
                [0, 255] as [number, number],
            ])
        ),
        400
    );

    const defaultCardOnClick = (pokemon: Pokemon) =>
        smogonOnClick(pokemon, pointRulesetInfo.generation);

    const [movesByPokemon, setMovesByPokemon] = useState<{
        [id: string]: string[];
    }>({});

    const handleBaseStatsFilterChange =
        (label: string) => (newValue: [number, number]) => {
            setBaseStatsFilter({
                ...baseStatsFilter,
                [label]: newValue,
            });
        };

    const nameFuzzySearcher = useMemo(() => {
        const names = pointRules.reduce<{ name: string; id: string }[]>(
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
    }, [pointRules, fuzzyLevel]);

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
                return Object.values(pokemon.data.abilities).includes(
                    abilityFilterText
                );
            };
            predicates.push(abilityPredicate);
        }
        if (movesFilter.length) {
            const movesPredicate = (pokemon: Pokemon) => {
                return movesFilter.every(
                    (move: string) =>
                        pokemon.data.id in movesByPokemon &&
                        movesByPokemon[pokemon.data.id]
                            .map((move) => move.toLowerCase())
                            .includes(move)
                );
            };
            predicates.push(movesPredicate);
        }
        if (
            Object.values(baseStatsFilter).some(
                ([minValue, maxValue]) => minValue > 0 || maxValue < 255
            )
        ) {
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
                    ([label, [minValue, maxValue]]) => {
                        const stat =
                            pokemon.data.baseStats[
                                statAbbreviations.get(label.toLowerCase()) ??
                                    "hp"
                            ];
                        return minValue <= stat && stat <= maxValue;
                    }
                );
            };
            predicates.push(baseStatsPredicate);
        }
        if (extraRulePredicates) predicates.push(...extraRulePredicates);
        const doesPokemonMatch = (pokemon: Pokemon) =>
            predicates.every((predicate) => predicate(pokemon));
        const result = pointRules.reduce<AccordionSectionData[]>(
            (acc, next) => {
                const filteredPokemon = next[1].filter(doesPokemonMatch);
                if (filteredPokemon.length)
                    acc.push([next[0], filteredPokemon]);
                return acc;
            },
            []
        );
        return result;
    }, [
        name,
        pointRules,
        types,
        movesFilter,
        willMatchAllTypes,
        nameFuzzySearcher,
        abilityFilterText,
        extraRulePredicates,
        baseStatsFilter,
    ]);

    useEffect(() => {
        (async () => {
            setMovesByPokemon(await fetchMovesByPokemon(dex));
        })();
    }, [dex]);

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
        <Stack>
            <Title className={classes.title} ta="center">
                Ruleset:{" "}
                <Text
                    inherit
                    variant="gradient"
                    component="span"
                    gradient={{ from: "pink", to: "yellow" }}
                >
                    {pointRulesetInfo.name}
                </Text>
            </Title>
            <Modal
                opened={showFilters}
                onClose={filterHandlers.close}
                title="Filters"
                radius="md"
                keepMounted={true}
                size="75%"
                centered
            >
                <Stack>
                    <Autocomplete
                        limit={5}
                        label="Pokemon Name"
                        defaultValue={name}
                        onChange={setName}
                        placeholder="Search for Pokemon"
                        data={pointRulesetInfo.pointRules.map(
                            (r) => r.pokemonID
                        )}
                    />
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
                                    <Text>
                                        {baseStatsFilter[label][0]}-
                                        {baseStatsFilter[label][1]}
                                    </Text>
                                </Grid.Col>
                                <Grid.Col span={9}>
                                    <RangeSlider
                                        color={getStatColor(label)}
                                        min={0}
                                        max={255}
                                        step={1}
                                        defaultValue={baseStatsFilter[label]}
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
            </Modal>
            <PokemonAccordion
                open={open}
                setOpen={setOpen}
                data={filteredRules}
                isMinimal={prefersMinimal}
                sectionLabelTransformer={(label) =>
                    label === "0" ? "Banned" : `${label} Points`
                }
                cardOnClick={cardOnClick ?? defaultCardOnClick}
            />
            <Group pos="sticky" left={25} bottom={20}>
                <Button
                    onClick={() =>
                        setOpen(
                            open.length
                                ? []
                                : Object.values(pointRules)
                                      .map((x) => x[0])
                                      .filter((x) => x != "0")
                        )
                    }
                >
                    {open.length ? "Close All" : "Open All"}
                </Button>
                <Button
                    onClick={(e) => {
                        const scrollableParent =
                            getFirstScrollableParent(e.currentTarget) ??
                            window.document.documentElement;
                        const scrollTop =
                            scrollableParent.scrollTop > 100
                                ? 0
                                : scrollableParent.scrollHeight;
                        scrollableParent.scrollTo({
                            top: scrollTop,
                            behavior: "smooth",
                        });
                    }}
                >
                    Scroll Down/Up
                </Button>
                <Button onClick={filterHandlers.toggle}>Filters</Button>
            </Group>
        </Stack>
    );
};

const RulesetCentered = () => (
    <Center>
        <Stack w="70%">
            <RulesetView />
        </Stack>
    </Center>
);

export const RulesetPage = () => (
    <PointRulesetProvider>
        <_RulesetPage />
    </PointRulesetProvider>
);

export const _RulesetPage = () => {
    const { id } = useParams();
    if (!id) return <>No ID provided</>;

    const { pointRulesetInfo, setPointRulesetInfo } =
        useContext(PointRulesetContext);

    const refreshPointRulesetInfo = async () => {
        const pointRulesetInfo = await fetchPointRulesetInfo(supabase, id);
        if (!pointRulesetInfo) return;
        setPointRulesetInfo(pointRulesetInfo);
    };

    useEffect(() => {
        refreshPointRulesetInfo();
    }, [id]);

    if (![pointRulesetInfo].every((x) => x)) return <Loading />;

    return id && <RulesetCentered />;
};
