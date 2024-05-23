import { Pokemon } from "@/types";
import { ModdedDex, StatID } from "@pkmn/dex";
import Fuse from "fuse.js";
import { useCallback, useMemo, useState } from "react";
import { useMovesByPokemonQuery } from "@/queries";

const statAbbreviations: Map<string, StatID> = new Map([
    ["hp", "hp"],
    ["attack", "atk"],
    ["defense", "def"],
    ["sp. attack", "spa"],
    ["sp. defense", "spd"],
    ["speed", "spe"],
]);

export type PokeFilter = ReturnType<typeof usePokeFilter>;
export const usePokeFilter = (dex: ModdedDex) => {
    const [name, setName] = useState("");
    const [fuzziness, setFuzziness] = useState(0.2);
    const [types, setTypes] = useState<string[]>([]);
    const [matchAllTypes, setMatchAllTypes] = useState(true);
    const [ability, setAbility] = useState("");
    const [moves, setMoves] = useState<string[]>([]);
    const baseStatsLabels = [
        "HP",
        "Attack",
        "Defense",
        "Sp. Attack",
        "Sp. Defense",
        "Speed",
    ];
    const [stats, setStats] = useState(
        Object.fromEntries(
            baseStatsLabels.map((label) => [
                label,
                [0, 255] as [number, number],
            ])
        )
    );
    const setStat = useCallback(
        (label: string) => (newValue: [number, number]) => {
            setStats((stats) => ({
                ...stats,
                [label]: newValue,
            }));
        },
        [setStats]
    );

    const movesByPokemonQuery = useMovesByPokemonQuery(dex);
    const movesByPokemon = movesByPokemonQuery.data;

    const nameFuzzySearcher = useMemo(() => {
        const result = new Fuse(
            dex.species.all().map((p) => ({ name: p.name, id: p.id })),
            {
                keys: ["name"],
                threshold: fuzziness,
            }
        );
        return result;
    }, [dex, fuzziness]);

    const predicates = useMemo(() => {
        const predicates = [];
        if (name.length) {
            const matchedIDs = nameFuzzySearcher
                .search(name)
                .map((result) => result.item.id);
            const namePredicate = (pokemon: Pokemon) =>
                matchedIDs.includes(pokemon.data.id);
            predicates.push(namePredicate);
        }

        if (types.length) {
            const typePredicate = (pokemon: Pokemon) => {
                const fn = matchAllTypes ? types.every : types.some;
                return fn.bind(types)((type: string) =>
                    pokemon.data.types
                        .map((type) => type.toLowerCase())
                        .includes(type)
                );
            };
            predicates.push(typePredicate);
        }

        if (ability != "") {
            const abilityPredicate = (pokemon: Pokemon) => {
                return Object.values(pokemon.data.abilities).includes(ability);
            };
            predicates.push(abilityPredicate);
        }

        if (moves.length) {
            const movesPredicate = (pokemon: Pokemon) => {
                return moves.every(
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
            Object.values(stats).some(
                ([minValue, maxValue]) => minValue > 0 || maxValue < 255
            )
        ) {
            const baseStatsPredicate = (pokemon: Pokemon) => {
                return Object.entries(stats).every(
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
        return predicates;
    }, [
        name,
        fuzziness,
        types,
        matchAllTypes,
        ability,
        moves,
        stats,
        nameFuzzySearcher,
    ]);

    const result = {
        // Values
        name,
        fuzziness,
        types,
        matchAllTypes,
        ability,
        moves,
        stats,

        // Setters
        setName,
        setFuzziness,
        setTypes,
        setMatchAllTypes,
        setAbility,
        setMoves,
        setStats,
        setStat,

        // etc
        predicates,
    };
    return useMemo(
        () => result,
        [
            name,
            fuzziness,
            types,
            matchAllTypes,
            ability,
            moves,
            stats,
            setName,
            setFuzziness,
            setTypes,
            setMatchAllTypes,
            setAbility,
            setMoves,
            setStats,
            setStat,
            predicates,
        ]
    );
};
