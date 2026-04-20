# Project 9: Joystick Game Controller — Play a Text Adventure!

## What you'll learn
- How a joystick uses two potentiometers (variable resistors) to measure X and Y position
- How to read analog values with the Pico's ADC (Analog-to-Digital Converter)
- How to build a simple game state machine with rooms, items, and events
- How to use the buzzer for sound effects and the RGB LED as a health indicator

---

## Parts you'll need

| Part | Source | Approx. cost |
|---|---|---|
| Raspberry Pi Pico 2 W | Store / kit | ~$7.00 |
| Joystick Module | Elegoo 37 Sensor Kit | included |
| Passive Buzzer Module | Elegoo 37 Sensor Kit | included |
| RGB LED Module | Elegoo 37 Sensor Kit | included |
| Breadboard + jumper wires | Your kit | included |

**Total extra cost beyond the kit: ~$7 for the Pico if you don't already have one.**

---

## Background

The very first joystick was invented to steer aircraft — a pilot pushed the stick forward to nose down, pulled back to climb, and tilted left or right to bank. The idea was so intuitive that when video games arrived in the 1970s, designers borrowed the same control. Today the thumbsticks on a PlayStation or Xbox controller are tiny versions of exactly the same mechanism: two potentiometers (variable resistors) at 90 degrees to each other. When you push the stick left, one potentiometer turns, changing its resistance and the voltage across it. The Pico's ADC (Analog-to-Digital Converter) measures that voltage and converts it to a number from 0 to 4095 — 0 when the stick is all the way one direction, 4095 when it is all the way the other, and about 2048 (the middle) when you let go.

Text adventure games are the grandparents of all modern RPGs (role-playing games). Before graphics were good enough to show pictures, games described everything in words: "You are in a dark cave. Exits: North, East." You typed "Go North" and read what happened next. They were invented in the 1970s and some of them, like Zork, are still played today. In this project you are building a mini dungeon adventure — five rooms arranged in a cross shape, with treasure to find, traps to dodge, and a monster to defeat by pressing the joystick button. All of the story prints to your serial monitor, and the joystick navigates you through the world. The RGB LED shows your health at a glance and the buzzer plays sound effects for every event.

The game has a state machine at its heart — a data structure that tracks which room you are in, your health, whether you have picked up the treasure, and whether you have won or lost. State machines are used in almost every piece of software you have ever used: menu systems, vending machines, traffic lights, and your Pico itself all use them. Learning to think in states is one of the most powerful programming skills you can develop.

---

## Wiring

| From | To | Notes |
|---|---|---|
| Joystick VCC | 3V3 | 3.3 V power for the potentiometers |
| Joystick GND | GND | Ground |
| Joystick VRx | GP26 | ADC0 — left/right axis |
| Joystick VRy | GP27 | ADC1 — up/down axis |
| Joystick SW | GP14 | Push button — LOW when pressed |
| Passive Buzzer S | GP18 | PWM for sound effects |
| Passive Buzzer VCC | 3V3 | 3.3 V power |
| Passive Buzzer GND | GND | Ground |
| RGB LED R | GP9 | PWM red channel |
| RGB LED G | GP10 | PWM green channel |
| RGB LED B | GP11 | PWM blue channel |
| RGB LED GND | GND | Ground |

---

## The code

