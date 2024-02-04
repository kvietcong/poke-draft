import { Dex } from "@pkmn/dex";

const pokemonRawNamesByValue = {
    0: `
        Arceus-Dragon
        Arceus-Electric
        Arceus-Fairy
        Arceus-Fighting
        Arceus-Fire
        Arceus-Flying
        Arceus-Ghost
        Arceus-Grass
        Arceus-Ground
        Arceus-Ice
        Arceus-Poison
        Arceus-Psychic
        Arceus-Rock
        Arceus-Steel
        Arceus-Water
        Darkrai
        Deoxys
        Deoxys-Attack
        Deoxys-Speed
        Dialga
        Floette-Eternal
        Genesect
        Giratina
        Groudon
        Ho-Oh
        Kyogre
        Kyurem-White
        Landorus-Incarnate
        Lugia
        Lunala
        Magearna
        Marshadow
        Mega Alakazam
        Mega Blaziken
        Mega Gengar
        Mega Kangaskhan
        Mega Latias
        Mega Latios
        Mega Lucario
        Mega Metagross
        Mega Mewtwo X
        Mega Mewtwo Y
        Mega Rayquaza
        Mega Salamence
        Mewtwo
        Naganadel
        Necrozma-Dawn-Wings
        Necrozma-Dusk-Mane
        Necrozma-Ultra
        Palkia
        Pheromosa
        Pichu-Spiky-Eared
        Pikachu-Alola
        Pikachu-Belle
        Pikachu-Cosplay
        Pikachu-Hoenn
        Pikachu-Kalos
        Pikachu-Libre
        Pikachu-Original
        Pikachu-Partner
        Pikachu-PhD
        Pikachu-Pop-Star
        Pikachu-Rock-Star
        Pikachu-Sinnoh
        Pikachu-Unova
        Primal Groudon
        Primal Kyogre
        Rayquaza
        Reshiram
        Shaymin-Sky
        Solgaleo
        Xerneas
        Yveltal
        Zekrom
        Zygarde-50%
        Zygarde-Complete
    `,
    18: `
        Celesteela
        Garchomp
        Greninja-Ash
        Kartana
        Kyurem-Black
        Landorus-Therian
        Mega Mawile
        Tapu Koko
        Tapu Lele
    `,
    17: `
        Greninja
        Mega Diancie
        Mega Lopunny
        Tornadus-Therian
        Toxapex
    `,
    16: `
        Blacephalon
        Clefable
        Deoxys-Defense
        Heatran
        Mega Charizard X
        Mega Medicham
        Mega Scizor
        Tapu Fini
        Thundurus-Incarnate
        Weavile
    `,
    15: `
        Buzzwole
        Excadrill
        Gliscor
        Infernape
        Jirachi
        Latios
        Mega Gardevoir
        Mega Sableye
        Rotom-Wash
        Victini
        Zapdos
    `,
    14: `
        Ferrothorn
        Gothitelle
        Hawlucha
        Hydreigon
        Keldeo
        Kommo-o
        Kyurem
        Latias
        Manaphy
        Mega Charizard Y
        Mega Gallade
        Mew
        Necrozma
        Terrakion
        Thundurus-Therian
        Tyranitar
        Volcarona
        Zeraora
    `,
    13: `
        Azumarill
        Dragonite
        Gengar
        Hoopa-Unbound
        Mamoswine
        Mega Aerodactyl
        Mega Swampert
        Nidoking
        Nidoqueen
        Nihilego
        Reuniclus
        Salamence
        Scizor
        Serperior
        Skarmory
    `,
    12: `
        Alolan Muk
        Blissey
        Chansey
        Diggersby
        Dugtrio
        Krookodile
        Mega Gyarados
        Mega Manectric
        Mega Pidgeot
        Mega Pinsir
        Mega Slowbro
        Mega Tyranitar
        Metagross
        Mienshao
        Milotic
        Raikou
        Scolipede
        Slowbro
        Snorlax
        Starmie
        Suicune
        Tangrowth
        Tapu Bulu
    `,
    11: `
        Alakazam
        Azelf
        Celebi
        Cobalion
        Conkeldurr
        Cresselia
        Crobat
        Hippowdon
        Klefki
        Lycanroc-Dusk
        Magnezone
        Mandibuzz
        Mega Altaria
        Mega Beedrill
        Mega Garchomp
        Mega Venusaur
        Pelipper
        Primarina
        Roserade
        Silvally
        Slowking
        Sylveon
        Togekiss
        Uxie
        Volcanion
        Xurkitree
    `,
    10: `
        Alolan Ninetales
        Alomomola
        Amoonguss
        Bronzong
        Darmanitan
        Decidueye
        Empoleon
        Florges
        Gardevoir
        Gyarados
        Haxorus
        Heliolisk
        Kingdra
        Mega Aggron
        Mega Blastoise
        Mega Heracross
        Mega Sharpedo
        Porygon2
        Registeel
        Rotom-Heat
        Salazzle
        Seismitoad
        Shaymin
        Swampert
    `,
    9: `
        Aerodactyl
        Arcanine
        Breloom
        Chandelure
        Comfey
        Crawdaunt
        Donphan
        Drapion
        Entei
        Meloetta
        Mesprit
        Mimikyu
        Porygon-Z
        Quagsire
        Tornadus-Incarnate
        Tsareena
        Vaporeon
        Zoroark
    `,
    8: `
        Alolan Persian
        Bisharp
        Blastoise
        Blaziken
        Cloyster
        Cofagrigus
        Dhelmise
        Dragalge
        Druddigon
        Eelektross
        Feraligatr
        Gigalith
        Goodra
        Heracross
        Incineroar
        Jellicent
        Jolteon
        Lucario
        Miltank
        Noivern
        Pangoro
        Piloswine
        Politoed
        Ribombee
        Rotom-Mow
        Staraptor
        Swellow
        Talonflame
        Tentacruel
        Tyrantrum
        Umbreon
        Whimsicott
        Zygarde-10%
    `,
    7: `
        Araquanid
        Bewear
        Chesnaught
        Diancie
        Emboar
        Escavalier
        Flygon
        Galvantula
        Gastrodon
        Gligar
        Hariyama
        Linoone
        Magneton
        Mismagius
        Moltres
        Qwilfish
        Rhyperior
        Sharpedo
        Sigilyph
        Slurpuff
        Sneasel
        Stakataka
        Torkoal
        Toxicroak
        Venomoth
        Venusaur
        Virizion
    `,
    6: `
        Accelgor
        Alolan Marowak
        Alolan Raichu
        Braviary
        Doublade
        Espeon
        Exploud
        Froslass
        Golisopod
        Gothorita
        Gourgeist
        Granbull
        Hitmonlee
        Kabutops
        Lanturn
        Lycanroc-Midday
        Machamp
        Medicham
        Mega Absol
        Mega Houndoom
        Mega Sceptile
        Mega Steelix
        Mudsdale
        Passimian
        Scrafty
        Skuntank
        Steelix
        Stunfisk
        Vikavolt
        Weezing
        Wobbuffet
        Yanmega
    `,
    5: `
        Ambipom
        Archeops
        Aromatisse
        Audino
        Barbaracle
        Delphox
        Ditto
        Drampa
        Durant
        Electabuzz
        Forretress
        Golbat
        Golurk
        Hitmontop
        Honchkrow
        Hoopa
        Kangaskhan
        Lickilicky
        Ludicolo
        Mantine
        Mega Camerupt
        Mega Glalie
        Minior
        Musharna
        Ninetales
        Omastar
        Sableye
        Spiritomb
        Tangela
        Tauros
        Type: Null
        Vileplume
        Xatu
    `,
    4: `
        Alolan Sandslash
        Bruxish
        Carracosta
        Cinccino
        Clefairy
        Cryogonal
        Dodrio
        Electivire
        Gallade
        Garbodor
        Gurdurr
        Guzzlord
        Hitmonchan
        Houndoom
        Kecleon
        Lurantis
        Magmortar
        Mega Ampharos
        Mega Audino
        Oricorio
        Palossand
        Poliwrath
        Primeape
        Raichu
        Rapidash
        Regirock
        Rhydon
        Roselia
        Rotom-Fan
        Rotom-Frost
        Sawk
        Stoutland
        Throh
        Togedemaru
        Turtonator
        Vanilluxe
        Victreebel
        Wishiwashi
    `,
    3: `
        Abomasnow
        Absol
        Aggron
        Alolan Dugtrio
        Alolan Exeggutor
        Alolan Golem
        Ampharos
        Armaldo
        Articuno
        Basculin
        Beartic
        Bouffalant
        Charizard
        Clawitzer
        Claydol
        Crustle
        Dusclops
        Dusknoir
        Ferroseed
        Floatzel
        Frogadier
        Gorebyss
        Haunter
        Komala
        Leafeon
        Liepard
        Luxray
        Lycanroc-Midnight
        Manectric
        Mawile
        Muk
        Munchlax
        Ninjask
        Pyroar
        Pyukumuku
        Sandslash
        Sceptile
        Scyther
        Shiftry
        Shuckle
        Smeargle
        Togetic
        Torterra
        Trevenant
        Typhlosion
        Ursaring
        Vullaby
        Zangoose
    `,
    2: `
        Alolan Raticate
        Altaria
        Arbok
        Ariados
        Aurorus
        Avalugg
        Beheeyem
        Bellossom
        Bibarel
        Camerupt
        Chatot
        Combusken
        Crabominable
        Cradily
        Drifblim
        Duosion
        Electrode
        Exeggutor
        Flareon
        Fraxure
        Gogoat
        Golem
        Grotle
        Grumpig
        Huntail
        Illumise
        Jumpluff
        Jynx
        Kadabra
        Kingler
        Klinklang
        Kricketune
        Lapras
        Leavanny
        Lilligant
        Machoke
        Malamar
        Marowak
        Masquerain
        Mega Abomasnow
        Meganium
        Meowstic
        Metang
        Misdreavus
        Mr. Mime
        Murkrow
        Noctowl
        Oranguru
        Pinsir
        Probopass
        Purugly
        Rampardos
        Raticate
        Regice
        Relicanth
        Rotom
        Samurott
        Sawsbuck
        Servine
        Shiinotic
        Simipour
        Simisage
        Simisear
        Slaking
        Solrock
        Sudowoodo
        Swanna
        Swoobat
        Torracat
        Toucannon
        Vigoroth
        Vivillon
        Volbeat
        Whirlipede
        Zebstrika
    `,
};

