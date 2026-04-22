# Project 28: Noise Level Meter — How Loud Are YOU?

## 🎯 What You'll Learn
- How a microphone converts sound into electricity
- How to read analog values with ADC
- How to display levels using multiple LEDs (a bar graph!)
- How concert sound monitors and voice meters work

## 🛒 Parts You Need

| Part | Price |
|------|-------|
| Raspberry Pi Pico 2 W | $7.00 |
| Large Microphone Module | $2.00 |
| LEDs x4 (green, green, yellow, red) | $0.40 |
| 220Ω Resistors x4 | $0.40 |
| Breadboard | $2.00 |
| Jumper Wires | $1.00 |
| **Total** | **~$12.80** |

## 🌟 The Story

You know those VU meters you see on music apps — the bars that bounce up and down with the beat? Sound engineers use them at concerts to make sure the music is not too loud for the speakers. Your classroom might have a noise meter on the wall that turns red when it gets too loud!

Today you are building a real noise level meter! Your microphone picks up sound waves and converts them into tiny electrical signals. Your Pico measures those signals and lights up LEDs like a volume bar. Whisper = one LED. Normal talk = two LEDs. Shout = four LEDs! Can you shout loud enough to light them all?

## 🔌 Wiring

| From | To | Notes |
|------|----|-------|
| Microphone Module VCC | Pico 3.3V | Power |
| Microphone Module GND | Pico GND | Ground |
| Microphone Module AO | Pico GP26 (ADC0) | Analog output — must use ADC pin! |
| Green LED 1 long leg | Pico GP2 via 220Ω | Level 1 (quiet) |
| Green LED 2 long leg | Pico GP3 via 220Ω | Level 2 (soft) |
| Yellow LED long leg | Pico GP4 via 220Ω | Level 3 (medium) |
| Red LED long leg | Pico GP5 via 220Ω | Level 4 (loud!) |
| All LED short legs | Pico GND | Ground |

## 💻 The Code

