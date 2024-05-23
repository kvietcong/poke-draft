import classes from "@/App.module.css";
import { useState, useMemo, MouseEventHandler } from "react";
import { useParams } from "react-router-dom";
import { Text, Group, Center, Title, Stack, Button } from "@mantine/core";
import { Loading } from "@/components/Loading/Loading";
import { useDisclosure } from "@mantine/hooks";
import { Pokemon } from "@/types";
import {
    AccordionSectionData,
    CardOnClick,
    PokemonAccordion,
    RootPokemonFilterModal,
} from "@/components/PokeView/View";
import { getFirstScrollableParent } from "@/util/helpers";
import { getPokemon, searchPokemon, smogonOnClick } from "@/util/pokemon";
import { usePokeFilter } from "@/util/hooks";
import { usePointRulesetQuery } from "@/Queries";
import { PointRulesetIDContext, usePointRulesetID } from "@/Context";
import { usePreferenceStore } from "@/Stores";

export const RulesetView = ({
    cardOnClick,
    extraRulePredicates,
}: {
    cardOnClick?: CardOnClick;
    extraRulePredicates?: ((p: Pokemon) => boolean)[];
}) => {
    const { dex, pointRulesetInfo, valueByPokemonID, pokemonIDsByValue } =
        usePointRulesetQuery(usePointRulesetID()).data!;

    const { prefersMinimal, togglePrefersMinimal } = usePreferenceStore();

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

    const [open, setOpen] = useState<string[]>([]);

    const defaultCardOnClick = (pokemon: Pokemon) =>
        smogonOnClick(pokemon, pointRulesetInfo.generation);

    const [showFilterModal, filterModalHandlers] = useDisclosure(false);
    const pokeFilter = usePokeFilter(dex);

    const filteredRules = useMemo(() => {
        const predicates = [
            ...pokeFilter.predicates,
            ...(extraRulePredicates ?? []),
        ];
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
        const possibleOnePointer = searchPokemon(pokeFilter.name, dex);
        if (
            possibleOnePointer.data.exists &&
            !(possibleOnePointer.data.id in valueByPokemonID)
        )
            result.push(["1", [possibleOnePointer]]);
        return result;
    }, [
        pointRules,
        pokeFilter.predicates,
        extraRulePredicates,
        dex,
        valueByPokemonID,
    ]);

    const toggleSections = () => {
        setOpen(
            open.length
                ? []
                : Object.values(pointRules)
                      .map((x) => x[0])
                      .filter((x) => x != "0")
        );
    };

    const scrollUpOrDown: MouseEventHandler<HTMLButtonElement> = (e) => {
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
    };

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
            <RootPokemonFilterModal
                pokeFilter={pokeFilter}
                dex={dex}
                showFilterModal={showFilterModal}
                filterModalHandlers={filterModalHandlers}
            />
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
                <Button onClick={toggleSections}>
                    {open.length ? "Close All" : "Open All"}
                </Button>
                <Button onClick={scrollUpOrDown}>Scroll</Button>
                <Button onClick={togglePrefersMinimal}>
                    Toggle View ({prefersMinimal ? "Minimal" : "Full"})
                </Button>
                <Button onClick={filterModalHandlers.toggle}>Filters</Button>
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

export const RulesetPage = () => {
    const { id } = useParams();
    if (!id) throw new Error("No point ruleset ID provided");

    const pointRulesetQuery = usePointRulesetQuery(id);

    if (pointRulesetQuery.isLoading) return <Loading />;

    if (pointRulesetQuery.isError) throw new Error("Could load point ruleset");

    return (
        <PointRulesetIDContext.Provider value={id}>
            <RulesetCentered />
        </PointRulesetIDContext.Provider>
    );
};
