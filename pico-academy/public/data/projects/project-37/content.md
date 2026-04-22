# Project 37: The Ultimate Sensor Challenge — Be a Scientist for a Day!

## 🎯 What You'll Learn
- How to use your accelerometer to build a tilt-controlled game
- How to use FOUR sensors together in one project
- How to use a scoring system in code
- How a real product combines lots of sensors into something cool

## 🛒 Parts You Need

| Part | Price |
|------|-------|
| Raspberry Pi Pico 2 W | $7.00 |
| 3-Axis Accelerometer Module (ADXL335) | $2.50 |
| Active Buzzer Module | $1.00 |
| DHT11 Temperature & Humidity Module | $1.50 |
| Photoresistor Module | $1.00 |
| RGB LED Module | $1.50 |
| Breadboard | $2.00 |
| Jumper Wires | $1.00 |
| **Total** | **~$17.50** |

## 🌟 The Story

You have learned 37 different sensors. You can make lights blink, measure temperature, detect sound, feel vibrations, and even sense invisible infrared light. Now it is time for the ultimate challenge!

In this project, you are going to build a **Tilt Maze game with a weather display**. Here's how it works:

- The **accelerometer** is your game controller — tilt it to move a "ball" through a virtual maze
- The **RGB LED** shows where you are in the maze — different colours for different zones
- The **DHT11** reads the room temperature and humidity — displayed between levels
- The **buzzer** makes sound effects when you reach a goal or hit a wall
- The **photoresistor** controls the game speed — play in a bright room for a fast game, dim the lights for slow mode!

It is a complete, polished gadget that uses FOUR sensors all working together. This is what real products are made of — combining simple sensors in clever ways!

## 🔌 Wiring

| Module | Pico 2 W Pin | Notes |
|--------|--------------|-------|
| Accelerometer VCC | 3V3 | MUST be 3.3V — not 5V! |
| Accelerometer GND | GND | Ground |
| Accelerometer X | GP26 | ADC channel 0 |
| Accelerometer Y | GP27 | ADC channel 1 |
| Accelerometer Z | GP28 | ADC channel 2 |
| RGB LED GND | GND | Common ground |
| RGB LED R | GP15 | Red channel (PWM) |
| RGB LED G | GP16 | Green channel (PWM) |
| RGB LED B | GP17 | Blue channel (PWM) |
| Active Buzzer + | GP13 | Buzzer signal |
| Active Buzzer - | GND | Ground |
| DHT11 VCC | 3V3 | Power |
| DHT11 GND | GND | Ground |
| DHT11 DATA | GP14 | Single-wire data |
| Photoresistor VCC | 3V3 | Power |
| Photoresistor GND | GND | Ground |
| Photoresistor A | GP29 | ADC channel 3 — game speed control |

## 💻 The Code

