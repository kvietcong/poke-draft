import { Pokemon, ValueByPokemonID } from "@/types";
import { Dex, ModdedDex, TypeName, toID } from "@pkmn/dex";
import { Icons, PokemonSprite, Sprites } from "@pkmn/img";
import getGenerationName from "./GenerationName";

export const getPokemon = (id: string, dex?: ModdedDex): Pokemon => {
    const pokemonID = toID(id);
    const data = (dex ?? Dex).species.getByID(pokemonID);
    const pokemon = {
        data: data,
        sprite: Sprites.getDexPokemon(data.id, {
            gen: "gen5ani",
        }) as PokemonSprite,
        icon: Icons.getPokemon(data.id).css,
    };
    return pokemon;
};

export const searchPokemon = (
    search: string,
    dex?: ModdedDex | number
): Pokemon => {
    if (typeof dex === "number") dex = Dex.forGen(dex);
    const data = (dex ?? Dex).species.get(search);
    const pokemon = {
        data: data,
        sprite: Sprites.getDexPokemon(data.id, {
            gen: "gen5ani",
        }) as PokemonSprite,
        icon: Icons.getPokemon(data.id).css,
    };
    return pokemon;
};

export const fetchMovesByPokemon = async (dex: ModdedDex) => {
    const movesByPokemon: { [id: string]: string[] } = {};
    for (const p of dex.species.all()) {
        movesByPokemon[p.id] = Object.keys(
            (await dex.learnsets.getByID(p.id)).learnset ?? {}
        );
    }
    return movesByPokemon;
};

export const smogonOnClick = (pokemon: Pokemon, generation?: number) =>
    window.open(
        encodeURI(
            `https://www.smogon.com/dex/${getGenerationName(generation)}/pokemon/${pokemon.data.name}/`
        )
    );

export const getPointLabel = (
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

export const getPointTotal = (
    pokemon: Pokemon[],
    valueByPokemonID: ValueByPokemonID
): number => {
    return pokemon.reduce((acc, next) => {
        return acc + (valueByPokemonID[next.data.id] ?? 1);
    }, 0);
};

export const colorByType: { [id: string]: string } = {
    normal: "#A8A77A",
    fire: "#EE8130",
    water: "#6390F0",
    electric: "#F7D02C",
    grass: "#7AC74C",
    ice: "#96D9D6",
    fighting: "#C22E28",
    poison: "#A33EA1",
    ground: "#E2BF65",
    flying: "#A98FF3",
    psychic: "#F95587",
    bug: "#A6B91A",
    rock: "#B6A136",
    ghost: "#735797",
    dragon: "#6F35FC",
    dark: "#705746",
    steel: "#B7B7CE",
    fairy: "#D685AD",
};

export const getTypeColor = (type: string) =>
    colorByType[type.toLowerCase()] ?? "#777";

// lol this is prob super overcomplicated
export const getTypesByDamageMultiplier = (
    types: [TypeName] | [TypeName, TypeName]
) => {
    const manyDamageTypeByType = types.map(
        (type) => Dex.types.get(type).damageTaken
    );

    const manyDamageMultiplierByType = [];
    for (const damageTypeByType of manyDamageTypeByType) {
        const damageMultiplierByType: { [type: string]: number } = {};
        for (const [type, damageType] of Object.entries(damageTypeByType)) {
            let damageMultiplier = 1;
            if (damageType === 3) damageMultiplier = 0;
            else if (damageType === 2) damageMultiplier = 0.5;
            else if (damageType === 1) damageMultiplier = 2;
            damageMultiplierByType[type] = damageMultiplier;
        }
        manyDamageMultiplierByType.push(damageMultiplierByType);
    }

    const allTypes = Dex.types.all().map((type) => type.name);
    const finalDamageMultiplierByType = allTypes.reduce<{
        [type: string]: number;
    }>((acc, next) => {
        acc[next] = 1;
        return acc;
    }, {});

    for (const damageMultiplierByType of manyDamageMultiplierByType) {
        for (const [type, damageMultiplier] of Object.entries(
            damageMultiplierByType
        )) {
            finalDamageMultiplierByType[type] =
                finalDamageMultiplierByType[type] * damageMultiplier;
        }
    }

    const result: { [type: string]: string[] } = {};
    for (const [type, damageMultiplier] of Object.entries(
        finalDamageMultiplierByType
    )) {
        if (damageMultiplier === 1) continue;
        if (damageMultiplier in result) result[damageMultiplier].push(type);
        else result[damageMultiplier] = [type];
    }

    return result;
};
