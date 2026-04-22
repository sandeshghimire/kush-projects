# Smart Nightlight — Lights That Know When It's Dark

## 🎯 What You'll Learn
- How to read a light sensor using the Pico's ADC
- How to control an RGB LED with PWM to make any color
- How to smooth out wobbly sensor readings with a moving average
- How to map one range of numbers to another range
- How real automatic lighting systems work

## 🛒 Parts You Need
- Raspberry Pi Pico 2 W — the brain of your project (~$6.00)
- Photoresistor Module (from Elegoo 37 Sensor Kit) — detects light (~$1.00)
- RGB LED Module (from Elegoo 37 Sensor Kit) — makes colors (~$0.50)
- Breadboard — holds everything together (~$2.00)
- Jumper wires — connects the parts (~$1.00)

**Total: ≈ $10.50**

## 🌟 Background / The Story

Have you noticed that street lights turn on by themselves when it gets dark? Nobody climbs a ladder to flip a switch! Each street light has a tiny sensor called a **photoresistor** that measures how bright the sky is. When it gets dark enough, the light switches on. It sounds like magic — but it's really just code and electronics!

Your phone does something similar. Walk into a dark room and the screen dims. Step into bright sunshine and it cranks up so you can read it. Your phone has a tiny light sensor near the front camera checking the brightness every second!

Today you're building exactly the same thing — a colored LED nightlight that thinks for itself! Your Pico will check the light five times a second. When it's dark, the LED glows a calm blue. When it's dim, it warms up to a cozy soft white. When it's bright daylight, it turns off to save energy. This is your very first Smart Home device!

## 🔌 Wiring

| From | To | Notes |
|------|----|-------|
| Photoresistor Module **A** | Pico **GP26** | Analog signal — GP26 is ADC channel 0 |
| Photoresistor Module **VCC** | Pico **3V3** | 3.3 V power supply |
| Photoresistor Module **GND** | Pico **GND** | Ground |
| RGB LED Module **R** | Pico **GP15** | Red channel — PWM capable |
| RGB LED Module **G** | Pico **GP16** | Green channel — PWM capable |
| RGB LED Module **B** | Pico **GP17** | Blue channel — PWM capable |
| RGB LED Module **GND** | Pico **GND** | Ground (common cathode) |

> **Tip:** The RGB LED module from the Elegoo kit already has current-limiting resistors built in, so you plug it straight into the Pico — no extra resistors needed!

## 💻 The Code