```c
/**
 * Project 37: The Ultimate Sensor Challenge
 * Raspberry Pi Pico 2 W | Pico SDK | C
 *
 * A tilt-controlled LED colour maze!
 * - Tilt the accelerometer to move through "zones" (colours)
 * - Reach the GOLD zone to score a point and go to the next level
 * - Light level sets game speed
 * - DHT11 shows room temperature between levels
 */

#include "pico/stdlib.h"
#include "hardware/adc.h"
#include "hardware/pwm.h"
#include <stdio.h>

// ── Pin definitions ────────────────────────────────────────────────────────────
#define X_ADC_PIN     26    // Accelerometer X (ADC channel 0)
#define Y_ADC_PIN     27    // Accelerometer Y (ADC channel 1)
#define Z_ADC_PIN     28    // Accelerometer Z (ADC channel 2)
#define LIGHT_ADC_PIN 29    // Photoresistor    (ADC channel 3)
#define DHT11_PIN     14    // DHT11 data pin
#define BUZZER_PIN    13    // Active buzzer
#define LED_R_PIN     15    // RGB LED — red
#define LED_G_PIN     16    // RGB LED — green
#define LED_B_PIN     17    // RGB LED — blue

// ── Game zones — defined by how far you tilt ──────────────────────────────────
// The maze is a 3×3 grid of tilt positions.
// Neutral (flat) = CENTRE. Tilt hard in any direction = outer zone.
#define TILT_SOFT   300     // Small tilt — nearby zone
#define TILT_HARD   600     // Big tilt — outer zone

// ── Zone IDs ──────────────────────────────────────────────────────────────────
#define ZONE_CENTRE   0     // Flat — red
#define ZONE_UP       1     // Tilt forward — blue
#define ZONE_DOWN     2     // Tilt back — cyan
#define ZONE_LEFT     3     // Tilt left — yellow
#define ZONE_RIGHT    4     // Tilt right — purple
#define ZONE_GOAL     5     // Very hard tilt (combo) — GOLD = win!

// ── PWM helpers ───────────────────────────────────────────────────────────────
// Set up a pin for PWM output (used to control LED brightness)
void pwm_setup(uint pin) {
    gpio_set_function(pin, GPIO_FUNC_PWM);
    uint slice = pwm_gpio_to_slice_num(pin);
    pwm_set_wrap(slice, 255);          // 0-255 range
    pwm_set_enabled(slice, true);
}

// Set brightness of one PWM pin (0 = off, 255 = full on)
void pwm_set(uint pin, uint8_t value) {
    pwm_set_gpio_level(pin, value);
}

// ── Set RGB LED colour ─────────────────────────────────────────────────────────
void set_colour(uint8_t r, uint8_t g, uint8_t b) {
    pwm_set(LED_R_PIN, r);
    pwm_set(LED_G_PIN, g);
    pwm_set(LED_B_PIN, b);
}

// ── Buzzer helpers ────────────────────────────────────────────────────────────
void beep(int duration_ms) {
    gpio_put(BUZZER_PIN, true);
    sleep_ms(duration_ms);
    gpio_put(BUZZER_PIN, false);
}

void victory_sound() {
    // Short-short-long beep pattern = level complete!
    beep(80); sleep_ms(80);
    beep(80); sleep_ms(80);
    beep(300);
}

// ── Read accelerometer axis ───────────────────────────────────────────────────
uint16_t read_adc(uint channel) {
    adc_select_input(channel);
    return adc_read();
}

// ── Figure out which game zone we are in ──────────────────────────────────────
int get_zone(int x_offset, int y_offset) {
    // If both axes are tilted a LOT at the same time — that is the GOAL zone!
    if (x_offset > TILT_HARD && y_offset > TILT_HARD) return ZONE_GOAL;
    if (x_offset > TILT_SOFT)                          return ZONE_RIGHT;
    if (x_offset < -TILT_SOFT)                         return ZONE_LEFT;
    if (y_offset > TILT_SOFT)                          return ZONE_UP;
    if (y_offset < -TILT_SOFT)                         return ZONE_DOWN;
    return ZONE_CENTRE;
}

// ── Show a colour for each zone ────────────────────────────────────────────────
void show_zone_colour(int zone) {
    switch (zone) {
        case ZONE_CENTRE: set_colour(200, 0,   0);   break;  // Red
        case ZONE_UP:     set_colour(0,   0,   200); break;  // Blue
        case ZONE_DOWN:   set_colour(0,   200, 200); break;  // Cyan
        case ZONE_LEFT:   set_colour(200, 200, 0);   break;  // Yellow
        case ZONE_RIGHT:  set_colour(100, 0,   200); break;  // Purple
        case ZONE_GOAL:   set_colour(255, 180, 0);   break;  // GOLD! 🏆
        default:          set_colour(0,   0,   0);   break;  // Off
    }
}

// ── Read light level for game speed ───────────────────────────────────────────
// Bright room = fast game (short delay), dark room = slow game (long delay)
uint32_t get_game_delay_ms() {
    adc_select_input(3);             // Channel 3 = GP29 = photoresistor
    uint16_t light = adc_read();     // 0 = dark, 4095 = bright
    // Map: dark (0) → 500ms, bright (4095) → 80ms
    uint32_t delay = 500 - (light * 420 / 4095);
    if (delay < 80)  delay = 80;    // Minimum 80ms
    if (delay > 500) delay = 500;   // Maximum 500ms
    return delay;
}

// ── Simple DHT11 read (same as Lesson 37) ────────────────────────────────────
// Returns temperature in Celsius, or -99 if failed
int read_dht11_temp(uint pin) {
    uint8_t data[5] = {0, 0, 0, 0, 0};
    uint32_t t;

    gpio_init(pin);
    gpio_set_dir(pin, GPIO_OUT);
    gpio_put(pin, 0); sleep_ms(18);   // Start signal
    gpio_put(pin, 1); sleep_us(30);
    gpio_set_dir(pin, GPIO_IN);

    t = 0; while (!gpio_get(pin) && ++t < 10000);
    t = 0; while ( gpio_get(pin) && ++t < 10000);

    for (int i = 0; i < 40; i++) {
        t = 0; while (!gpio_get(pin) && ++t < 10000);
        sleep_us(40);
        if (gpio_get(pin)) data[i/8] |= (1 << (7 - i%8));
        t = 0; while (gpio_get(pin) && ++t < 10000);
    }

    // Checksum check
    if (((data[0]+data[1]+data[2]+data[3]) & 0xFF) != data[4]) return -99;
    return data[2];   // Temperature byte
}

int main() {
    stdio_init_all();
    sleep_ms(2000);

    // ── Hardware setup ─────────────────────────────────────────────────────────
    adc_init();
    adc_gpio_init(X_ADC_PIN);      // Accelerometer X
    adc_gpio_init(Y_ADC_PIN);      // Accelerometer Y
    adc_gpio_init(Z_ADC_PIN);      // Accelerometer Z (not used for game, but good to have)
    adc_gpio_init(LIGHT_ADC_PIN);  // Light sensor

    pwm_setup(LED_R_PIN);
    pwm_setup(LED_G_PIN);
    pwm_setup(LED_B_PIN);

    gpio_init(BUZZER_PIN); gpio_set_dir(BUZZER_PIN, GPIO_OUT);

    // ── Start-up lightshow ────────────────────────────────────────────────────
    printf("\n🏆 Ultimate Sensor Challenge — Tilt Maze Game!\n");
    printf("Tilt the accelerometer to change LED colours.\n");
    printf("Tilt BOTH X and Y far right/forward to reach GOLD and score!\n\n");

    int colours[6][3] = {
        {200,0,0}, {0,0,200}, {0,200,200}, {200,200,0}, {100,0,200}, {255,180,0}
    };
    for (int i = 0; i < 6; i++) {
        set_colour(colours[i][0], colours[i][1], colours[i][2]);
        sleep_ms(200);
    }
    set_colour(0, 0, 0);
    beep(100);

    // ── Game variables ────────────────────────────────────────────────────────
    int score = 0;
    int level = 1;
    int prev_zone = -1;
    uint32_t goal_entered_ms = 0;    // When did we enter the GOLD zone?
    bool in_goal = false;
    const uint32_t GOAL_HOLD_MS = 1500;  // Must stay in GOLD for 1.5 seconds to score!

    printf("Level %d — Find the GOLD zone! (Score: %d)\n", level, score);

    while (true) {
        // ── Read accelerometer ─────────────────────────────────────────────────
        uint16_t x_raw = read_adc(0);
        uint16_t y_raw = read_adc(1);
        int x_offset = (int)x_raw - 2048;   // How far from flat
        int y_offset = (int)y_raw - 2048;

        // ── Figure out which zone we are in ───────────────────────────────────
        int zone = get_zone(x_offset, y_offset);

        // ── Show the zone colour on the RGB LED ───────────────────────────────
        show_zone_colour(zone);

        // ── If we just entered a new zone, beep softly ────────────────────────
        if (zone != prev_zone) {
            if (zone != ZONE_GOAL) {
                beep(20);   // Quick short beep when moving zones
            }
            in_goal = false;   // Reset goal timer if we moved
            prev_zone = zone;
            printf("Zone: %d  X=%d  Y=%d\n", zone, x_offset, y_offset);
        }

        // ── GOAL zone logic — must hold steady for 1.5 seconds ────────────────
        if (zone == ZONE_GOAL) {
            if (!in_goal) {
                in_goal = true;
                goal_entered_ms = to_ms_since_boot(get_absolute_time());
                printf("🏆 Hold steady... keep the GOLD zone lit!\n");
            } else {
                uint32_t now = to_ms_since_boot(get_absolute_time());
                uint32_t held_ms = now - goal_entered_ms;

                // Show how close they are — LED gets brighter!
                uint8_t brightness = (uint8_t)(held_ms * 255 / GOAL_HOLD_MS);
                set_colour(brightness, (uint8_t)(brightness * 180 / 255), 0);  // Gold scales up

                if (held_ms >= GOAL_HOLD_MS) {
                    // SCORED!
                    score++;
                    level++;
                    printf("\n🎉 GOAL! Score = %d | Level = %d\n", score, level);

                    // Show room temperature between levels
                    int temp = read_dht11_temp(DHT11_PIN);
                    if (temp != -99) {
                        printf("🌡 Room temperature right now: %d °C\n", temp);
                    }

                    // Victory light show!
                    victory_sound();
                    for (int i = 0; i < 5; i++) {
                        set_colour(255, 180, 0); sleep_ms(100);
                        set_colour(0, 0, 0);     sleep_ms(100);
                    }

                    printf("\nLevel %d — Find the GOLD zone again! (Score: %d)\n", level, score);

                    // Next level hint: tell player what the goal zone direction is
                    printf("Hint: tilt RIGHT and FORWARD at the same time!\n\n");

                    in_goal = false;
                }
            }
        }

        // ── Game speed is controlled by light level ────────────────────────────
        sleep_ms(get_game_delay_ms());
    }

    return 0;
}
```

