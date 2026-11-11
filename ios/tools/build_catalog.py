"""Builds Aharya/Resources/catalog.json: the ingredients and recipes the on-device planner uses.

Edit the tables below and run:  python3 ios/tools/build_catalog.py

Quantities are per serving. Prices are rough 2026 Indian retail (₹ per kg, per litre or per
piece) and only drive the weekly budget estimate. Calories and macros are home-cooking
estimates and should be reviewed by a nutritionist before launch.
"""

import json
from pathlib import Path

# id: (name, aisle, unit, price per kg / L / piece, flags, store search term)
# flags: staple = assumed at home; root = not Jain; meat, fish, egg, dairy, nuts, peanut, gluten, soy
INGREDIENTS = {
    # grains
    "atta": ("whole wheat atta", "grains", "g", 50, "gluten", "whole wheat atta"),
    "rice": ("rice", "grains", "g", 70, "", "sona masoori rice"),
    "brown_rice": ("brown rice", "grains", "g", 130, "", "brown rice"),
    "poha": ("poha", "grains", "g", 70, "", "poha"),
    "rava": ("rava (sooji)", "grains", "g", 60, "gluten", "sooji rava"),
    "oats": ("rolled oats", "grains", "g", 200, "gluten", "rolled oats"),
    "jowar": ("jowar atta", "grains", "g", 70, "", "jowar atta"),
    "bajra": ("bajra atta", "grains", "g", 60, "", "bajra atta"),
    "ragi": ("ragi atta", "grains", "g", 90, "", "ragi atta"),
    "dalia": ("dalia", "grains", "g", 70, "gluten", "dalia"),
    "idli_batter": ("idli dosa batter", "grains", "g", 100, "", "idli dosa batter"),
    "bread": ("multigrain bread", "grains", "pc", 3.5, "gluten", "multigrain bread"),
    "besan": ("besan", "pulses", "g", 110, "", "besan"),
    # pulses
    "moong_dal": ("moong dal", "pulses", "g", 140, "", "moong dal"),
    "toor_dal": ("toor dal", "pulses", "g", 160, "", "toor dal"),
    "masoor_dal": ("masoor dal", "pulses", "g", 120, "", "masoor dal"),
    "chana_dal": ("chana dal", "pulses", "g", 110, "", "chana dal"),
    "rajma": ("rajma", "pulses", "g", 170, "", "rajma"),
    "kabuli_chana": ("kabuli chana", "pulses", "g", 140, "", "kabuli chana"),
    "whole_moong": ("whole moong (for sprouts)", "pulses", "g", 130, "", "green moong whole"),
    "roasted_chana": ("roasted chana", "pulses", "g", 160, "", "roasted chana"),
    "soya": ("soya chunks", "protein", "g", 180, "soy", "soya chunks"),
    # dairy
    "milk": ("milk", "dairy", "ml", 60, "dairy", "toned milk"),
    "curd": ("curd", "dairy", "g", 90, "dairy", "curd dahi"),
    "paneer": ("paneer", "dairy", "g", 420, "dairy", "paneer"),
    "ghee": ("ghee", "dairy", "g", 650, "dairy staple", "ghee"),
    # protein
    "eggs": ("eggs", "protein", "pc", 7, "egg", "eggs"),
    "chicken_breast": ("chicken breast", "protein", "g", 320, "meat", "chicken breast boneless"),
    "chicken": ("chicken curry cut", "protein", "g", 240, "meat", "chicken curry cut"),
    "fish": ("fish (rohu / basa)", "protein", "g", 260, "fish", "fish fillet"),
    "prawns": ("prawns", "protein", "g", 600, "fish shellfish", "prawns"),
    "tofu": ("tofu", "protein", "g", 350, "soy", "tofu"),
    # vegetables
    "onion": ("onion", "vegetables", "g", 40, "root", "onion"),
    "tomato": ("tomato", "vegetables", "g", 40, "", "tomato"),
    "potato": ("potato", "vegetables", "g", 35, "root", "potato"),
    "carrot": ("carrot", "vegetables", "g", 50, "root", "carrot"),
    "capsicum": ("capsicum", "vegetables", "g", 80, "", "capsicum"),
    "cucumber": ("cucumber", "vegetables", "g", 40, "", "cucumber"),
    "spinach": ("spinach (palak)", "vegetables", "g", 60, "", "palak spinach"),
    "methi": ("fresh methi", "vegetables", "g", 80, "", "methi leaves"),
    "lauki": ("lauki", "vegetables", "g", 40, "", "lauki bottle gourd"),
    "bhindi": ("bhindi", "vegetables", "g", 60, "", "bhindi okra"),
    "cauliflower": ("cauliflower", "vegetables", "g", 50, "", "cauliflower"),
    "cabbage": ("cabbage", "vegetables", "g", 35, "", "cabbage"),
    "peas": ("green peas", "vegetables", "g", 100, "", "green peas"),
    "beans": ("french beans", "vegetables", "g", 80, "", "french beans"),
    "pumpkin": ("pumpkin", "vegetables", "g", 40, "", "pumpkin"),
    "mushroom": ("mushroom", "vegetables", "g", 300, "", "button mushroom"),
    "corn": ("sweet corn", "vegetables", "g", 120, "", "sweet corn"),
    "coriander": ("coriander leaves", "vegetables", "g", 100, "", "coriander leaves"),
    "mint": ("mint leaves", "vegetables", "g", 120, "", "mint leaves"),
    "chilli": ("green chilli", "vegetables", "g", 80, "", "green chilli"),
    "ginger": ("ginger", "vegetables", "g", 120, "root", "ginger"),
    "garlic": ("garlic", "vegetables", "g", 200, "root", "garlic"),
    "lemon": ("lemon", "vegetables", "pc", 5, "", "lemon"),
    "curry_leaves": ("curry leaves", "vegetables", "g", 200, "", "curry leaves"),
    # fruits
    "banana": ("banana", "fruits", "pc", 6, "", "banana"),
    "apple": ("apple", "fruits", "pc", 25, "", "apple"),
    "guava": ("guava", "fruits", "pc", 10, "", "guava"),
    "papaya": ("papaya", "fruits", "g", 50, "", "papaya"),
    "pomegranate": ("pomegranate", "fruits", "pc", 40, "", "pomegranate"),
    # nuts & seeds
    "peanuts": ("peanuts", "nuts_seeds", "g", 160, "peanut", "peanuts"),
    "peanut_butter": ("peanut butter", "nuts_seeds", "g", 300, "peanut", "peanut butter unsweetened"),
    "almonds": ("almonds", "nuts_seeds", "g", 900, "nuts", "almonds"),
    "makhana": ("makhana", "nuts_seeds", "g", 900, "", "makhana"),
    "pumpkin_seeds": ("pumpkin seeds", "nuts_seeds", "g", 1000, "", "pumpkin seeds"),
    "flaxseed": ("flaxseed", "nuts_seeds", "g", 250, "", "flaxseed"),
    "coconut": ("desiccated coconut", "nuts_seeds", "g", 300, "", "desiccated coconut"),
    # pantry
    "oil": ("cooking oil", "pantry", "ml", 180, "staple", "groundnut oil"),
    "salt": ("salt", "pantry", "g", 25, "staple", "salt"),
    "turmeric": ("turmeric", "pantry", "g", 300, "staple", "turmeric powder"),
    "chilli_powder": ("red chilli powder", "pantry", "g", 350, "staple", "red chilli powder"),
    "cumin": ("jeera", "pantry", "g", 500, "staple", "jeera"),
    "mustard_seeds": ("mustard seeds", "pantry", "g", 150, "staple", "mustard seeds rai"),
    "garam_masala": ("garam masala", "pantry", "g", 600, "staple", "garam masala"),
    "coriander_powder": ("dhania powder", "pantry", "g", 250, "staple", "coriander powder"),
    "hing": ("hing", "pantry", "g", 2000, "staple", "hing asafoetida"),
    "black_pepper": ("black pepper", "pantry", "g", 900, "staple", "black pepper"),
    "sambar_masala": ("sambar masala", "pantry", "g", 450, "", "sambar masala"),
    "chole_masala": ("chole masala", "pantry", "g", 500, "", "chole masala"),
    "tamarind": ("tamarind", "pantry", "g", 200, "", "tamarind"),
    "green_tea": ("green tea bags", "pantry", "pc", 3, "", "green tea bags"),
}