```c
/**
 * Project 9: Joystick Game Controller — Text Adventure
 * Build a Smart Home series — Raspberry Pi Pico 2 W, Pico SDK
 *
 * Joystick: VRx=GP26(ADC0), VRy=GP27(ADC1), SW=GP14
 * Buzzer:   GP18 (PWM)
 * RGB LED:  R=GP9, G=GP10, B=GP11 (PWM)
 *
 * Navigate a 5-room dungeon via serial monitor.
 * Find the treasure and return to the start room to win!
 */

#include "pico/stdlib.h"
#include "hardware/adc.h"
#include "hardware/pwm.h"
#include "hardware/gpio.h"
#include <stdio.h>
#include <string.h>
#include <stdbool.h>

// ── Pin definitions ───────────────────────────────────────────────────────────
#define PIN_JOY_VRX    26   // ADC0
#define PIN_JOY_VRY    27   // ADC1
#define PIN_JOY_SW     14   // Button
#define PIN_BUZZER     18
#define PIN_LED_R       9
#define PIN_LED_G      10
#define PIN_LED_B      11

// ── Joystick constants ────────────────────────────────────────────────────────
#define ADC_CENTER     2048
#define DEADZONE        350   // +/- from center counts as neutral
#define ADC_MAX        4095

// ── Game constants ────────────────────────────────────────────────────────────
#define MAX_HEALTH       3
#define NUM_ROOMS        5
#define FIGHT_PRESSES    3    // Button presses to win a fight

// ── Room indices ──────────────────────────────────────────────────────────────
#define ROOM_START       0
#define ROOM_NORTH       1
#define ROOM_EAST        2
#define ROOM_SOUTH       3
#define ROOM_WEST        4

// ── Exit directions (index into exits[] array, -1 = no exit) ─────────────────
// exits[room][direction]: N=0, E=1, S=2, W=3
// Layout:          [1 North]
//          [4 W] - [0 Start] - [2 E]
//                  [3 South]
static const int exits[NUM_ROOMS][4] = {
    // N            E            S            W
    { ROOM_NORTH,  ROOM_EAST,   ROOM_SOUTH,  ROOM_WEST  },  // Room 0: Start
    { -1,          -1,          ROOM_START,  -1         },  // Room 1: North
    { -1,          -1,          -1,          ROOM_START },  // Room 2: East
    { ROOM_START,  -1,          -1,          -1         },  // Room 3: South
    { -1,          ROOM_START,  -1,          -1         },  // Room 4: West
};

// ── Room descriptions ─────────────────────────────────────────────────────────
static const char *room_names[NUM_ROOMS] = {
    "The Entrance Hall",
    "The Dark Corridor",
    "The Treasure Chamber",
    "The Musty Cellar",
    "The Creaky Attic",
};

static const char *room_descriptions[NUM_ROOMS] = {
    "You stand in a dusty entrance hall. Cobwebs hang from the ceiling.\n"
    "Ancient torches flicker on the walls.",

    "A dark corridor stretches before you. The air is cold and damp.\n"
    "Something drips in the distance... and is that growling?",

    "Your torch illuminates a glittering pile of gold coins in the corner!\n"
    "The TREASURE is here, unguarded and waiting for you.",

    "The cellar smells of old potatoes and something worse.\n"
    "A rusty bear trap sits in the middle of the floor — careful!",

    "Floorboards creak under your feet. Old furniture casts strange shadows.\n"
    "A spider the size of your fist watches you from the rafters.",
};

// ── Room event types ──────────────────────────────────────────────────────────
typedef enum {
    EVENT_NONE,
    EVENT_TREASURE,
    EVENT_TRAP,
    EVENT_MONSTER,
} RoomEvent;

// Which event lives in each room (can change after triggered)
RoomEvent room_event[NUM_ROOMS] = {
    EVENT_NONE,      // Room 0: Start — safe
    EVENT_MONSTER,   // Room 1: Dark Corridor — monster!
    EVENT_TREASURE,  // Room 2: Treasure Chamber — treasure!
    EVENT_TRAP,      // Room 3: Cellar — trap!
    EVENT_NONE,      // Room 4: Attic — just creepy
};

// ── Game state ────────────────────────────────────────────────────────────────
typedef struct {
    int  current_room;
    int  health;
    bool has_treasure;
    bool game_over;
    bool won;
} GameState;

GameState game;

// ── PWM helpers ───────────────────────────────────────────────────────────────
void pwm_init_pin(uint pin) {
    gpio_set_function(pin, GPIO_FUNC_PWM);
    uint slice = pwm_gpio_to_slice_num(pin);
    pwm_set_wrap(slice, 255);
    pwm_set_enabled(slice, true);
    pwm_set_chan_level(slice, pwm_gpio_to_channel(pin), 0);
}

void set_brightness(uint pin, uint8_t v) {
    pwm_set_chan_level(pwm_gpio_to_slice_num(pin), pwm_gpio_to_channel(pin), v);
}

void set_rgb(uint8_t r, uint8_t g, uint8_t b) {
    set_brightness(PIN_LED_R, r);
    set_brightness(PIN_LED_G, g);
    set_brightness(PIN_LED_B, b);
}

// ── Buzzer tone ───────────────────────────────────────────────────────────────
void tone(uint freq_hz, int ms) {
    if (freq_hz == 0) { sleep_ms(ms); return; }
    uint slice = pwm_gpio_to_slice_num(PIN_BUZZER);
    uint chan  = pwm_gpio_to_channel(PIN_BUZZER);
    pwm_set_clkdiv(slice, 8.0f);
    uint32_t wrap = 15625000 / freq_hz;
    if (wrap > 65535) wrap = 65535;
    pwm_set_wrap(slice, (uint16_t)wrap);
    pwm_set_chan_level(slice, chan, (uint16_t)(wrap / 2));
    pwm_set_enabled(slice, true);
    sleep_ms(ms);
    pwm_set_chan_level(slice, chan, 0);
}

// ── Sound effects ─────────────────────────────────────────────────────────────
void sfx_move()    { tone(440, 60); }
void sfx_bad()     { tone(200, 200); sleep_ms(50); tone(150, 300); }
void sfx_treasure(){ tone(523,80); tone(659,80); tone(784,80); tone(1047,200); }
void sfx_win()     { tone(523,100); tone(659,100); tone(784,100);
                     tone(1047,100); tone(1319,300); }
void sfx_lose()    { tone(330,200); tone(220,200); tone(110,500); }
void sfx_fight()   { tone(880, 40); tone(660, 40); }
void sfx_victory() { tone(784, 60); tone(880, 60); tone(1047, 120); }

// ── Update RGB LED to show health ─────────────────────────────────────────────
void update_health_led() {
    if (game.health <= 0) {
        // Dead: flash red
        static bool flash = false;
        set_rgb(flash ? 255 : 0, 0, 0);
        flash = !flash;
    } else if (game.health == 1) {
        set_rgb(255, 0, 0);      // Red: low health
    } else if (game.health == 2) {
        set_rgb(255, 165, 0);    // Orange: half health (mix R+G)
    } else {
        set_rgb(0, 220, 0);      // Green: full health
    }
}

// ── Print the ASCII map ───────────────────────────────────────────────────────
void print_map() {
    // Format:  [ N ]        (or [ ? ] if unvisited, but we'll show all for fun)
    //     [W]-[*]-[E]
    //          [ S ]
    // Use '@' for current room, letters for others
    char cells[NUM_ROOMS] = { '1', '2', '3', '4', '5' };
    cells[game.current_room] = '@';   // '@' marks current position

    printf("\n  Map (@ = you):\n");
    printf("       [%c]\n",       cells[ROOM_NORTH]);
    printf("  [%c] -[%c]- [%c]\n", cells[ROOM_WEST], cells[ROOM_START], cells[ROOM_EAST]);
    printf("       [%c]\n\n",     cells[ROOM_SOUTH]);
    printf("  1=Entrance 2=Corridor 3=Chamber 4=Cellar 5=Attic\n\n");
}

// ── Describe the current room ─────────────────────────────────────────────────
void describe_room() {
    int r = game.current_room;
    printf("\n");
    printf("========================================\n");
    printf("  %s\n", room_names[r]);
    printf("========================================\n");
    printf("%s\n\n", room_descriptions[r]);

    // Exits
    const char *dir_names[4] = {"North", "East", "South", "West"};
    printf("Exits: ");
    bool any = false;
    for (int d = 0; d < 4; d++) {
        if (exits[r][d] != -1) {
            printf("%s  ", dir_names[d]);
            any = true;
        }
    }
    if (!any) printf("(none — you are trapped!)");
    printf("\n");

    // Status
    printf("Health: ");
    for (int h = 0; h < MAX_HEALTH; h++) {
        printf(h < game.health ? "[*]" : "[ ]");
    }
    printf("\n");
    printf("Treasure: %s\n\n", game.has_treasure ? "YES! You have it!" : "Not yet...");
}

// ── Handle room event ─────────────────────────────────────────────────────────
void handle_event(int room) {
    switch (room_event[room]) {

        case EVENT_TREASURE:
            printf("*** You grab the TREASURE! It glitters beautifully. ***\n");
            printf("Now get back to the Entrance to escape!\n\n");
            game.has_treasure = true;
            sfx_treasure();
            room_event[room] = EVENT_NONE;   // Treasure is picked up
            break;

        case EVENT_TRAP:
            printf("*** SNAP! You step in the bear trap! Ouch! -1 health ***\n\n");
            game.health--;
            sfx_bad();
            set_rgb(255, 0, 0);
            sleep_ms(500);
            room_event[room] = EVENT_NONE;   // Trap triggered, won't hurt again
            break;

        case EVENT_MONSTER: {
            printf("*** A SLIME MONSTER blocks the way! ***\n");
            printf("Press the joystick button %d times quickly to fight it off!\n\n",
                   FIGHT_PRESSES);

            int presses   = 0;
            int timeouts  = 0;
            bool defeated = false;

            while (presses < FIGHT_PRESSES && timeouts < 30) {
                printf("Presses: %d / %d  — press button!\n", presses, FIGHT_PRESSES);
                update_health_led();

                // Wait up to 1.5 seconds for a button press
                uint64_t wait_start = time_us_64();
                bool pressed = false;
                while (time_us_64() - wait_start < 1500000) {
                    if (gpio_get(PIN_JOY_SW) == 0) {
                        pressed = true;
                        while (gpio_get(PIN_JOY_SW) == 0) sleep_ms(10);  // Wait for release
                        break;
                    }
                    sleep_ms(20);
                }

                if (pressed) {
                    presses++;
                    sfx_fight();
                } else {
                    timeouts++;
                }
            }

            if (presses >= FIGHT_PRESSES) {
                printf("*** You defeated the monster! Excellent work! ***\n\n");
                sfx_victory();
                room_event[room] = EVENT_NONE;  // Monster gone
            } else {
                printf("*** The monster gets you! -1 health ***\n\n");
                game.health--;
                sfx_bad();
            }
            break;
        }

        case EVENT_NONE:
        default:
            break;
    }

    // Check death
    if (game.health <= 0) {
        game.health   = 0;
        game.game_over = true;
        game.won       = false;
    }

    // Check win condition
    if (game.has_treasure && game.current_room == ROOM_START) {
        game.game_over = true;
        game.won       = true;
    }
}

// ── Read joystick direction (-1 = none, 0=N, 1=E, 2=S, 3=W) ──────────────────
int read_joystick_direction() {
    adc_select_input(0);  // VRx on ADC0
    uint16_t x = adc_read();
    adc_select_input(1);  // VRy on ADC1
    uint16_t y = adc_read();

    // Determine strongest axis
    int dx = (int)x - ADC_CENTER;
    int dy = (int)y - ADC_CENTER;

    if (abs(dx) < DEADZONE && abs(dy) < DEADZONE) return -1;  // Neutral

    if (abs(dx) > abs(dy)) {
        // Horizontal movement
        return (dx > 0) ? 1 : 3;   // East or West
    } else {
        // Vertical movement (VRy: low = pushed forward = North)
        return (dy < 0) ? 0 : 2;   // North or South
    }
}

// ── Reset and start game ──────────────────────────────────────────────────────
void reset_game() {
    game.current_room = ROOM_START;
    game.health       = MAX_HEALTH;
    game.has_treasure = false;
    game.game_over    = false;
    game.won          = false;

    // Reset room events
    room_event[ROOM_NORTH] = EVENT_MONSTER;
    room_event[ROOM_EAST]  = EVENT_TREASURE;
    room_event[ROOM_SOUTH] = EVENT_TRAP;
    room_event[ROOM_WEST]  = EVENT_NONE;
    room_event[ROOM_START] = EVENT_NONE;
}

// ── Main ──────────────────────────────────────────────────────────────────────
int main() {
    stdio_init_all();
    sleep_ms(2000);

    printf("================================================\n");
    printf("  Project 9: Joystick Text Adventure\n");
    printf("  Smart Home Series — Pico 2 W\n");
    printf("================================================\n\n");
    printf("Controls:\n");
    printf("  Push joystick UP    = Go North\n");
    printf("  Push joystick DOWN  = Go South\n");
    printf("  Push joystick RIGHT = Go East\n");
    printf("  Push joystick LEFT  = Go West\n");
    printf("  Press button (SW)   = Action / Fight\n\n");

    // ── ADC init ──────────────────────────────────────────────────────────────
    adc_init();
    adc_gpio_init(PIN_JOY_VRX);
    adc_gpio_init(PIN_JOY_VRY);

    // ── Joystick button ───────────────────────────────────────────────────────
    gpio_init(PIN_JOY_SW);
    gpio_set_dir(PIN_JOY_SW, GPIO_IN);
    gpio_pull_up(PIN_JOY_SW);

    // ── RGB LED PWM ───────────────────────────────────────────────────────────
    pwm_init_pin(PIN_LED_R);
    pwm_init_pin(PIN_LED_G);
    pwm_init_pin(PIN_LED_B);

    // ── Buzzer PWM ────────────────────────────────────────────────────────────
    gpio_set_function(PIN_BUZZER, GPIO_FUNC_PWM);
    pwm_set_enabled(pwm_gpio_to_slice_num(PIN_BUZZER), true);

    // ── Start game ────────────────────────────────────────────────────────────
    reset_game();
    printf("Press the joystick button to start your adventure!\n");

    // Wait for button press to start
    while (gpio_get(PIN_JOY_SW) != 0) sleep_ms(50);
    while (gpio_get(PIN_JOY_SW) == 0) sleep_ms(10);

    set_rgb(0, 255, 0);
    sfx_treasure();
    sleep_ms(500);

    describe_room();
    print_map();

    int last_dir     = -1;
    bool moved_once  = true;   // trigger event check on first room

    // ── Main game loop ────────────────────────────────────────────────────────
    while (true) {

        // ── Game over screen ──────────────────────────────────────────────────
        if (game.game_over) {
            if (game.won) {
                printf("\n");
                printf("====================================\n");
                printf("  *** YOU WIN! CONGRATULATIONS! ***\n");
                printf("  You escaped with the treasure!\n");
                printf("====================================\n");
                set_rgb(255, 215, 0);   // Gold colour (mostly R+G)
                sfx_win();
            } else {
                printf("\n");
                printf("====================================\n");
                printf("  *** GAME OVER — YOU DIED! ***\n");
                printf("  The dungeon claims another soul.\n");
                printf("====================================\n");
                set_rgb(255, 0, 0);
                sfx_lose();
            }

            sleep_ms(2000);
            printf("\nPress joystick button to play again!\n");
            while (gpio_get(PIN_JOY_SW) != 0) sleep_ms(50);
            while (gpio_get(PIN_JOY_SW) == 0) sleep_ms(10);
            reset_game();
            describe_room();
            print_map();
            continue;
        }

        // ── Update health LED ─────────────────────────────────────────────────
        update_health_led();

        // ── Read joystick ─────────────────────────────────────────────────────
        int dir = read_joystick_direction();

        // Only act on a new direction (must return to neutral first)
        if (dir != -1 && dir != last_dir) {
            last_dir = dir;

            int target = exits[game.current_room][dir];
            const char *dir_names[4] = {"North", "East", "South", "West"};

            if (target == -1) {
                printf("You can't go %s from here.\n", dir_names[dir]);
            } else {
                printf("\nMoving %s...\n", dir_names[dir]);
                sfx_move();
                game.current_room = target;
                describe_room();
                print_map();
                handle_event(game.current_room);
            }
        } else if (dir == -1) {
            last_dir = -1;   // Joystick returned to neutral — ready for next move
        }

        sleep_ms(100);
    }

    return 0;
}
```