---

## 🔍 How It Works

**The Game Loop:**
1. Every frame the Pico reads the accelerometer to see which way you are tilting
2. It maps the tilt to one of 6 colour zones (Red, Blue, Cyan, Yellow, Purple, or Gold)
3. The RGB LED lights up in that zone's colour
4. To score, you must tilt to the GOLD zone (both X and Y hard right+forward) AND hold it steady for 1.5 seconds — no wobbling!
5. Every time you score, the Pico reads the temperature to give you a "level break" message

**Why 1.5 seconds?** Tilt-based games need a hold timer because your hand always wobbles a bit. Without the timer, the sensor would jump in and out of the goal zone 10 times a second by accident! Requiring a hold makes it feel deliberate and satisfying.

**Light-controlled speed:** The photoresistor changes the game loop speed. This is called a **difficulty modifier**. In the dark the game is slower (easier to control). In bright light it runs faster (harder). Real video games use all sorts of clever tricks like this!

---

## 🧪 Try It!

1. **Play the game:** Tilt the board around and watch the colours change. Learn which direction gives which colour. Then try to hold the GOLD (bright yellow) zone for 1.5 seconds!

2. **Cover the light sensor:** Cover the photoresistor with your hand to slow the game down. Shine a torch on it to speed it up!

3. **Make it harder:** Change `TILT_HARD` from 600 to 800. Now you have to tilt MORE to reach the goal zone. Is it harder?

