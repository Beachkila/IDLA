# IDLA – Shelf Stocker

IDLA is a two-screen, DS-style browser game about stocking a grocery store. You drive a walkie pallet truck from the warehouse door to a shelf location, then unload the pallet case by case onto the right spots. It started as a design for a Nintendo DS homebrew game (DSPico) and is being prototyped as a web game that runs on a phone.

Made by Beach / Studio Wetware.

## How it plays

- **Top screen:** store map, current task, score.
- **Bottom screen:** close-up of the truck in the aisles. During an unload it shows three 4-ft shelf sections to drag cases onto.
- **Joystick:** walks the operator. Pointing ahead pulls the truck, with the pallet trailing behind. Pointing back pushes it forks-first. The truck pivots on its load wheels, so the pallet cuts inside on turns and can clip shelf ends.
- **A:** unload when the pallet is parked over the drop zone and lined up with the shelf, or pick up the next pallet at the warehouse door.
- **B:** horn. Nearby shoppers stop for a moment.
- **Shift:** a shift is 4 pallets. The score is placement points with a combo bonus, plus a time bonus, minus penalties for bumping carts, clipping shelves, and wrong placements found at the end-of-shift audit.

### Modes

| Mode | Rules |
|---|---|
| New Hire | Wrong spots are blocked, and matching spots glow while dragging |
| Easy | No blocking. Wrong placements are counted at the end-of-shift audit |
| Medium | Easy, plus shoppers with carts in the aisles |
| Hard | Medium, plus shoppers stop you to ask where a product is |
| Daily Shift | Medium rules, with the same pallets and locations for every player on that UTC day |

There are two playable stockers, chosen from the Character screen. The choice is saved on the phone.

### Store layout

The store is 120 × 94 ft with 200 shelf sections at 4 ft each: 72 on the walls and 128 on the islands. Aisles between islands are 12 ft, which is room for two trucks to pass. Section tags (for example `CHIPS-05`) are numbered per area.