---

## How the code works

1. **ADC joystick reading:** `adc_select_input(0)` switches the shared ADC to the VRx pin (GP26), then `adc_read()` returns a 12-bit number (0–4095). The same happens for VRy on ADC1 (GP27). Subtracting 2048 (the center) gives a signed value: positive = right/down, negative = left/up. If both axes are within the deadzone of ±350, the joystick is considered neutral.

2. **Direction locking:** The variable `last_dir` stores the last direction reported. A new move only happens when `dir != last_dir` — meaning you have to return the joystick to neutral before the next move registers. Without this, one joystick push would move the player multiple rooms in a single second.

3. **Room exits table:** The `exits[NUM_ROOMS][4]` array is a 5×4 grid. Each row is a room, each column is a compass direction (N/E/S/W). A value of `-1` means no exit. Looking up `exits[current_room][direction]` returns the next room number, or -1 if you cannot go that way. This makes it trivial to redesign the dungeon — just change the numbers in the table.

4. **Event system:** Each room has an entry in `room_event[]` — either NONE, TREASURE, TRAP, or MONSTER. When you enter a room, `handle_event()` checks which event applies and triggers it. After an event fires (treasure collected, trap sprung, monster defeated), the room's event is set back to NONE so it does not happen again. This pattern is called a "consume once" event.