4. **Add a high score:** The code tracks `score` but never saves it. Can you add a `high_score` variable that saves the best score of the session? Print it to the serial terminal after every level!

5. **🚀 Big Challenge — Wi-Fi leaderboard:** Use the Pico W's Wi-Fi to post your score to a webpage so your friends can see it. Look up the Pico W HTTP request example on the Raspberry Pi website!

---

## 🏆 Congratulations — You Completed All 37 Projects!

Here is everything you built:

| Project | What You Made |
|---------|--------------|
| 1 | Smart Nightlight |
| 2 | Musical Doorbell |
| 3 | Clap-Activated Light |
| 4 | Tilt Alarm |
| 5 | Wheel Encoder |
| 6 | Laser Tripwire Alarm |
| 7 | TV Remote Light Controller |
| 8 | Smart Thermostat |
| 9 | Joystick Text Adventure |
| 10 | Line Follower |
| 11 | Touch Mood Lamp |
| 12 | Plant Health Monitor |
| 13 | OLED Status Display |
| 14 | RGB Status Bar |
| 15 | Buzzer Sound Effects |
| 16 | Morse Code Communicator |
| 17 | Bluetooth Remote Control |
| 18 | Wi-Fi Web Joystick |
| 19 | Telemetry Dashboard |
| 20 | Full Security System |
| 21 | Fever Checker |
| 22 | Traffic Light |
| 23 | Magic Door Alarm |
| 24 | Secret Treasure Box |
| 25 | Robot Obstacle Detector |
| 26 | Rainbow Party Mode |
| 27 | Auto Dimmer |
| 28 | Noise Level Meter |
| 29 | Whisper Challenge |
| 30 | Pocket Thermometer |
| 31 | Magnet Strength Meter |
| 32 | Compass Pointer |
| 33 | Tiny Rainbow Light Show |
| 34 | TV Remote Clone |
| 35 | Knock Knock Game |
| 36 | Laser Light Show |
| **37** | **🏆 Ultimate Tilt Maze Game** |

You are officially a **Pico Engineer**! You have learned:
- How 37 different electronic sensors work
- How to write C programs that react to the real world
- How to wire breadboard circuits safely
- How to combine sensors into complete, working projects
- How professional engineers build cool things

**Keep going!** Real engineers never stop learning. Your next adventure could be:
- 3D printing a case for your weather station
- Using the Pico W Wi-Fi to control projects from your phone
- Building a small robot that can navigate on its own
- Teaching a friend everything you just learned

You built something amazing. Be proud of yourself! 🚀