```c
#include "pico/stdlib.h"    // Always include this first!
#include "hardware/adc.h"   // Need this for reading the microphone
#include <stdio.h>          // For printf

// Pin definitions
#define MIC_PIN     26      // Microphone analog output (ADC0)
#define ADC_INPUT    0      // ADC channel for GP26

// LED bar graph pins (from quietest to loudest)
#define LED1_PIN    2       // Green — level 1 (quiet)
#define LED2_PIN    3       // Green — level 2 (soft)
#define LED3_PIN    4       // Yellow — level 3 (medium)
#define LED4_PIN    5       // Red — level 4 (LOUD!)

// Number of samples to take for peak detection
#define SAMPLE_COUNT  50    // Take 50 samples to find the peak

// Sound level thresholds (adjust these for your microphone!)
// Values are 0-4095 (12-bit ADC)
// The mic usually sits around 2048 (halfway) when quiet
#define LEVEL_1  100        // Any noise above background
#define LEVEL_2  300        // Moderate sound
#define LEVEL_3  600        // Loud sound
#define LEVEL_4  1000       // Very loud sound

// Measure the sound level (peak-to-peak method)
// This measures how much the signal swings up and down
uint16_t measure_sound_level() {
    uint16_t peak_high = 0;         // Highest reading seen
    uint16_t peak_low = 4095;       // Lowest reading seen

    // Sample rapidly to catch the peak of the sound wave
    for (int i = 0; i < SAMPLE_COUNT; i++) {
        uint16_t sample = adc_read();           // Read mic value
        if (sample > peak_high) peak_high = sample;  // Track highest
        if (sample < peak_low)  peak_low  = sample;  // Track lowest
    }

    // Peak-to-peak = the range of the signal swing
    // When quiet: signal barely moves, small range
    // When loud:  signal swings a lot, large range
    uint16_t peak_to_peak = peak_high - peak_low;

    return peak_to_peak;                        // Return sound level
}

// Update the LED bar graph based on sound level
void update_leds(uint16_t level) {
    // LED 1: light up for any sound
    gpio_put(LED1_PIN, level >= LEVEL_1 ? 1 : 0);

    // LED 2: light up for moderate sound
    gpio_put(LED2_PIN, level >= LEVEL_2 ? 1 : 0);

    // LED 3: light up for loud sound
    gpio_put(LED3_PIN, level >= LEVEL_3 ? 1 : 0);

    // LED 4: light up for very loud sound
    gpio_put(LED4_PIN, level >= LEVEL_4 ? 1 : 0);
}

// Draw a text bar graph in the serial monitor
void print_bar(uint16_t level) {
    printf("Level %4d |", level);       // Print the number

    // Draw bars with # characters
    int bars = 0;
    if (level >= LEVEL_1) bars = 1;
    if (level >= LEVEL_2) bars = 2;
    if (level >= LEVEL_3) bars = 3;
    if (level >= LEVEL_4) bars = 4;

    for (int i = 0; i < bars; i++) {
        printf("##");                   // Two hashes per bar
    }
    for (int i = bars; i < 4; i++) {
        printf("  ");                   // Spaces for empty bars
    }
    printf("| ");

    // Print label
    if (bars == 0) printf("Silent");
    else if (bars == 1) printf("Whisper");
    else if (bars == 2) printf("Talking");
    else if (bars == 3) printf("Loud!");
    else                printf("*** VERY LOUD! ***");

    printf("\n");
}

int main() {
    stdio_init_all();           // Start USB serial
    sleep_ms(2000);             // Wait for USB

    // Set up ADC
    adc_init();                             // Initialize ADC
    adc_gpio_init(MIC_PIN);                // Set GP26 as analog input
    adc_select_input(ADC_INPUT);           // Select channel 0

    // Set up LED pins
    int led_pins[] = {LED1_PIN, LED2_PIN, LED3_PIN, LED4_PIN};
    for (int i = 0; i < 4; i++) {          // Loop through all 4 LEDs
        gpio_init(led_pins[i]);            // Initialize each pin
        gpio_set_dir(led_pins[i], GPIO_OUT);  // Set as output
        gpio_put(led_pins[i], 0);          // Start with LED off
    }

    printf("=== NOISE LEVEL METER ===\n");
    printf("Make some noise!\n");
    printf("Thresholds: %d / %d / %d / %d\n\n",
           LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4);

    // Quick startup test — light up all LEDs in sequence
    for (int i = 0; i < 4; i++) {
        gpio_put(led_pins[i], 1);
        sleep_ms(100);
    }
    sleep_ms(300);
    for (int i = 3; i >= 0; i--) {
        gpio_put(led_pins[i], 0);
        sleep_ms(100);
    }

    while (true) {                          // Loop forever

        uint16_t sound = measure_sound_level();   // Measure sound

        update_leds(sound);                 // Update LED bar graph

        print_bar(sound);                   // Print to serial monitor

        sleep_ms(50);               // Update about 20 times per second
    }

    return 0;
}
```

## 🔍 How It Works

1. The microphone has a thin membrane that vibrates when sound hits it
2. These vibrations change the electrical signal on the AO pin
3. The Pico samples this signal many times quickly to find the peak swing
4. Louder sounds = bigger swing = higher peak-to-peak value
5. The peak value is compared against thresholds to decide how many LEDs to light

## 🎮 Try It!

- Whisper near the microphone — which LEDs light up?
- Clap your hands next to it — what is the maximum you reach?
- Play music from your phone near it — watch the LEDs dance with the beat!
- Try different sounds: talking, singing, tapping the table

## 🏆 Challenge

Make the LEDs stay lit for a short time after the sound stops (called "peak hold"). Save the highest level seen and slowly decrease it by 1 each loop. This makes the meter look like a real studio VU meter that holds peaks!

## 📝 What You Built

You built a real noise level meter using a microphone and four LEDs as a visual bar graph! You learned about peak-to-peak audio measurement, analog-to-digital conversion, and how sound engineers monitor volume levels at concerts and recording studios.