5. **Monster fight mini-game:** When you enter the monster room, the game switches into a tight loop waiting for button presses on the joystick SW pin. You need to press it `FIGHT_PRESSES` (3) times within 30 chances, each with a 1.5-second timeout. It is a quick test of whether you are paying attention!

6. **Health and win/lose conditions:** After every event, the code checks `health <= 0` (game over: death) and `has_treasure && current_room == ROOM_START` (game over: win). The main loop checks `game.game_over` at the top of every iteration, shows the appropriate message, and waits for a button press to restart.

---

## Try it

1. **Draw your own map:** Before playing, sketch the five rooms on paper. Mark where the treasure, trap, and monster are. Then play the game and follow your map. Can you collect the treasure and escape without losing any health?

2. **Add a room:** Change `NUM_ROOMS` to 6, add a new name and description, set its exits in the `exits` table, and give it an event. For example: a `ROOM_CELLAR_2` connected south from the cellar with a second piece of treasure.

3. **Measure ADC values:** Add a temporary printf to the main loop that prints the raw X and Y ADC values every 200 ms. Push the stick in each direction and read the numbers. What is the actual minimum and maximum you get? Is it really 0 and 4095, or slightly different?

4. **Harder fight:** Change `FIGHT_PRESSES` from 3 to 6 and reduce the timeout from 1.5 seconds to 1 second. How does that feel compared to the original? What is a good balance between challenge and frustration?

---

## Challenge

**Inventory system:** Add an array of items (keys, potions, magic sword) that can be found in rooms. Add a "USE" action when the joystick button is pressed outside of combat. A key could unlock a sixth room that was previously blocked (change the exit from -1 to a valid room number). A potion restores 1 health. A magic sword makes the fight mini-game only require 1 press instead of 3. This turns your text adventure into a real mini RPG!

---

## Summary

You built a fully playable text adventure game using a joystick as input, the serial monitor as a display, the RGB LED as a health bar, and the buzzer for sound effects. You learned how ADC converts analog voltages to numbers, how to implement a deadzone, how to use lookup tables for game maps, how to build a consume-once event system, and how to structure a game with a proper win/lose state machine. These patterns — state machines, event tables, lookup arrays — are the foundation of how every game engine ever written works.

---

## How this fits the Smart Home

A smart home is not just about safety and automation — it should also be enjoyable to live in! Project 9 adds entertainment and hands-on programming fun to your smart home skill set. More practically, the joystick and ADC reading skills you just learned are directly useful for building smart-home control panels: imagine a wall-mounted joystick that lets you navigate a menu of scenes (movie mode, morning mode, bedtime mode) and select one by pressing the button. The game mechanics you built are basically the same as a user interface state machine.
