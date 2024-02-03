const raw_pokemon_names = `
Altaria
Arbok
Ariados
Aurorus
Avalugg
`;

import { Dex } from "@pkmn/dex";

const pokemon_names = raw_pokemon_names
    .split("\n")
    .map((raw) => raw.trim())
    .filter((raw) => raw.length > 0);
const pokemon_to_add = pokemon_names.map((name) => Dex.species.get(name));

const points = 2;

// check
for (const pokemon of pokemon_to_add) {
    const { exists, id, name } = pokemon;
    if (!exists) console.log("existent?", exists, id, name);
}

// confirm
console.log(
    `${pokemon_to_add.length} pokemon will be added with ${points} points`
);
import { stdin, stdout, exit, env } from "process";
import { createInterface } from "readline";
const reader = createInterface({
    input: stdin,
    output: stdout,
});
const input = await new Promise((resolve) =>
    reader.question("Are you sure you want to proceed? ", resolve)
);
reader.close();
if (input !== "y") exit(0);

// add'em
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({
    path: `.env`,
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);
for (const pokemon of pokemon_to_add) {
    const { id, name } = pokemon;
    console.log("Adding", name);
    const { error } = await supabase
        .from("point_rule")
        .upsert([{ point_ruleset: 4, value: points, pokemon_id: id }], {
            onConflict: "point_ruleset,pokemon_id",
        })
        .select();
    if (error) console.log(name, error);
}
