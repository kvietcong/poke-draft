import { Dex } from "@pkmn/dex";

const pokemonRawNamesByValue = {
    0: `
Arceus
Arceus-Bug
Arceus-Dark
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
Calyrex-Ice
Calyrex-Shadow
Darkrai
Deoxys
Deoxys-Attack
Dialga
Dracovish
Eternatus
Galarian Darmanitan
Genesect
Giratina
Giratina-Origin
Groudon
Ho-Oh
Kyogre
Kyurem-Black
Kyurem-White
Lickilicky
Lugia
Lunala
Magearna
Marshadow
Mega Alakazam
Mega Blaziken
Mega Gengar
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
Primal Groudon
Rayquaza
Reshiram
Shaymin-Sky
Solgaleo
Spectrier
Xerneas
Yveltal
Zacian
Zacian-Crowned
Zamazenta
Zamazenta-Crowned
Zekrom
Zygarde-50%
Zygarde-Complete
    `,
    19: `
Aegislash
Dragapult
Landorus-Incarnate
Melmetal
Unown
Urshifu-Single-Strike
    `,
    18: `
Deoxys-Defense
Deoxys-Speed
Garchomp
Kartana
Kyurem
Mega Diancie
Mega Mawile
    `,
    17: `
Clefable
Greninja
Landorus-Therian
Latios
Mega Gallade
Mega Kangaskhan
Mega Scizor
Tapu Koko
Tapu Lele
Tornadus-Therian
Urshifu-Rapid-Strike
Victini
Zeraora
    `,
    16: `
Blacephalon
Blaziken
Celesteela
Cinderace
Mega Charizard X
Mega Gardevoir
Mega Lopunny
Mega Medicham
Rillaboom
Tapu Fini
Toxapex
Volcarona
Weavile
    `,
    15: `
Dragonite
Excadrill
Ferrothorn
Galarian Slowking
Galarian Zapdos
Gliscor
Heatran
Kommo-o
Latias
Regieleki
Xurkitree
Zapdos
    `,
    14: `
Alomomola
Blissey
Corviknight
Gengar
Gothitelle
Hawlucha
Hoopa-Unbound
Hydreigon
Keldeo
Mega Aerodactyl
Mega Charizard Y
Mega Sableye
Mega Venusaur
Mew
Mienshao
Nihilego
Pelipper
Rotom-Wash
Scizor
Thundurus-Incarnate
    `,
    13: `
Amoonguss
Azumarill
Buzzwole
Chansey
Conkeldurr
Jirachi
Mamoswine
Manaphy
Mega Altaria
Mega Blastoise
Mega Gyarados
Mega Heracross
Mega Swampert
Mega Tyranitar
Necrozma
Reuniclus
Salamence
Serperior
Skarmory
Slowbro
Slowking
Tapu Bulu
Terrakion
Thundurus-Therian
Tyranitar
    `,
    12: `
Alakazam
Alolan Ninetales
Azelf
Cresselia
Galarian Moltres
Gyarados
Haxorus
Infernape
Lycanroc-Dusk
Mandibuzz
Mega Aggron
Mega Garchomp
Mega Pinsir
Mega Sharpedo
Milotic
Moltres
Nidoking
Nidoqueen
Obstagoon
Primarina
Raikou
Scolipede
Silvally
Starmie
Sylveon
Tangrowth
Togekiss
Volcanion
    `,
    11: `
Alolan Muk
Arcanine
Diggersby
Dracozolt
Dugtrio
Entei
Hatterene
Hippowdon
Inteleon
Kingdra
Klefki
Mega Beedrill
Metagross
Ribombee
Rotom-Heat
Seismitoad
Snorlax
Staraptor
Suicune
Vaporeon
Zarude
    `,
    10: `
Barraskewda
Bisharp
Breloom
Cobalion
Crawdaunt
Crobat
Darmanitan
Donphan
Empoleon
Galarian Weezing
Gardevoir
Grimmsnarl
Heracross
Incineroar
Krookodile
Lucario
Mega Pidgeot
Mega Slowbro
Meloetta
Noivern
Porygon-Z
Porygon2
Regidrago
Roserade
Rotom-Mow
Salazzle
Talonflame
Torkoal
Tornadus-Incarnate
Toxtricity
    `,
    9: `
Aerodactyl
Blastoise
Bronzong
Chandelure
Chesnaught
Drapion
Florges
Galarian Slowbro
Gigalith
Gligar
Goodra
Heliolisk
Jellicent
Magnezone
Mega Houndoom
Mesprit
Mimikyu
Quagsire
Registeel
Swampert
Swellow
Tsareena
Umbreon
Uxie
Zygarde-10%
    `,
    8: `
Alolan Marowak
Araquanid
Celebi
Cloyster
Cofagrigus
Copperajah
Decidueye
Dhelmise
Diancie
Dragalge
Durant
Emboar
Feraligatr
Flygon
Galvantula
Indeedee
Lycanroc-Midday
Mega Absol
Miltank
Ninetales
Pangoro
Piloswine
Politoed
Polteageist
Rhyperior
Shaymin
Stakataka
Stunfisk
Tentacruel
Tyrantrum
Venusaur
Vikavolt
Whimsicott
Zoroark
    `,
    7: `
Accelgor
Alolan Persian
Alolan Raichu
Arctozolt
Comfey
Eelektross
Escavalier
Espeon
Galarian Articuno
Gastrodon
Glastrier
Hariyama
Hitmonlee
Hoopa
Jolteon
Mantine
Mega Sceptile
Mega Steelix
Mudsdale
Qwilfish
Scrafty
Sharpedo
Sigilyph
Sirfetch'd
Slurpuff
Steelix
Toxicroak
Venomoth
Virizion
Yanmega
    `,
    6: `
Alcremie
Archeops
Aromatisse
Articuno
Audino
Bewear
Braviary
Centiskorch
Charizard
Delphox
Ditto
Doublade
Druddigon
Forretress
Froslass
Golisopod
Gourgeist
Granbull
Hitmontop
Kabutops
Lanturn
Ludicolo
Machamp
Magneton
Medicham
Mega Audino
Mega Glalie
Mega Manectric
Mismagius
Omastar
Palossand
Passimian
Rotom-Frost
Runerigus
Sandaconda
Sneasel
Vanilluxe
Weezing
    `,
    5: `
Ambipom
Appletun
Boltund
Bruxish
Cinccino
Claydol
Clefairy
Crustle
Cryogonal
Drampa
Duraludon
Electivire
Exploud
Flapple
Gallade
Garbodor
Golbat
Golurk
Gothorita
Linoone
Mega Abomasnow
Mega Ampharos
Mega Camerupt
Minior
Musharna
Orbeetle
Regirock
Rhydon
Rotom
Rotom-Fan
Scyther
Tangela
Tauros
Victreebel
Vileplume
Wobbuffet
Xatu
    `,
    4: `
Abomasnow
Avalugg
Barbaracle
Coalossal
Cursola
Drednaw
Drifblim
Dusclops
Dusknoir
Frosmoth
Galarian Corsola
Galarian Rapidash
Gurdurr
Guzzlord
Hitmonchan
Honchkrow
Houndoom
Kangaskhan
Luxray
Magmortar
Morpeko
Oricorio
Poliwrath
Primeape
Pyroar
Raichu
Rapidash
Regigigas
Roselia
Sableye
Sandslash
Sawk
Sceptile
Skuntank
Spiritomb
Swoobat
Throh
Togetic
Type: Null
Ursaring
Zangoose
    `,
    3: `
Aggron
Alolan Exeggutor
Alolan Golem
Arctovish
Aurorus
Bouffalant
Carracosta
Clawitzer
Crabominable
Cramorant
Dubwool
Eldegoss
Electabuzz
Ferroseed
Flareon
Floatzel
Galarian Stunfisk
Gogoat
Gorebyss
Haunter
Huntail
Jynx
Kecleon
Kingler
Klinklang
Komala
Lapras
Leafeon
Liepard
Lurantis
Lycanroc-Midnight
Malamar
Manectric
Munchlax
Perrserker
Pincurchin
Pyukumuku
Quilladin
Regice
Samurott
Shiftry
Shuckle
Smeargle
Stoutland
Thwackey
Togedemaru
Torterra
Trevenant
Turtonator
Typhlosion
Vivillon
Vullaby
Wigglytuff
Wishiwashi
    `,
    2: `
Absol
Alolan Dugtrio
Alolan Raticate
Alolan Sandslash
Altaria
Ampharos
Armaldo
Basculin
Beartic
Beheeyem
Bibarel
Calyrex
Camerupt
Carbink
Chatot
Chimecho
Cradily
Diglett
Dodrio
Duosion
Eiscue
Electrode
Exeggutor
Falinks
Fraxure
Frogadier
Galarian Mr. Mime
Glaceon
Golduck
Grapploct
Grotle
Hippopotas
Kadabra
Leavanny
Lilligant
Machoke
Magmar
Masquerain
Mawile
Meganium
Meowstic
Metang
Misdreavus
Monferno
Mr. Mime
Mr. Rime
Muk
Murkrow
Oranguru
Pinsir
Probopass
Raboot
Rampardos
Sawsbuck
Shelgon
Shiinotic
Simipour
Simisage
Simisear
Stonjourner
Swanna
Thievul
Trapinch
Unfezant
Volbeat
Walrein
Wartortle
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
                if (!p.exists) console.error("non existant", p);
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
        point_ruleset: "b000cc12-92ba-4840-b9bf-900d47f1d035",
        value: value,
        pokemon_id: id,
    }));
    console.log(`Inserting ${value} pointers`, pokemonIDs);
    const { error } = await supabase
        .from("point_rule")
        .upsert(toInsert, {
            onConflict: "point_ruleset,pokemon_id",
        })
        .select();
    if (error) console.error(error);
}