```c
/**
 * Project 1: Smart Nightlight
 * ============================
 * Reads a photoresistor and controls an RGB LED automatically.
 *   Dark room (0-800)    → calm blue night glow
 *   Dim room  (800-2000) → warm white glow (brightness scales with darkness)
 *   Bright    (2000+)    → LED fully off (save energy!)
 *
 * Hardware:
 *   Photoresistor Module: A → GP26, VCC → 3V3, GND → GND
 *   RGB LED Module:       R → GP15, G → GP16, B → GP17, GND → GND
 */

#include <stdio.h>
#include "pico/stdlib.h"
#include "hardware/adc.h"
#include "hardware/pwm.h"

// ── Pin definitions ──────────────────────────────────────────────────────────
#define PHOTO_ADC_PIN   26    // Photoresistor analog output → GP26
#define PHOTO_ADC_CH     0    // ADC channel 0 lives on GP26

#define LED_R_PIN       15    // RGB LED Red channel
#define LED_G_PIN       16    // RGB LED Green channel
#define LED_B_PIN       17    // RGB LED Blue channel

// ── Light level thresholds (ADC range is 0–4095) ─────────────────────────────
#define DARK_THRESHOLD   800  // Below this → very dark → blue night light
#define DIM_THRESHOLD   2000  // Below this → dim room  → warm white glow
                              // Above 2000 → bright daylight → LED off

// ── Moving average: smooth out the last 5 readings to prevent flicker ────────
#define AVG_SAMPLES      5

// ── PWM wrap: gives us 256 brightness steps (0 = off, 255 = full) ────────────
#define PWM_WRAP       255

// ─────────────────────────────────────────────────────────────────────────────
// setup_pwm_pin()
// Switches a GPIO pin into PWM mode and configures it.
// PWM = Pulse Width Modulation. The pin switches on/off super fast.
// The more time it spends ON, the brighter the LED looks to your eye!
// ─────────────────────────────────────────────────────────────────────────────
void setup_pwm_pin(uint pin) {
    gpio_set_function(pin, GPIO_FUNC_PWM);   // Put this pin into PWM mode
    uint slice = pwm_gpio_to_slice_num(pin); // Each pin pair shares a PWM "slice"
    pwm_set_wrap(slice, PWM_WRAP);           // 256 brightness levels (0–255)
    pwm_set_enabled(slice, true);            // Start the PWM running
}

// ─────────────────────────────────────────────────────────────────────────────
// set_rgb()
// Sets the RGB LED to a color. r, g, b are each 0 (off) to 255 (max bright).
// Mix colors like paint: r=255, g=0, b=0 = red. r=255, g=165, b=0 = orange!
// ─────────────────────────────────────────────────────────────────────────────
void set_rgb(uint8_t r, uint8_t g, uint8_t b) {
    pwm_set_gpio_level(LED_R_PIN, r);
    pwm_set_gpio_level(LED_G_PIN, g);
    pwm_set_gpio_level(LED_B_PIN, b);
}

// ─────────────────────────────────────────────────────────────────────────────
// init_hardware()
// Sets up the ADC and all three LED PWM pins.
// ─────────────────────────────────────────────────────────────────────────────
void init_hardware(void) {
    // ADC setup
    adc_init();                      // Start the ADC hardware
    adc_gpio_init(PHOTO_ADC_PIN);    // Tell GP26 to be an analog input
    adc_select_input(PHOTO_ADC_CH);  // Select ADC channel 0

    // LED PWM setup
    setup_pwm_pin(LED_R_PIN);
    setup_pwm_pin(LED_G_PIN);
    setup_pwm_pin(LED_B_PIN);
    set_rgb(0, 0, 0);                // Start with LED off
}

// ─────────────────────────────────────────────────────────────────────────────
// moving_average()
// Keeps the last 5 ADC readings in a circular buffer and returns their average.
// This prevents the LED from flickering when the sensor reads slightly
// different values each time — like averaging five quiz scores instead of
// judging yourself on a single bad day!
// ─────────────────────────────────────────────────────────────────────────────
uint16_t moving_average(uint16_t new_reading) {
    static uint16_t samples[AVG_SAMPLES] = {0}; // Ring buffer of recent readings
    static uint8_t  head    = 0;                 // Where to store the next sample
    static bool     filled  = false;             // Have we filled the buffer yet?

    samples[head] = new_reading;
    head = (head + 1) % AVG_SAMPLES;            // Wrap: 0→1→2→3→4→0→1→...
    if (head == 0) filled = true;               // We've looped around at least once

    uint32_t sum   = 0;
    uint8_t  count = filled ? AVG_SAMPLES : (head == 0 ? AVG_SAMPLES : head);
    for (uint8_t i = 0; i < count; i++) {
        sum += samples[i];
    }
    return (uint16_t)(sum / count);
}

// ─────────────────────────────────────────────────────────────────────────────
// update_led()
// Decides what color the LED should be, then sets it.
//
//  0–800   → DARK:   calm blue glow (gentle nightlight)
//  800–2000 → DIM:   warm white (brighter LED the darker the room)
//  2000+   → BRIGHT: LED off (no light needed — save power!)
// ─────────────────────────────────────────────────────────────────────────────
void update_led(uint16_t light_level) {

    if (light_level <= DARK_THRESHOLD) {
        // Very dark — soothing blue, like moonlight through a curtain
        set_rgb(10, 20, 80);

    } else if (light_level <= DIM_THRESHOLD) {
        // Dim room — warm white, like a bedside lamp on low
        // The darker the room, the brighter we make the LED.
        // We map light_level [800..2000] → LED brightness [200..50] (inverted).
        uint32_t range      = DIM_THRESHOLD - DARK_THRESHOLD;          // 1200
        uint32_t offset     = light_level  - DARK_THRESHOLD;           // 0..1200
        uint8_t  brightness = (uint8_t)(200 - (offset * 150 / range)); // 200..50

        // Warm white = strong red, strong green, weaker blue
        set_rgb(brightness,
                (uint8_t)(brightness * 85 / 100),   // green ≈ 85 % of red
                (uint8_t)(brightness * 45 / 100));  // blue  ≈ 45 % of red

    } else {
        // Bright daylight — no light needed, turn off to save energy
        set_rgb(0, 0, 0);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// main()
// Set up hardware, then loop forever reading the sensor and updating the LED.
// ─────────────────────────────────────────────────────────────────────────────
int main(void) {
    // Start USB serial so we can print messages to your computer
    stdio_init_all();

    // Give USB time to connect before we start printing
    sleep_ms(2000);

    printf("=================================\n");
    printf("  Smart Nightlight -- Project 1  \n");
    printf("=================================\n");
    printf("Cover the sensor with your hand to test dark mode!\n\n");

    // Initialise all hardware
    init_hardware();

    // ── Main loop: runs forever, 5 times per second ───────────────────────────
    while (true) {

        // Step 1: Read raw sensor value (0 = pitch black, 4095 = blazing bright)
        uint16_t raw = adc_read();

        // Step 2: Smooth it with a moving average (no more flickering!)
        uint16_t smoothed = moving_average(raw);

        // Step 3: Update the LED based on the smoothed light level
        update_led(smoothed);

        // Step 4: Print readings to serial so you can see what's happening
        const char *mode_label;
        if      (smoothed <= DARK_THRESHOLD) mode_label = "DARK  --> blue night glow";
        else if (smoothed <= DIM_THRESHOLD)  mode_label = "DIM   --> warm white";
        else                                  mode_label = "LIGHT --> LED off";

        printf("Raw: %4u | Smoothed: %4u | %s\n", raw, smoothed, mode_label);

        // Step 5: Wait 200 ms before next reading (5 times per second)
        sleep_ms(200);
    }

    return 0;
}
```