SPICE = [("salt", 2), ("turmeric", 1)]


def R(id, name, emoji, slot, cuisine, mins, macros, ingredients, steps, tags=""):
    kcal, protein, carbs, fat = macros
    items = [{"id": i, "qty": q} for i, q in ingredients]
    return {
        "id": id, "name": name, "emoji": emoji, "slot": slot, "cuisine": cuisine, "minutes": mins,
        "kcal": kcal, "protein": protein, "carbs": carbs, "fat": fat,
        "ingredients": items, "steps": steps, "tags": tags.split(),
    }


RECIPES = [
    # ---------------- breakfast ----------------
    R("moong_chilla", "Moong dal chilla + mint curd", "🥞", "breakfast", "north", 20, (330, 20, 40, 9),
      [("moong_dal", 70), ("curd", 80), ("onion", 20), ("tomato", 30), ("coriander", 5), ("chilli", 2), ("mint", 5), ("oil", 5), ("salt", 2)],
      ["Soak moong dal 2 hours (or overnight), then grind with chilli and a little water to a smooth batter.",
       "Stir in chopped onion, tomato, coriander and salt.",
       "Spread a ladle thin on a hot greased tawa; cook 2 min a side until golden.",
       "Blend mint into the curd with a pinch of salt and serve alongside."]),
    R("besan_paneer_chilla", "Besan chilla stuffed with paneer", "🥞", "breakfast", "north", 20, (360, 22, 28, 16),
      [("besan", 60), ("paneer", 50), ("tomato", 30), ("capsicum", 30), ("coriander", 5), ("oil", 5), ("salt", 2), ("turmeric", 1)],
      ["Whisk besan, turmeric, salt and water into a pourable batter.",
       "Add chopped tomato, capsicum and coriander.",
       "Pour onto a hot greased tawa and spread thin.",
       "Crumble paneer over one half, fold, and cook both sides till golden."]),
    R("kanda_poha", "Kanda poha with peanuts", "🍚", "breakfast", "west", 20, (340, 9, 52, 11),
      [("poha", 60), ("onion", 40), ("peanuts", 15), ("peas", 20), ("lemon", 0.5), ("curry_leaves", 2), ("mustard_seeds", 1), ("turmeric", 1), ("oil", 7), ("salt", 2)],
      ["Rinse poha in a strainer and let it soften for 5 minutes.",
       "Roast peanuts in oil, then add mustard seeds, curry leaves and onion; sauté till soft.",
       "Add peas, turmeric and salt, then the poha. Toss gently on low heat for 3 minutes.",
       "Finish with lemon juice."], "high_gi"),
    R("veg_upma", "Vegetable upma", "🥣", "breakfast", "south", 20, (320, 9, 48, 10),
      [("rava", 55), ("onion", 30), ("carrot", 30), ("peas", 20), ("curry_leaves", 2), ("mustard_seeds", 1), ("oil", 7), ("salt", 2)],
      ["Dry-roast rava till it smells nutty; set aside.",
       "Splutter mustard seeds and curry leaves in oil, add onion, carrot and peas; cook 4 minutes.",
       "Pour in 1 cup hot water per serving with salt and bring to a boil.",
       "Stream in the rava while stirring; cover and cook 2 minutes."]),
    R("idli_sambar", "Idli with sambar", "🍥", "breakfast", "south", 25, (330, 13, 58, 5),
      [("idli_batter", 180), ("toor_dal", 30), ("tomato", 30), ("pumpkin", 50), ("onion", 20), ("sambar_masala", 3), ("tamarind", 3), ("oil", 3), ("salt", 2)],
      ["Steam the batter in greased idli moulds for 10–12 minutes.",
       "Pressure-cook toor dal with turmeric for 3 whistles and mash.",
       "Cook onion, tomato and pumpkin with sambar masala and tamarind water for 8 minutes.",
       "Add the dal and simmer 5 minutes; serve hot with the idlis."]),
    R("masala_oats", "Masala oats", "🥣", "breakfast", "any", 15, (300, 11, 44, 8),
      [("oats", 50), ("onion", 20), ("tomato", 30), ("carrot", 30), ("peas", 20), ("oil", 5), ("salt", 2), ("turmeric", 1)],
      ["Sauté onion, carrot and peas in oil for 3 minutes.",
       "Add tomato, turmeric and salt and cook till soft.",
       "Add oats and 1 cup water per serving; simmer 4 minutes, stirring."]),
    R("methi_thepla", "Methi thepla + curd", "🫓", "breakfast", "west", 30, (370, 12, 50, 13),
      [("atta", 60), ("methi", 30), ("besan", 10), ("curd", 100), ("oil", 7), ("turmeric", 1), ("salt", 2)],
      ["Mix atta, besan, chopped methi, turmeric, salt and a spoon of curd.",
       "Knead into a soft dough with water; rest 10 minutes.",
       "Roll thin and cook on a hot tawa with a few drops of oil till spotted on both sides.",
       "Serve with the rest of the curd."]),
    R("egg_bhurji_toast", "Egg bhurji + toast", "🍳", "breakfast", "any", 15, (380, 22, 30, 18),
      [("eggs", 2), ("bread", 2), ("onion", 30), ("tomato", 30), ("oil", 5), ("salt", 1), ("turmeric", 1)],
      ["Sauté onion in oil till soft, add tomato, turmeric and salt.",
       "Crack in the eggs and scramble on medium heat till just set.",
       "Toast the bread and serve with the bhurji."]),
    R("ragi_dosa", "Ragi dosa + coconut chutney", "🥞", "breakfast", "south", 20, (330, 9, 50, 10),
      [("ragi", 60), ("rava", 15), ("curd", 30), ("coconut", 15), ("chilli", 2), ("oil", 5), ("salt", 2)],
      ["Whisk ragi, rava, curd, salt and water into a thin batter; rest 10 minutes.",
       "Pour onto a very hot tawa in a spiral and drizzle oil; cook till crisp.",
       "Grind coconut with chilli, salt and water for the chutney."]),
    R("tofu_bhurji", "Tofu bhurji + jowar roti", "🌮", "breakfast", "any", 20, (340, 22, 30, 14),
      [("tofu", 120), ("jowar", 40), ("onion", 30), ("tomato", 40), ("capsicum", 30), ("oil", 5), ("salt", 2), ("turmeric", 1)],
      ["Knead jowar atta with warm water and pat into a roti; cook on a tawa.",
       "Sauté onion, capsicum and tomato with turmeric and salt.",
       "Crumble in the tofu and cook 4 minutes."]),
    R("sprouts_bowl", "Sprouts chaat bowl", "🥗", "breakfast", "any", 10, (280, 16, 42, 5),
      [("whole_moong", 70), ("onion", 20), ("tomato", 40), ("cucumber", 50), ("lemon", 0.5), ("pomegranate", 0.25), ("salt", 1)],
      ["Soak whole moong overnight, drain and keep covered for a day to sprout (or buy sprouts).",
       "Steam the sprouts 5 minutes.",
       "Toss with chopped onion, tomato, cucumber, pomegranate, lemon and salt."], "high_iron"),
    R("overnight_oats", "Banana peanut-butter overnight oats", "🥣", "breakfast", "any", 5, (380, 14, 52, 13),
      [("oats", 50), ("milk", 150), ("banana", 1), ("peanut_butter", 15), ("flaxseed", 5)],
      ["Mix oats, milk and flaxseed in a jar.",
       "Top with sliced banana and peanut butter.",
       "Refrigerate overnight; eat cold."]),
    R("paneer_paratha", "Paneer paratha + curd", "🫓", "breakfast", "north", 30, (420, 20, 45, 17),
      [("atta", 70), ("paneer", 50), ("curd", 80), ("coriander", 5), ("chilli", 2), ("oil", 7), ("salt", 2)],
      ["Knead atta into a soft dough.",
       "Mix grated paneer, chilli, coriander and salt for the filling.",
       "Stuff, roll and cook on a tawa with a little oil till golden.",
       "Serve with curd."], "high_sat_fat"),
    R("masala_omelette", "Masala omelette + apple", "🍳", "breakfast", "any", 10, (300, 15, 18, 17),
      [("eggs", 2), ("onion", 20), ("tomato", 20), ("capsicum", 20), ("apple", 1), ("oil", 5), ("salt", 1)],
      ["Whisk eggs with chopped onion, tomato, capsicum and salt.",
       "Cook in a hot oiled pan, fold, and serve with a sliced apple."]),
    # ---------------- lunch ----------------
    R("dal_tadka_rice", "Dal tadka, jeera rice + salad", "🍛", "lunch", "north", 35, (520, 20, 80, 12),
      [("toor_dal", 50), ("rice", 60), ("onion", 30), ("tomato", 50), ("garlic", 4), ("cucumber", 60), ("ghee", 5), ("cumin", 2), ("salt", 2), ("turmeric", 1)],
      ["Pressure-cook toor dal with turmeric and salt for 3 whistles.",
       "Cook rice with a pinch of jeera.",
       "Make a tadka: jeera, garlic, onion and tomato in ghee; pour over the dal and simmer 5 minutes.",
       "Serve with sliced cucumber."]),
    R("rajma_chawal", "Rajma chawal + kachumber", "🍛", "lunch", "north", 45, (540, 21, 86, 10),
      [("rajma", 55), ("brown_rice", 60), ("onion", 40), ("tomato", 60), ("ginger", 3), ("garlic", 4), ("cucumber", 50), ("oil", 7), ("garam_masala", 1), ("salt", 2)],
      ["Soak rajma overnight; pressure-cook 6–7 whistles till soft.",
       "Cook brown rice (it takes about 25 minutes).",
       "Cook onion, ginger and garlic till brown, add tomato and garam masala till jammy.",
       "Add rajma with its water; simmer 10 minutes. Serve with chopped cucumber."], "high_iron"),
    R("chole_phulka", "Chole + phulka + salad", "🫓", "lunch", "north", 40, (540, 21, 78, 14),
      [("kabuli_chana", 55), ("atta", 60), ("onion", 40), ("tomato", 60), ("chole_masala", 4), ("cucumber", 50), ("oil", 8), ("salt", 2)],
      ["Soak kabuli chana overnight; pressure-cook 5 whistles.",
       "Cook onion and tomato with chole masala till oil separates.",
       "Add chana and some cooking water; simmer 10 minutes.",
       "Make phulkas from the atta and serve with cucumber."], "high_iron"),
    R("palak_paneer", "Palak paneer + phulka", "🥬", "lunch", "north", 30, (520, 26, 48, 24),
      [("spinach", 150), ("paneer", 80), ("atta", 60), ("onion", 30), ("tomato", 30), ("garlic", 4), ("oil", 7), ("salt", 2)],
      ["Blanch spinach 2 minutes, cool and blend.",
       "Cook onion, garlic and tomato, add the spinach purée and salt.",
       "Add paneer cubes and simmer 5 minutes.",
       "Serve with phulkas."], "high_iron high_sat_fat"),
    R("sambar_rice", "Sambar rice + beans poriyal", "🍛", "lunch", "south", 35, (500, 16, 80, 11),
      [("rice", 60), ("toor_dal", 40), ("pumpkin", 60), ("beans", 100), ("coconut", 10), ("sambar_masala", 4), ("tamarind", 4), ("mustard_seeds", 1), ("oil", 7), ("salt", 2)],
      ["Cook rice and toor dal separately.",
       "Simmer pumpkin in tamarind water with sambar masala, then add the dal.",
       "For poriyal, stir-fry chopped beans with mustard seeds and finish with coconut.",
       "Serve sambar over rice with the poriyal."]),
    R("bhakri_pitla", "Jowar bhakri + pitla + salad", "🫓", "lunch", "west", 30, (480, 19, 68, 13),
      [("jowar", 70), ("besan", 40), ("onion", 30), ("garlic", 3), ("cucumber", 60), ("oil", 8), ("mustard_seeds", 1), ("salt", 2), ("turmeric", 1)],
      ["Knead jowar atta with hot water and pat into bhakris; cook on a tawa.",
       "Temper mustard seeds, garlic and onion in oil.",
       "Whisk besan with water, turmeric and salt; pour in and stir till thick and glossy.",
       "Serve with cucumber."]),
    R("moong_khichdi_kadhi", "Moong khichdi + kadhi", "🥣", "lunch", "west", 35, (500, 19, 76, 12),
      [("rice", 40), ("moong_dal", 40), ("curd", 120), ("besan", 15), ("ghee", 5), ("cumin", 2), ("curry_leaves", 2), ("salt", 2), ("turmeric", 1)],
      ["Pressure-cook rice and moong dal with turmeric, salt and 3 cups water.",
       "Whisk curd with besan and water; simmer 10 minutes, stirring.",
       "Temper jeera and curry leaves in ghee and pour over the kadhi."]),
    R("chicken_curry_phulka", "Home-style chicken curry + phulka", "🍗", "lunch", "any", 40, (540, 38, 48, 18),
      [("chicken", 130), ("atta", 60), ("onion", 50), ("tomato", 60), ("ginger", 4), ("garlic", 5), ("curd", 30), ("oil", 8), ("garam_masala", 1), ("chilli_powder", 1), ("salt", 2)],
      ["Marinate chicken in curd, salt and chilli powder for 30 minutes (or overnight).",
       "Brown onion in oil, add ginger, garlic and tomato; cook till jammy.",
       "Add chicken and garam masala; cover and cook 20 minutes.",
       "Serve with phulkas."]),
    R("fish_curry_rice", "Bengali-style fish curry + rice", "🐟", "lunch", "east", 35, (520, 32, 62, 14),
      [("fish", 120), ("rice", 60), ("tomato", 50), ("onion", 30), ("mustard_seeds", 2), ("turmeric", 1), ("oil", 8), ("salt", 2)],
      ["Rub fish with turmeric and salt; shallow-fry 2 minutes a side.",
       "Splutter mustard seeds, add onion and tomato and cook down.",
       "Add 1 cup water, then the fish; simmer 8 minutes.",
       "Serve with rice."]),
    R("soya_pulao", "Soya chunk pulao + raita", "🍚", "lunch", "any", 30, (510, 28, 70, 12),
      [("brown_rice", 60), ("soya", 30), ("peas", 40), ("carrot", 40), ("onion", 30), ("curd", 80), ("oil", 7), ("garam_masala", 1), ("salt", 2)],
      ["Soak soya chunks in hot water 10 minutes; squeeze dry.",
       "Sauté onion, carrot, peas and soya with garam masala.",
       "Add rinsed rice and water; cook till done.",
       "Whisk curd with salt for the raita."]),
    R("tofu_matar", "Tofu matar + phulka", "🫓", "lunch", "any", 30, (490, 25, 52, 18),
      [("tofu", 120), ("peas", 60), ("atta", 60), ("tomato", 60), ("onion", 30), ("oil", 7), ("garam_masala", 1), ("salt", 2)],
      ["Cook onion and tomato with garam masala till jammy.",
       "Add peas and a little water; simmer 5 minutes.",
       "Add tofu cubes and cook 5 more minutes. Serve with phulkas."]),
    R("bhindi_dal", "Bhindi masala, masoor dal + phulka", "🫓", "lunch", "north", 35, (500, 18, 66, 16),
      [("bhindi", 150), ("masoor_dal", 40), ("atta", 60), ("onion", 30), ("tomato", 40), ("oil", 9), ("coriander_powder", 1), ("salt", 2), ("turmeric", 1)],
      ["Pressure-cook masoor dal with turmeric and salt for 2 whistles.",
       "Stir-fry sliced bhindi in oil on high heat till no longer sticky.",
       "Add onion, tomato and dhania powder; cook 5 minutes.",
       "Serve with dal and phulkas."]),
    R("egg_curry_rice", "Egg curry + rice", "🥚", "lunch", "any", 30, (520, 22, 62, 18),
      [("eggs", 2), ("rice", 60), ("onion", 50), ("tomato", 70), ("ginger", 3), ("oil", 8), ("garam_masala", 1), ("salt", 2)],
      ["Boil eggs 10 minutes, peel and score.",
       "Brown onion and ginger, add tomato and garam masala till thick.",
       "Add water and the eggs; simmer 8 minutes. Serve with rice."]),
    R("curd_rice", "Curd rice + cucumber", "🍚", "lunch", "south", 15, (450, 14, 70, 12),
      [("rice", 60), ("curd", 150), ("cucumber", 60), ("pomegranate", 0.25), ("mustard_seeds", 1), ("curry_leaves", 2), ("oil", 5), ("salt", 2)],
      ["Cook rice soft and let it cool slightly.",
       "Mix with curd, salt and grated cucumber.",
       "Temper mustard seeds and curry leaves in oil and pour over; top with pomegranate."], "high_gi"),
    # ---------------- snacks ----------------
    R("makhana", "Roasted makhana", "🍿", "snack", "any", 10, (130, 4, 20, 4),
      [("makhana", 30), ("oil", 3), ("black_pepper", 1), ("salt", 1)],
      ["Roast makhana in a dry pan on low heat for 6 minutes till crisp.",
       "Toss with a few drops of oil, pepper and salt."]),
    R("chana_guava", "Roasted chana + guava", "🥜", "snack", "any", 2, (190, 9, 30, 3),
      [("roasted_chana", 30), ("guava", 1)],
      ["Slice the guava and eat with a handful of roasted chana."]),
    R("chaas_peanuts", "Masala chaas + peanuts", "🥛", "snack", "any", 5, (170, 8, 10, 10),
      [("curd", 100), ("peanuts", 15), ("cumin", 1), ("salt", 1)],
      ["Whisk curd with water, roasted jeera powder and salt.",
       "Have with a small handful of peanuts."]),
    R("paneer_tikka", "Paneer tikka bites", "🍢", "snack", "north", 15, (190, 13, 5, 13),
      [("paneer", 60), ("capsicum", 40), ("onion", 20), ("curd", 20), ("chilli_powder", 1), ("oil", 3), ("salt", 1)],
      ["Toss paneer, capsicum and onion with curd, chilli powder and salt.",
       "Grill or pan-roast 6 minutes, turning once."], "high_sat_fat"),
    R("fruit_bowl", "Papaya-banana bowl + seeds", "🍓", "snack", "any", 5, (160, 4, 30, 4),
      [("papaya", 150), ("banana", 0.5), ("pumpkin_seeds", 8)],
      ["Cube papaya, slice banana, sprinkle pumpkin seeds."]),
    R("boiled_eggs", "Boiled eggs with pepper", "🥚", "snack", "any", 10, (150, 13, 1, 10),
      [("eggs", 2), ("black_pepper", 1), ("salt", 1)],
      ["Boil eggs 9 minutes, cool, peel and season."]),
    R("corn_chaat", "Sweet corn chaat", "🌽", "snack", "any", 10, (170, 5, 32, 3),
      [("corn", 80), ("onion", 15), ("tomato", 20), ("lemon", 0.5), ("salt", 1)],
      ["Boil corn 5 minutes.", "Toss with onion, tomato, lemon and salt."]),
    R("apple_pb", "Apple + peanut butter", "🍎", "snack", "any", 2, (200, 6, 25, 9),
      [("apple", 1), ("peanut_butter", 15)],
      ["Slice the apple and dip in peanut butter."]),
    R("green_tea_almonds", "Green tea + almonds", "🍵", "snack", "any", 3, (110, 4, 4, 9),
      [("green_tea", 1), ("almonds", 15)],
      ["Brew green tea 2 minutes; have with almonds."]),
    # ---------------- dinner ----------------
    R("mixed_veg_dal", "Mixed veg, moong dal + phulka", "🫓", "dinner", "north", 30, (430, 18, 62, 11),
      [("atta", 60), ("moong_dal", 40), ("carrot", 50), ("peas", 40), ("cauliflower", 60), ("oil", 7), ("cumin", 1), ("salt", 2), ("turmeric", 1)],
      ["Pressure-cook moong dal with turmeric and salt.",
       "Stir-fry carrot, peas and cauliflower with jeera till tender.",
       "Serve with phulkas."]),
    R("dalia_khichdi", "Vegetable dalia khichdi + curd", "🥣", "dinner", "any", 30, (400, 15, 64, 9),
      [("dalia", 55), ("moong_dal", 25), ("carrot", 40), ("peas", 30), ("curd", 100), ("ghee", 4), ("cumin", 1), ("salt", 2)],
      ["Roast dalia in ghee with jeera for 2 minutes.",
       "Add moong dal, vegetables, salt and 3 cups water; pressure-cook 3 whistles.",
       "Serve with curd."]),
    R("grilled_paneer", "Grilled paneer + sautéed veg", "🍢", "dinner", "any", 20, (430, 26, 18, 27),
      [("paneer", 100), ("capsicum", 60), ("mushroom", 60), ("onion", 30), ("oil", 5), ("black_pepper", 1), ("salt", 2)],
      ["Season paneer slices with salt and pepper and pan-grill 2 minutes a side.",
       "Sauté capsicum, mushroom and onion on high heat.",
       "Plate together."], "high_sat_fat"),
    R("grilled_chicken", "Grilled chicken + sautéed veg", "🍗", "dinner", "any", 25, (400, 40, 16, 18),
      [("chicken_breast", 140), ("capsicum", 60), ("cabbage", 60), ("curd", 30), ("lemon", 0.5), ("oil", 6), ("chilli_powder", 1), ("salt", 2)],
      ["Marinate chicken in curd, lemon, chilli powder and salt for 20 minutes.",
       "Pan-grill 5–6 minutes a side till cooked through.",
       "Sauté capsicum and cabbage and serve alongside."]),
    R("ragi_dal_palak", "Ragi roti + dal palak", "🫓", "dinner", "any", 30, (420, 18, 62, 10),
      [("ragi", 60), ("toor_dal", 40), ("spinach", 120), ("tomato", 40), ("garlic", 4), ("oil", 6), ("salt", 2), ("turmeric", 1)],
      ["Pressure-cook toor dal with turmeric.",
       "Cook garlic and tomato, add chopped spinach till wilted, then the dal.",
       "Knead ragi atta with hot water, pat into rotis and cook on a tawa."], "high_iron"),
    R("moong_soup_tofu", "Moong soup + tofu stir-fry", "🍲", "dinner", "any", 25, (380, 26, 34, 15),
      [("moong_dal", 35), ("tofu", 120), ("cabbage", 60), ("capsicum", 40), ("ginger", 3), ("garlic", 3), ("oil", 6), ("black_pepper", 1), ("salt", 2)],
      ["Cook moong dal with extra water, ginger and salt into a thin soup; add pepper.",
       "Stir-fry tofu, cabbage, capsicum and garlic on high heat for 5 minutes."]),
    R("bajra_lauki_dal", "Bajra roti + lauki chana dal", "🫓", "dinner", "west", 35, (430, 17, 64, 11),
      [("bajra", 60), ("chana_dal", 40), ("lauki", 150), ("tomato", 30), ("oil", 6), ("cumin", 1), ("salt", 2), ("turmeric", 1)],
      ["Pressure-cook chana dal and lauki with turmeric and salt for 3 whistles.",
       "Temper jeera and tomato in oil and add to the dal.",
       "Knead bajra atta with warm water, pat into rotis and cook on a tawa."], "high_iron"),
    R("fish_tikka", "Fish tikka + salad", "🐟", "dinner", "any", 25, (380, 34, 12, 20),
      [("fish", 140), ("curd", 40), ("lemon", 0.5), ("cucumber", 60), ("tomato", 40), ("oil", 6), ("chilli_powder", 1), ("salt", 2)],
      ["Marinate fish in curd, lemon, chilli powder and salt for 15 minutes.",
       "Pan-grill 3 minutes a side.",
       "Serve with cucumber and tomato salad."]),
    R("masoor_jeera_rice", "Masoor dal + jeera rice", "🍛", "dinner", "north", 30, (430, 18, 68, 9),
      [("masoor_dal", 45), ("rice", 45), ("onion", 30), ("tomato", 40), ("garlic", 3), ("oil", 6), ("cumin", 2), ("salt", 2), ("turmeric", 1)],
      ["Cook masoor dal with turmeric and salt till soft.",
       "Temper jeera, garlic, onion and tomato and stir into the dal.",
       "Cook rice with jeera."]),
    R("aloo_gobi_dal", "Aloo gobi, dal + phulka", "🫓", "dinner", "north", 35, (460, 16, 70, 13),
      [("potato", 80), ("cauliflower", 120), ("masoor_dal", 35), ("atta", 50), ("oil", 8), ("cumin", 1), ("coriander_powder", 1), ("salt", 2), ("turmeric", 1)],
      ["Cook masoor dal with turmeric and salt.",
       "Cook potato and cauliflower with jeera, dhania powder and turmeric, covered, for 12 minutes.",
       "Serve with phulkas."]),
    R("egg_wrap", "Egg veggie wrap", "🌯", "dinner", "any", 20, (430, 22, 42, 18),
      [("eggs", 2), ("atta", 60), ("onion", 30), ("capsicum", 30), ("cabbage", 40), ("oil", 6), ("salt", 1)],
      ["Make a roti from the atta.",
       "Pour beaten eggs into a pan, lay the roti on top, flip and cook.",
       "Fill with shredded cabbage, onion and capsicum and roll up."]),
    R("mushroom_matar", "Mushroom matar + jowar roti", "🍄", "dinner", "any", 30, (410, 17, 58, 12),
      [("mushroom", 120), ("peas", 60), ("jowar", 60), ("onion", 30), ("tomato", 50), ("oil", 7), ("garam_masala", 1), ("salt", 2)],
      ["Cook onion and tomato with garam masala till jammy.",
       "Add mushroom and peas; cook 8 minutes.",
       "Serve with jowar rotis."]),
    R("chicken_soup_veg", "Chicken soup + stir-fried veg", "🍲", "dinner", "any", 30, (360, 34, 20, 14),
      [("chicken_breast", 120), ("carrot", 50), ("cabbage", 60), ("ginger", 3), ("garlic", 3), ("oil", 4), ("black_pepper", 1), ("salt", 2)],
      ["Simmer chicken with ginger, garlic, salt and 3 cups water for 20 minutes; shred.",
       "Add pepper and chopped carrot to the soup.",
       "Stir-fry cabbage separately."]),
    R("prawn_masala", "Prawn masala + rice", "🍤", "dinner", "east", 30, (480, 30, 60, 12),
      [("prawns", 120), ("rice", 55), ("onion", 40), ("tomato", 50), ("coconut", 15), ("oil", 7), ("chilli_powder", 1), ("salt", 2), ("turmeric", 1)],
      ["Cook onion and tomato with chilli powder and turmeric.",
       "Add coconut and a splash of water, then prawns; cook 5 minutes.",
       "Serve with rice."], "high_purine"),
]


