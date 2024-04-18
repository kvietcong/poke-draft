import { Pokemon } from "@/types";
import { Dex, ModdedDex, toID } from "@pkmn/dex";
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
        encodeURI(`https://www.smogon.com/dex/${getGenerationName(generation)}/pokemon/${pokemon.data.name}/`)
    );
