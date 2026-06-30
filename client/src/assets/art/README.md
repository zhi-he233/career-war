Art assets for the Career War tabletop card game.

## Directory roles

- `characters/`: pixel fighter portraits and tiny idle sprites. Current set: 15 AI-generated heroes.
- `homepage/`: deployed tavern/tabletop UI sprites generated from the homepage source sheet.
- `dice/`: reserved dice-specific folder. Current deployed dice faces live in `homepage/` because they come from the same sheet.
- `effects/`: reserved combat effects folder. TODO: hit flashes, shield pops, heal bursts, crit bursts.
- `ui/`: reserved generic UI folder. Current deployed card frames live in `homepage/` because they come from the same sheet.

## Homepage Assets

- Scene: `tavern_table.webp`.
- Main CTA: `roguelite_object.png`.
- Card frames: `card_rogue.png`, `card_versus.png`, `card_training.png`.
- Dice faces: `dice_1.png` through `dice_6.png`.
- Map node tokens: `node_battle.png`, `node_elite.png`, `node_boss.png`, `node_event.png`, `node_shop.png`, `node_rest.png`, `node_reward.png`, `node_fate.png`.
- Props: `prop_candle.png`, `prop_tankard.png`, `prop_bulletin_board.png`, `prop_coin_pouch.png`, `prop_wooden_sign.png`.
- Rings: `ring_gold.png`, `ring_blue.png`, `ring_green.png`.
- Manifest: `manifest.json`.

## Source Pipeline

- Source sheet: `art-source/homepage/raw-ai/ui汇总.png`.
- Preview output: `art-source/homepage/processed-preview.png`.
- Processor: `scripts/process-homepage-ui-art.js`.
- Command: `npm run process:homepage-ui-art`.
- Output: `client/src/assets/art/homepage/`.

## Runtime Usage

- Home scene uses `tavern_table.webp`, `roguelite_object.png`, props, card frames, and `dice_1.png`.
- Battle dice panel uses `dice_1.png` through `dice_6.png`.
- Roguelite map nodes use `node_*` token sprites.

## Rules

- Keep source AI sheets under `art-source/`, not under `client/src/assets/`.
- Keep generated runtime assets under `client/src/assets/art/`.
- Re-run `npm run process:homepage-ui-art` after replacing the homepage source sheet.
- Update this README when adding a new asset category or moving runtime usage.