def kind(recipe):
    flags = {f for item in recipe["ingredients"] for f in INGREDIENTS[item["id"]][4].split()}
    if flags & {"meat", "fish"}:
        return "nonveg"
    if "egg" in flags:
        return "egg"
    if "dairy" in flags:
        return "veg"
    return "vegan"


def main():
    ingredients = [
        {"id": k, "name": n, "aisle": a, "unit": u, "price": p, "flags": f.split(), "search": s}
        for k, (n, a, u, p, f, s) in INGREDIENTS.items()
    ]
    recipes = []
    for r in RECIPES:
        for item in r["ingredients"]:
            assert item["id"] in INGREDIENTS, (r["id"], item["id"])
        flags = {f for item in r["ingredients"] for f in INGREDIENTS[item["id"]][4].split()}
        r["kind"] = kind(r)
        roots = {i["id"] for i in r["ingredients"] if "root" in INGREDIENTS[i["id"]][4].split()}
        # "adapt": the only root items are aromatics a Jain cook simply leaves out (hing instead)
        r["jain"] = "no" if r["kind"] not in ("veg", "vegan") else "yes" if not roots else "adapt" if roots <= {"onion", "garlic", "ginger"} else "no"
        r["allergens"] = sorted(flags & {"dairy", "nuts", "peanut", "gluten", "soy", "egg", "fish", "shellfish"})
        recipes.append(r)
    ids = [r["id"] for r in recipes]
    assert len(ids) == len(set(ids)), "duplicate recipe id"
    out = Path(__file__).resolve().parents[1] / "Aharya" / "Resources" / "catalog.json"
    out.write_text(json.dumps({"ingredients": ingredients, "recipes": recipes}, ensure_ascii=False, indent=1))
    by_slot = {}
    for r in recipes:
        by_slot.setdefault(r["slot"], []).append(r["kind"])
    print(f"{len(ingredients)} ingredients, {len(recipes)} recipes -> {out}")
    for slot, kinds in by_slot.items():
        print(f"  {slot}: {len(kinds)} ({', '.join(f'{k}={kinds.count(k)}' for k in sorted(set(kinds)))})")


if __name__ == "__main__":
    main()