## 🔍 How the Code Works

1. **ADC setup** — `adc_init()` turns GP26 into a light-reading input. The ADC measures the voltage from the photoresistor and turns it into a number from 0 (pitch dark) to 4095 (blazing bright). That gives you 4096 steps of brightness!

2. **PWM for LED color** — `setup_pwm_pin()` makes each LED pin flicker on and off super fast. The more time it spends ON, the brighter it looks. By mixing red, green, and blue at different amounts, you can make any color — just like mixing paint! `set_rgb(255, 0, 0)` = red, `set_rgb(255, 255, 0)` = yellow.

3. **Moving average** — `moving_average()` keeps the last 5 readings and returns their average. This stops the LED from flickering when the sensor gets slightly different readings. It's like averaging 5 quiz scores instead of judging yourself on one bad day!

4. **Light level mapping** — `update_led()` checks three zones: very dark (blue glow), dim (warm white), bright (off). The dim zone does some math to make the LED brighter the darker the room gets.

5. **Main loop** — `while (true)` runs forever: Read → Smooth → Update LED → Print → Wait 200ms. Your nightlight checks the world five times every second!

## 🎮 Try It!

1. **Cover the sensor** — Put your palm over the photoresistor. Watch the LED switch to blue night mode! Lift your hand and it turns off if your room is bright enough.

2. **Dim the lights** — Turn off a lamp nearby and watch the LED glow warm white. The change is smooth, not sudden — that's the moving average doing its job!

3. **Watch the serial output** — Open a serial monitor at 115200 baud. Watch the numbers change as you cover and uncover the sensor. Can you find the exact boundary between modes?

4. **Change the night color** — Find `set_rgb(10, 20, 80)` in `update_led()`. Try `set_rgb(0, 80, 0)` for green or `set_rgb(60, 0, 80)` for purple! Each number goes from 0 to 255.

## 🏆 Challenge

Your nightlight has three fixed modes right now. Can you add a fourth? Create a "super bright" mode that triggers when the light level goes above 3500 — maybe make the LED glow a faint yellow like sunshine! As a bigger challenge, make the transition between dim and dark completely smooth. Instead of stepping between modes, calculate exact RGB values for every sensor reading so the color fades perfectly from blue to white.

## 📝 Summary

Amazing work! You built a smart nightlight that reads a light sensor five times per second, smooths the readings so it doesn't flicker, and automatically picks the right color for the room. You learned how the Pico's ADC turns real-world light into numbers, and how PWM mixes red, green, and blue to make any color. This is real smart home technology — just like the lights in fancy hotels!