const pokemonNamesByValue = Object.entries(pokemonRawNamesByValue).reduce(
    (acc, [value, rawNames]) => {
        acc[value] = rawNames
            .split("\n")
            .map((raw) => raw.trim())
            .filter((raw) => raw.length > 0);
        return acc;
    },
    {}
);

const pokemonIDsByValue = Object.entries(pokemonNamesByValue).reduce(
    (acc, [value, names]) => {
        acc[value] = names
            .map((name) => Dex.species.get(name))
            .filter((p) => {
                if (!p.exists) console.log("non existant", p);
                return p.exists;
            })
            .map((p) => p.id);
        return acc;
    },
    {}
);

// confirm
console.log(pokemonIDsByValue);
console.log("Above is what you will be inserting");
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
const supabaseKey = env.VITE_SUPABASE_KEY_ADMIN;

const supabase = createClient(supabaseUrl, supabaseKey);
for (const [value, pokemonIDs] of Object.entries(pokemonIDsByValue)) {
    const toInsert = pokemonIDs.map((id) => ({
        point_ruleset: "86fb92a1-eb1b-478d-9144-ad4ab61a76e8",
        value: value,
        pokemon_id: id,
    }));
    console.log(`Inserting ${value} pointers`, pokemonIDs)
    const { error } = await supabase
        .from("point_rule")
        .upsert(toInsert, {
            onConflict: "point_ruleset,pokemon_id",
        })
        .select();
    if (error) console.log(error);
}
