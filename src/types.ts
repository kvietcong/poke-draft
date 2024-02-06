import { Species } from "@pkmn/dex";
import { PokemonSprite } from "@pkmn/img";

export type Pokemon = {
    data: Species;
    sprite: PokemonSprite;
    icon: { [attr: string]: string };
};
