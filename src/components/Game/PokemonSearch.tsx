import { PointRulesetContext } from "@/Context";
import { Pokemon } from "@/types";
import { searchPokemon, smogonOnClick } from "@/util/Pokemon";
import { Button, Stack, Autocomplete, Title } from "@mantine/core";
import { ReactNode, useContext, useEffect, useMemo } from "react";
import { getPointLabel } from "../Game/Game";
import { useDebouncedState } from "@mantine/hooks";
import { BaseStatDisplay, PokemonCard } from "../PokeView/View";

export const PokemonSearcher = ({
    onSelect,
    search,
    setSearch,
    children,
}: {
    onSelect?: (pokemon: Pokemon) => any;
    search: string;
    setSearch: (newValue: string) => void;
    children?: ReactNode;
}) => {
    const { dex, pointRulesetInfo, valueByPokemonID } =
        useContext(PointRulesetContext);

    const [internalSearch, setInternalSearch] = useDebouncedState(search, 150);

    useEffect(() => {
        setSearch(internalSearch);
    }, [internalSearch]);

    if (!dex || !pointRulesetInfo || !valueByPokemonID) return;

    const cleanSearch = search.trim();

    const pokemon = useMemo(() => {
        return searchPokemon(cleanSearch, dex);
    }, [search]);

    const points = getPointLabel(pokemon, valueByPokemonID);
    const suggestions = useMemo(
        () =>
            dex.species
                .all()
                .map((p) => p.id)
                .toSorted(),
        [dex]
    );

    const SearchBar = (
        <Autocomplete
            label="Search for a Pokemon"
            placeholder="Pokemon Name"
            defaultValue={internalSearch}
            onChange={setInternalSearch}
            data={suggestions}
            limit={5}
        />
    );

    const ConfirmButton = onSelect && (
        <Button
            onClick={() =>
                confirm(
                    `Are you sure you want to select ${pokemon.data.name} for ${points} points?`
                ) && onSelect(pokemon)
            }
        >
            Select Current Pokemon
        </Button>
    );

    const PokemonInfo = pokemon.data.exists && (
        <>
            <Title order={3}>{points}</Title>
            <PokemonCard
                pokemon={pokemon}
                onClick={() =>
                    smogonOnClick(pokemon, pointRulesetInfo.generation)
                }
            />
            <Title>Stats</Title>
            <BaseStatDisplay pokemon={pokemon} />
        </>
    );

    let error_msg = null;
    if (!pokemon.data.exists) error_msg = `Couldn't find ${search}`;
    else if (pokemon.data.gen > pointRulesetInfo.generation)
        error_msg = `${pokemon.data.name} isn't in generation ${pointRulesetInfo.generation}`;

    const SearchError = error_msg && <Title order={2}>{error_msg}</Title>;

    return (
        <Stack align="center" ta="center">
            <Title id="make-selection">Make a selection</Title>
            {children}
            {cleanSearch && !error_msg && ConfirmButton}
            {SearchBar}
            {cleanSearch && (PokemonInfo || SearchError)}
        </Stack>
    );
};
